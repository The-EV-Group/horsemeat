// supabase/functions/parse-resume/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import pdfjs from "npm:pdfjs-dist@3.11.174/legacy/build/pdf.js";
import OpenAI from "npm:openai";

// Environment configuration
// @ts-expect-error: Deno is provided by the Edge Function runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-expect-error: Deno is provided by the Edge Function runtime
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-expect-error: Deno is provided by the Edge Function runtime
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
// @ts-expect-error: Deno is provided by the Edge Function runtime
const MODEL_NAME = Deno.env.get("MODEL_NAME") || "gpt-4o-mini-2024-07-18";
const CHAR_LIMIT = 9000; // 9,000 characters (not tokens) to leave room for system prompt
const MAX_RETRIES = 2; // Maximum number of retry attempts for OpenAI calls
const TIMEOUT_MS = 30000; // 30 seconds timeout for OpenAI calls (increased from 5s)

// Initialize clients
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Response helper
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// Text normalization helper
function normalize(text: string): string {
  return text
    .replace(/^Page \d+( of \d+)?$/gm, "")
    .replace(/^\d+\/\d+\/\d{2,4}$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[□■○●☐☑☒]/g, "")
    .replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2")
    .replace(/^[\s•\-*⁃⦁⦾⦿⧆⧇⏺]+/gm, "- ")
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

// System prompt for OpenAI
const SYSTEM_PROMPT = `You are a professional resume parsing assistant that extracts key information from resumes.

Extract information consistently regardless of document format (PDF or Word).
Focus on finding accurate information rather than guessing.
If information is not clearly present, leave the field empty instead of guessing.
Be consistent with how you extract and format information.

Extract the following information accurately matching these database fields:
- full_name: The full name of the candidate
- email: Email address if available
- phone: Phone number if available (format: 4039231218)
- city: City of residence
- state: Two-letter state code (like CA, NY)
- summary: A crisp 3-5 bullet point professional summary of their expertise and experience
- notes: Career goals or interests, 3-5 bullet points

For keywords, extract these categories:
- skills: Technical skills, software, programming languages, specific job-related abilities
- industries: Sectors the candidate has worked in
- certifications: Professional certifications and qualifications
- companies: Organizations where the candidate has worked
- job titles: Previous positions held

Focus on concrete skills, technologies, and industry terms.
Avoid extracting generic terms as keywords (like "management" or "communication").

If any field is not found in the résumé, use an empty string or empty array as appropriate.
NEVER make up information. Only extract what's actually present in the text.`.trim();

// Default response structure
const DEFAULT_RESPONSE = {
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

// Main HTTP handler
// @ts-expect-error: Deno is provided by the Edge Function runtime
Deno.serve(async (req) => {
  // Handle pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json();
    let plainText: string;

    // Process DOCX or PDF input
    if (body.text) {
      plainText = normalize(body.text);
    } else if (body.bucket && body.path) {
      const { data, error } = await supabase.storage
        .from(body.bucket)
        .download(body.path);

      if (error || !data) return json({ error: "Failed to download file" }, 500);
      plainText = await extractPdfText(data);
    } else {
      return json({ error: "Must provide `text` or `bucket`+`path`" }, 400);
    }

    // Process text with OpenAI
    const prompt = plainText.replace(/\s{3,}/g, " ");
    
    // Ensure we don't cut off in the middle of a sentence - find a good break point
    let truncatedPrompt = prompt;
    if (prompt.length > CHAR_LIMIT) {
      const breakPoint = prompt.lastIndexOf(".", CHAR_LIMIT);
      truncatedPrompt = prompt.substring(0, breakPoint > 0 ? breakPoint + 1 : CHAR_LIMIT);
      truncatedPrompt += "\n\n[TRUNCATED TO FIT CONTEXT LIMIT]";
      console.log(`Truncated prompt from ${prompt.length} to ${truncatedPrompt.length} chars at sentence boundary`);
    }
    
    console.log("Processing resume with prompt length:", truncatedPrompt.length);
    
    // Implement retry logic with timeout
    let completion;
    let attempt = 0;
    
    while (attempt <= MAX_RETRIES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        
        completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Extract structured information from this resume:\n\n${truncatedPrompt}` }
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
      temperature: 0.1,
      top_p: 0.1, // Further improves determinism for more consistent results
    }, { signal: controller.signal });
        
        clearTimeout(timeoutId);
        break; // Success, exit retry loop
      } catch (error) {
        attempt++;
        console.warn(`OpenAI API call failed (attempt ${attempt}/${MAX_RETRIES + 1}):`, error.message);
        
        if (attempt > MAX_RETRIES) {
          throw new Error(`Failed to get OpenAI completion after ${MAX_RETRIES + 1} attempts: ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    const call = completion.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!call) {
      console.error("No function call in response", { completion });
      return json({ parsed: DEFAULT_RESPONSE });
    }

    try {
      const parsed = JSON.parse(call.function.arguments || "{}");
      
      // Log detailed keyword statistics
      const keywordStats: Record<string, number> = {};
      const keywords = parsed.keywords || {} as KeywordsMap;
      
      let totalKeywords = 0;
      Object.entries(keywords).forEach(([category, items]) => {
        const count = Array.isArray(items) ? items.length : 0;
        keywordStats[category] = count;
        totalKeywords += count;
      });
      
      console.log(`Parsed ${totalKeywords} total keywords across all categories`);
      console.table(keywordStats); // Shows a nice tabular view in logs
      
      // Log sample keywords from each non-empty category for quality verification
      Object.entries(keywords).forEach(([category, items]) => {
        if (Array.isArray(items) && items.length > 0) {
          const sample = items.slice(0, 3).map(item => item.name).join(", ");
          console.log(`${category} samples: ${sample}${items.length > 3 ? "..." : ""}`);
        }
      });
      
      return json({ parsed });
    } catch (error) {
      console.error("Error parsing response:", error);
      return json({ parsed: DEFAULT_RESPONSE });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

// Interface for PDF text items
interface TextItem {
  str: string;
  transform: number[];
  [key: string]: unknown;
}

// Interface for keyword items in the response
interface KeywordItem {
  id: string | null;
  name: string;
}

type KeywordCategory = 'skills' | 'industries' | 'certifications' | 'companies' | 'job titles';
type KeywordsMap = Record<KeywordCategory, KeywordItem[]>;

// Export ParsedResume type that mirrors the contractorSchema.ts structure
export interface ParsedResume {
  contractor: {
    full_name: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    summary: string;
    notes: string;
  };
  keywords: {
    skills: KeywordItem[];
    industries: KeywordItem[];
    certifications: KeywordItem[];
    companies: KeywordItem[];
    'job titles': KeywordItem[];
  };
}

/**
 * Extracts text from a PDF file with proper formatting
 */
async function extractPdfText(file: Blob): Promise<string> {
  try {
    console.log("Starting PDF extraction");
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;
    
    console.log(`PDF has ${doc.numPages} pages`);
    const pageTexts: string[] = [];
    let prevY: number | null = null;

    // Process each page
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const lineGroups = new Map<number, TextItem[]>();
      
      // Group text items by their y-coordinate (line)
      content.items.forEach((item: TextItem) => {
        if (!item.str?.trim()) return;
        const y = Math.round(item.transform[5]);
        lineGroups.set(y, [...(lineGroups.get(y) || []), item]);
      });
      
      // Process lines in top-to-bottom order
      const pageLines: string[] = [];
      const sortedYCoords = Array.from(lineGroups.keys()).sort((a, b) => b - a);
      
      for (const y of sortedYCoords) {
        // Add paragraph breaks for significant vertical space
        if (prevY !== null) {
          pageLines.push(Math.abs(prevY - y) > 15 ? "\n\n" : "\n");
        }
        
        // Sort items in line by x-coordinate and join
        const line = lineGroups.get(y)!.sort((a, b) => a.transform[4] - b.transform[4]);
        pageLines.push(line.map(item => item.str).join(" "));
        prevY = y;
      }
      
      pageTexts.push(pageLines.join(""));
    }

    const normalizedText = normalize(pageTexts.join("\n"));
    console.log(`Extracted ${normalizedText.length} characters from PDF`);
    
    if (normalizedText.length > 0) {
      console.log(`Text preview: ${normalizedText.substring(0, 200)}...`);
    } else {
      console.warn("No text was extracted from the PDF");
    }
    
    return normalizedText;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
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
