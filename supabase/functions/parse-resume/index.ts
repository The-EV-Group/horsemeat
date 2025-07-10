import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import * as pdfjsLib from "npm:pdfjs-dist@3.11.174/legacy/build/pdf.js";
import OpenAI from "npm:openai";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY   = Deno.env.get("OPENAI_API_KEY")!;
const MODEL_NAME       = Deno.env.get("MODEL_NAME") ?? "gpt-4o-mini-2024-07-18";
const TOKEN_CHAR_LIMIT = 12_000 * 4;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json();
    let plainText: string | null = null;

    if (body.text) {
      // DOCX → already parsed client-side
      plainText = body.text;
    } else if (body.bucket && body.path) {
      // PDF flow
      const { data: fileData, error } = await supabase
        .storage.from(body.bucket)
        .download(body.path);

      if (error || !fileData) {
        return json({ error: "Failed to download file" }, 500);
      }

      plainText = await extractPdfText(fileData);
    } else {
      return json({ error: "Must provide either `text` or `bucket` + `path`" }, 400);
    }

    const prompt = plainText.slice(0, TOKEN_CHAR_LIMIT);

    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content: `
You are a résumé parser.  Return JSON **only** via the function call.
• candidate_summary → write a crisp 1–2-sentence professional overview.
• notes → write 1–2-sentence goals / interests you infer from the résumé.
If you cannot infer, output an empty string.
        `
        },
        { role: "user", content: prompt }
      ],
      tools: [{
        type: "function",
        name: "extract_contract_data",
        parameters: schema
      }],
      tool_choice: "auto"
    });

    const argStr = completion.tool_calls?.[0]?.function?.arguments ?? "{}";
    const parsed = JSON.parse(argStr);

    return json({ parsed });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({ error: "Unexpected server error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function extractPdfText(file: Blob): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;

  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str).join(" ");
    text += strings + "\n";
  }

  return text;
}

const schema = {
  type: "object",
  properties: {
    contractor: {
      type: "object",
      properties: {
        full_name:         { type: "string" },
        email:             { type: "string" },
        phone:             { type: "string" },
        city:              { type: "string" },
        state:             { type: "string" },
        candidate_summary: { type: "string" },
        notes:             { type: "string" }
      }
    },
    keywords: {
      type: "object",
      properties: {
        skills:         { $ref: "#/$defs/kwArr" },
        industries:     { $ref: "#/$defs/kwArr" },
        certifications: { $ref: "#/$defs/kwArr" },
        companies:      { $ref: "#/$defs/kwArr" },
        "job titles":   { $ref: "#/$defs/kwArr" }
      }
    }
  },
  $defs: {
    kwArr: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id:   { type: ["string", "null"] },
          name: { type: "string" }
        }
      },
      maxItems: 30
    }
  }
} as const;
