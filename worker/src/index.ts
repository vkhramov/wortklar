export interface Env {}

const ALLOWED_ORIGINS = new Set([
  "https://vkhramov.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const LEVELS = new Set([
  "A1.1",
  "A1.2",
  "A1.3",
  "A2.1",
  "A2.2",
  "A2.3",
  "B1.1",
  "B1.2",
  "B1.3",
]);

const LEVEL_GUIDE: Record<string, string> = {
  "A1.1": "4–6 words. Present tense, sein/haben, concrete everyday nouns. One simple clause.",
  "A1.2": "6–9 words. Modal verbs, accusative, separable verbs, simple time/place.",
  "A1.3": "7–11 words. Perfekt or dative, one adverbial, still concrete and classroom-like.",
  "A2.1": "8–12 words. Perfekt or Präteritum, two connected actions, familiar topics.",
  "A2.2": "9–14 words. weil/dass/wenn, reflexive verbs, opinions about daily life.",
  "A2.3": "10–16 words. Comparisons, relative clauses, reasons and sequences.",
  "B1.1": "11–17 words. Konjunktiv II or a relative clause, connectors, slightly abstract.",
  "B1.2": "12–20 words. Passive or argumentation, work/study/society vocabulary.",
  "B1.3": "14–22 words. More than one subordinate clause, nuance, still natural speech.",
};

type GenerateBody = {
  action: "generate";
  level: string;
  sourceLang: "ru" | "en";
  count?: number;
};

type GradeBody = {
  action: "grade";
  level: string;
  sourceLang: "ru" | "en";
  source: string;
  answer: string;
};

type Body = GenerateBody | GradeBody;

const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }), origin);
    if (request.method !== "POST" || new URL(request.url).pathname !== "/v1/translate") {
      return cors(json({ error: "Not found" }, 404), origin);
    }
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return cors(json({ error: "Origin not allowed" }, 403), origin);
    }

    const geminiKey = request.headers.get("X-Gemini-Key")?.trim() ?? "";
    if (!geminiKey) return cors(json({ error: "Missing Gemini API key" }, 401), origin);

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return cors(json({ error: "Invalid JSON" }, 400), origin);
    }
    if (!LEVELS.has(body.level) || (body.sourceLang !== "ru" && body.sourceLang !== "en")) {
      return cors(json({ error: "Invalid level or language" }, 400), origin);
    }

    try {
      const result =
        body.action === "generate"
          ? await generate(geminiKey, body)
          : body.action === "grade"
            ? await grade(geminiKey, body)
            : null;
      if (!result) return cors(json({ error: "Unknown action" }, 400), origin);
      return cors(json(result, 200), origin);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gemini request failed";
      const status = message.includes("429") ? 429 : 502;
      return cors(json({ error: message.slice(0, 400) }, status), origin);
    }
  },
};

async function generate(key: string, body: GenerateBody): Promise<unknown> {
  const count = Math.min(8, Math.max(1, body.count ?? 5));
  const lang = body.sourceLang === "ru" ? "Russian" : "English";
  const prompt = `Choose ${count} short ${lang} sentences for a learner to translate into German.
Level ${body.level}: ${LEVEL_GUIDE[body.level]}
Source preference:
- Prefer one real sentence from a published book, story, essay, or other edited text.
- Prefer public-domain or classic works when they fit the level. Russian examples: Chekhov, Tolstoy, Pushkin, other published prose. English examples: public-domain fiction and essays.
- Quote only a single sentence, verbatim. Do not stitch fragments or simplify a passage and still cite the original.
- If you are not sure the sentence really appears in that work, do not invent a citation. Write a natural original sentence and set citation to null.
- Everyday, non-offensive meaning. No German words and no German translation.
- No names of real private people.
Return one JSON object and nothing else. The root must be an object whose "items" array contains exactly ${count} sentence objects:
{"items":[{"source":"...","topic":"...","citation":{"title":"...","author":"...","year":"..."}|null}]}
Do not return a single sentence as the root object.`;
  const text = await geminiText(key, prompt, 0.4);
  const items = promptsFromText(text).slice(0, count);
  if (!items.length) {
    const data = parseModelJson(text);
    throw new Error(`Model JSON had no sentences. Keys: ${Object.keys(data).join(", ") || "none"}`);
  }
  return { items };
}

async function grade(key: string, body: GradeBody): Promise<unknown> {
  const source = body.source.trim().slice(0, 500);
  const answer = body.answer.trim().slice(0, 800);
  if (!source || !answer) throw new Error("Missing source or answer");
  const feedbackLang = body.sourceLang === "ru" ? "Russian" : "English";
  const prompt = `You are a careful German teacher. The learner translated this ${body.sourceLang === "ru" ? "Russian" : "English"} sentence into German.
Level target ${body.level}: ${LEVEL_GUIDE[body.level]}
Source: ${JSON.stringify(source)}
Learner German: ${JSON.stringify(answer)}
Accept any natural German that preserves the meaning. Do not require one exact wording.
Verdict:
- correct: meaning and grammar are good for the level
- acceptable: understandable with a small unnatural or minor issue
- needs_fix: meaning or grammar needs a real correction
Write summary and error explanations in ${feedbackLang}. corrected and alternative must be German.
Return JSON only:
{"verdict":"correct|acceptable|needs_fix","corrected":"...","summary":"...","errors":[{"fragment":"...","issue":"...","fix":"..."}],"alternative":"..."}`;
  const data = parseModelJson(await geminiText(key, prompt, 0.4));
  const verdict = String(data.verdict ?? "");
  if (!["correct", "acceptable", "needs_fix"].includes(verdict)) {
    throw new Error("Model returned an invalid verdict");
  }
  const errors = Array.isArray(data.errors) ? data.errors : [];
  return {
    verdict,
    corrected: String(data.corrected ?? "").trim(),
    summary: String(data.summary ?? "").trim(),
    alternative: String(data.alternative ?? "").trim(),
    errors: errors
      .map((item) => {
        const row = item as { fragment?: unknown; issue?: unknown; fix?: unknown };
        return {
          fragment: String(row.fragment ?? "").trim(),
          issue: String(row.issue ?? "").trim(),
          fix: String(row.fix ?? "").trim(),
        };
      })
      .filter((row) => row.issue || row.fix)
      .slice(0, 6),
  };
}

