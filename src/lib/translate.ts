export const TRANSLATE_LEVELS = [
  { id: "A1.1", band: "A1", hint: "4–6 words · present" },
  { id: "A1.2", band: "A1", hint: "modals · accusative" },
  { id: "A1.3", band: "A1", hint: "Perfekt · dative" },
  { id: "A2.1", band: "A2", hint: "two actions" },
  { id: "A2.2", band: "A2", hint: "weil · dass · wenn" },
  { id: "A2.3", band: "A2", hint: "comparisons" },
  { id: "B1.1", band: "B1", hint: "Konjunktiv II" },
  { id: "B1.2", band: "B1", hint: "passive · argument" },
  { id: "B1.3", band: "B1", hint: "several clauses" },
] as const;

export type TranslateLevelId = (typeof TRANSLATE_LEVELS)[number]["id"];
export type TranslateSourceLang = "ru" | "en";

export type TranslatePrompt = {
  source: string;
  topic: string;
};

export type TranslateGrade = {
  verdict: "correct" | "acceptable" | "needs_fix";
  corrected: string;
  summary: string;
  alternative: string;
  errors: Array<{ fragment: string; issue: string; fix: string }>;
};

const KEY = "wortklar-gemini-key";
export const TRANSLATE_WORKER_URL = "https://wortklar-translate.sti-h-v-a.workers.dev";

export function getGeminiKey(): string {
  return localStorage.getItem(KEY)?.trim() ?? "";
}

export function setGeminiKey(key: string): void {
  const value = key.trim();
  if (!value) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, value);
}

async function post<T>(body: unknown): Promise<T> {
  const key = getGeminiKey();
  if (!key) throw new Error("Add a Gemini API key in Settings");
  const res = await fetch(`${TRANSLATE_WORKER_URL}/v1/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gemini-Key": key,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Translate request failed (${res.status})`);
  return data;
}

export function generatePrompts(
  level: TranslateLevelId,
  sourceLang: TranslateSourceLang,
  count = 5,
): Promise<{ items: TranslatePrompt[] }> {
  return post({ action: "generate", level, sourceLang, count });
}

export function gradeTranslation(input: {
  level: TranslateLevelId;
  sourceLang: TranslateSourceLang;
  source: string;
  answer: string;
}): Promise<TranslateGrade> {
  return post({ action: "grade", ...input });
}
