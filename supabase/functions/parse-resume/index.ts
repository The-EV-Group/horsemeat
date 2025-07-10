// supabase/functions/parse-resume/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
// Using default import instead of named import because legacy build exports differently
import pdfjs from "npm:pdfjs-dist@3.11.174/legacy/build/pdf.js";
import OpenAI          from "npm:openai";

/* ── env ───────────────────────────────────────────────────── */
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY   = Deno.env.get("OPENAI_API_KEY")!;
const MODEL_NAME       = Deno.env.get("MODEL_NAME") ?? "gpt-4o-mini-2024-07-18";
const TOKEN_CHAR_LIMIT = 12_000 * 4;

/* ── clients ──────────────────────────────────────────────── */
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY });

/* ── CORS headers ─────────────────────────────────────────── */
const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ── HTTP handler ─────────────────────────────────────────── */
Deno.serve(async (req) => {
  /* pre-flight */
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json();
    let plainText: string | null = null;

    /* DOCX route */
    if (body.text) {
      plainText = body.text as string;
    }
    /* PDF route */
    else if (body.bucket && body.path) {
      const { data, error } = await supabase.storage
        .from(body.bucket)
        .download(body.path);

      if (error || !data) return json({ error: "Failed to download file" }, 500);
      plainText = await extractPdfText(data);
    } else {
      return json({ error: "Must provide `text` or `bucket`+`path`" }, 400);
    }

    const prompt = plainText.replace(/\s{3,}/g, " ").slice(0, TOKEN_CHAR_LIMIT);

    console.log("Sending request to OpenAI with prompt length:", prompt.length);
    
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content: `
You are an expert résumé parser. Your task is to extract structured information from the résumé text and return it via the function call.

Extract the following information accurately matching these database fields:
- full_name: The full name of the candidate
- email: Email address if available
- phone: Phone number if available (format: 4039231218)
- city: City of residence
- state: Two-letter state code (like CA, NY)
- summary: A crisp 1-2 sentence professional summary of their expertise and experience
- notes: Career goals or interests
- keywords: Extract relevant skills, industries, certifications, companies they worked for, and job titles held

If any field is not found in the résumé, use an empty string or empty array as appropriate.
NEVER make up information. Only extract what's actually present in the text.
          `.trim(),
        },
        { role: "user", content: prompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "parseResume",
          description: "Extract structured data from a resume",
          parameters: schema,
        }
      }],
      tool_choice: { type: "function", function: { name: "parseResume" } },
    });
    
    console.log("OpenAI response received:", JSON.stringify({
      id: completion.id,
      model: completion.model,
      choices: completion.choices?.length,
      tool_calls: completion.choices?.[0]?.message?.tool_calls?.length || 0,
    }));

    // Fix: Access tool_calls from the correct path
    const call = completion.choices?.[0]?.message?.tool_calls?.[0];
    
    // Handle case where there's no function call
    if (!call) {
      console.error("OpenAI did not return a function call in the response", {
        completion_id: completion.id,
        choices: completion.choices,
        message: completion.choices?.[0]?.message
      });
      
      // Return default empty structure that matches our schema
      const defaultResponse = {
        contractor: {
          full_name: "",
          email: "",
          phone: "",
          city: "",
          state: "",
          summary: "",
          notes: ""
        },
        keywords: {
          skills: [],
          industries: [],
          certifications: [],
          companies: [],
          "job titles": []
        }
      };
      
      return json({ parsed: defaultResponse });
    }

    try {
      const parsed = JSON.parse(call.function.arguments || "{}");
      console.log("Successfully parsed function arguments:", parsed);
      return json({ parsed });
    } catch (parseError) {
      console.error("Error parsing function arguments:", parseError, "\nArguments:", call.function.arguments);
      return json({ error: `Failed to parse function arguments: ${parseError.message}` }, 502);
    }
  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: "Unexpected server error" }, 500);
  }
});

/* ── helpers ──────────────────────────────────────────────── */
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function extractPdfText(file: Blob): Promise<string> {
  try {
    console.log("Starting PDF extraction");
    
    const data = new Uint8Array(await file.arrayBuffer());
    // Using pdfjs.getDocument instead of direct getDocument call
    const doc = await pdfjs.getDocument({ data }).promise;
    
    console.log(`PDF has ${doc.numPages} pages`);
    let text = "";

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      
      // Define an interface for the text content items
      interface TextItem {
        str: string;
        transform: number[];
        [key: string]: unknown;
      }
      
      // Filter out empty items
      const items = content.items.filter((it: TextItem) => 
        it.str && it.str.trim().length > 0
      ) as TextItem[];
      
      if (items.length === 0) continue;
      
      // Group items by y-coordinate (rounded to nearest int for line grouping)
      const lineMap = new Map<number, TextItem[]>();
      
      for (const item of items) {
        const y = Math.round(item.transform[5]); // y coordinate
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y)!.push(item);
      }
      
      // Sort lines by y-coordinate (top to bottom, higher y values first in PDF coordinates)
      const sortedYCoords = Array.from(lineMap.keys()).sort((a, b) => b - a);
      
      let pageText = "";
      let prevY: number | null = null;
      
      for (const y of sortedYCoords) {
        const lineItems = lineMap.get(y)!;
        
        // Sort items within the line by x-coordinate (left to right)
        lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
        
        // Check if we need to insert a paragraph break
        if (prevY !== null && prevY - y > 15) {
          pageText += "\n\n"; // Insert blank line for paragraph break
        } else if (prevY !== null) {
          pageText += "\n"; // Regular line break
        }
        
        // Join items in the line with spaces
        const lineText = lineItems.map(item => item.str).join(" ");
        pageText += lineText;
        
        prevY = y;
      }

      text += pageText + "\n";
    }

    // Normalize the extracted text
    text = normalize(text);
    
    console.log(`Extracted ${text.length} characters from PDF`);
    
    // Log a preview of the extracted text for debugging
    if (text.length > 0) {
      console.log(`Text preview: ${text.substring(0, 200)}...`);
    } else {
      console.error("No text extracted from PDF!");
    }

    return text;
  } catch (err) {
    console.error("PDF extraction failed:", err);
    throw err;
  }
}

function normalize(text: string): string {
  return text
    // Collapse multiple spaces into single spaces
    .replace(/[ \t]+/g, " ")
    // Remove "Page X" lines (handles various formats)
    .replace(/^Page \d+.*$/gm, "")
    // Clean up excessive newlines while preserving intentional paragraph breaks
    .replace(/\n{4,}/g, "\n\n\n")
    // Trim whitespace from each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove empty lines at the beginning and end
    .trim();
}

/* ── JSON schema ──────────────────────────────────────────── */
const schema = {
  type: "object",
  required: ["contractor", "keywords"],
  properties: {
    contractor: {
      type: "object",
      properties: {
        full_name:         { type: "string" },
        email:             { type: "string" },
        phone:             { type: "string" },
        city:              { type: "string" },
        state:             { type: "string" },
        summary:           { type: "string" },
        notes:             { type: "string" },
      },
      required: ["full_name", "summary"],
    },
    keywords: {
      type: "object",
      properties: {
        skills:         { $ref: "#/$defs/kwArr" },
        industries:     { $ref: "#/$defs/kwArr" },
        certifications: { $ref: "#/$defs/kwArr" },
        companies:      { $ref: "#/$defs/kwArr" },
        "job titles":   { $ref: "#/$defs/kwArr" },
      },
    },
  },
  $defs: {
    kwArr: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id:   { type: ["string", "null"] },
          name: { type: "string" },
        },
      },
      maxItems: 30,
    },
  },
} as const;