async function geminiText(key: string, prompt: string, temperature = 0.4): Promise<string> {
  let lastError = "Gemini request failed";
  for (const model of MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (res.status === 404) {
      lastError = `${model} not available`;
      continue;
    }
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Gemini ${res.status}: ${detail.slice(0, 240)}`);
    }
    const payload = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
    };
    const parts = payload.candidates?.[0]?.content?.parts ?? [];
    const visible = parts.filter((part) => part.text && !part.thought);
    return (visible.length ? visible : parts).map((part) => part.text ?? "").join("\n");
  }
  throw new Error(lastError);
}

function promptsFromText(text: string): Array<{
  source: string;
  topic: string;
  citation: { title: string; author: string; year: string } | null;
}> {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/g, "");
  const rows: Array<Record<string, unknown> | string> = [];
  for (const raw of extractJsonObjects(trimmed)) {
    let value: unknown;
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      continue;
    }
    if (Array.isArray(value)) {
      rows.push(...value.filter(isSentenceValue));
      continue;
    }
    if (value && typeof value === "object") rows.push(...collectItems(value as Record<string, unknown>));
  }
  const seen = new Set<string>();
  return rows.map(normalizePrompt).filter((item) => {
    if (!item.source || seen.has(item.source)) return false;
    seen.add(item.source);
    return true;
  });
}

const SENTENCE_KEYS = ["source", "sentence", "text", "prompt", "line", "quote"];

function collectItems(data: Record<string, unknown>): Array<Record<string, unknown> | string> {
  for (const key of ["items", "sentences", "prompts", "examples"]) {
    if (Array.isArray(data[key]) && data[key].length) {
      return data[key] as Array<Record<string, unknown> | string>;
    }
  }
  if (Array.isArray(data)) return data as Array<Record<string, unknown> | string>;
  if (isSentenceRow(data)) return [data];
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length && value.every(isSentenceValue)) return value;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const nested = collectItems(value as Record<string, unknown>);
    if (nested.length) return nested;
  }
  return [];
}

function isSentenceValue(value: unknown): value is Record<string, unknown> | string {
  if (typeof value === "string") return value.trim().length > 0;
  return !!value && typeof value === "object" && !Array.isArray(value) && isSentenceRow(value as Record<string, unknown>);
}

function isSentenceRow(data: Record<string, unknown>): boolean {
  return SENTENCE_KEYS.some((key) => typeof data[key] === "string" && data[key].trim().length > 0);
}

function normalizePrompt(row: Record<string, unknown> | string): {
  source: string;
  topic: string;
  citation: { title: string; author: string; year: string } | null;
} {
  if (typeof row === "string") {
    return { source: row.trim(), topic: "", citation: null };
  }
  const source = SENTENCE_KEYS
    .map((key) => String(row[key] ?? "").trim())
    .find(Boolean) ?? "";
  const citation = row.citation;
  const cite = citation && typeof citation === "object"
    ? citation as { title?: unknown; author?: unknown; year?: unknown }
    : null;
  const title = String(cite?.title ?? row.title ?? "").trim();
  const author = String(cite?.author ?? row.author ?? "").trim();
  return {
    source,
    topic: String(row.topic ?? "").trim(),
    citation: title || author
      ? { title, author, year: String(cite?.year ?? row.year ?? "").trim() }
      : null,
  };
}

function parseModelJson(text: string): Record<string, unknown> {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/g, "");
  const parsed = extractJsonObjects(trimmed).flatMap((raw) => {
    try {
      const value = JSON.parse(raw) as unknown;
      return value && typeof value === "object" && !Array.isArray(value)
        ? [value as Record<string, unknown>]
        : [];
    } catch {
      return [];
    }
  });
  if (!parsed.length) throw new Error("Model did not return JSON");
  return (
    parsed.find((obj) => typeof obj.verdict === "string") ??
    parsed.find((obj) => collectItems(obj).length > 0) ??
    parsed[parsed.length - 1]
  );
}

function extractJsonObjects(text: string): string[] {
  const objects: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    const slice = text.slice(offset);
    const start = slice.indexOf("{");
    if (start < 0) break;
    const json = extractFirstJsonObject(slice.slice(start));
    objects.push(json);
    offset += start + json.length;
  }
  return objects;
}

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("Model did not return JSON");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("Model returned incomplete JSON");
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function cors(response: Response, origin: string): Response {
  const headers = new Headers(response.headers);
  if (ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-Gemini-Key");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return new Response(response.body, { status: response.status, headers });
}
