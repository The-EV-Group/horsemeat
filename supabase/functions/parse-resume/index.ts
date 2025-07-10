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
      tool_calls: completion.tool_calls ? completion.tool_calls.length : 0,
    }));

    const call = completion.tool_calls?.[0];
    
    // Handle case where there's no function call
    if (!call) {
      console.error("OpenAI did not return a function call in the response", completion);
      // Try to return something useful instead of erroring out
      try {
        // Default empty structure that matches our schema
        const defaultResponse = {
          contractor: {
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            city: "",
            state: "",
            candidate_summary: "Could not extract information from resume.",
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
        
        // Return this default structure instead of an error
        return json({ parsed: defaultResponse });
      } catch (err) {
        return json({ error: "LLM returned no function call and fallback failed" }, 502);
      }
    }

    try {
      const parsed = JSON.parse(call.function.arguments || "{}");
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
        [key: string]: unknown;
      }
      
      const pageText = content.items
        .filter((it: TextItem) => it.str && it.str.trim().length > 0)
        .map((it: TextItem) => it.str)
        .join(" ");
      
      text += pageText + "\n";
    }

    // Clean up the text to remove excessive whitespace
    text = text.replace(/\s{3,}/g, " ").trim();
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
