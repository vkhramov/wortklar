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

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

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
  const prompt = `Create ${count} original ${lang} sentences for a learner to translate into German.
Level ${body.level}: ${LEVEL_GUIDE[body.level]}
Rules:
- Everyday, natural, non-offensive situations.
- Do not include the German translation or German words.
- Vary topics. No names of real private people.
- Return JSON only: {"items":[{"source":"...","topic":"..."}]}`;
  const data = await gemini(key, prompt);
  const items = Array.isArray(data.items) ? data.items : [];
  return {
    items: items
      .map((item) => {
        const row = item as { source?: unknown; topic?: unknown };
        const source = String(row.source ?? "").trim();
        if (!source) return null;
        return { source, topic: String(row.topic ?? "").trim() };
      })
      .filter(Boolean)
      .slice(0, count),
  };
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
  const data = await gemini(key, prompt);
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

async function gemini(key: string, prompt: string): Promise<Record<string, unknown>> {
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
            temperature: 0.7,
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
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return parseModelJson(text);
  }
  throw new Error(lastError);
}

function parseModelJson(text: string): Record<string, unknown> {
  const trimmed = text.trim().replace(/^```json\s*|```$/g, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Model did not return JSON");
  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
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
