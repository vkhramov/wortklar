import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PronounceButton } from "../components/PronounceButton";
import { uiLangFromMode } from "../lib/leakage";
import {
  TRANSLATE_LEVELS,
  generatePrompts,
  getGeminiKey,
  gradeTranslation,
  type TranslateGrade,
  type TranslateLevelId,
  type TranslatePrompt,
  type TranslateSourceLang,
  type TranslateStyle,
} from "../lib/translate";
import { useAppStore } from "../store/useAppStore";

export function TranslatePage() {
  const mode = useAppStore((s) => s.progress.settings.mode);
  const ui = uiLangFromMode(mode);
  const [level, setLevel] = useState<TranslateLevelId>("A1.2");
  const [sourceLang, setSourceLang] = useState<TranslateSourceLang>(
    mode.startsWith("ru") || mode.endsWith("ru") ? "ru" : "en",
  );
  const [style, setStyle] = useState<TranslateStyle>("textbook");
  const [queue, setQueue] = useState<TranslatePrompt[]>([]);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<TranslateGrade | null>(null);
  const [busy, setBusy] = useState<"generate" | "grade" | null>(null);
  const [error, setError] = useState("");
  const hasKey = getGeminiKey().length > 0;
  const current = queue[0] ?? null;
  const bands = useMemo(
    () => ["A1", "A2", "B1"].map((band) => TRANSLATE_LEVELS.filter((item) => item.band === band)),
    [],
  );

  async function loadPrompts(replace = true) {
    setBusy("generate");
    setError("");
    try {
      const data = await generatePrompts(level, sourceLang, style, 5);
      if (!data.items?.length) throw new Error(ui === "ru" ? "Пустой ответ модели" : "Empty model response");
      setQueue(replace ? data.items : [...queue, ...data.items]);
      setAnswer("");
      setGrade(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  async function check() {
    if (!current || !answer.trim()) return;
    setBusy("grade");
    setError("");
    try {
      setGrade(
        await gradeTranslation({
          level,
          sourceLang,
          style,
          source: current.source,
          answer: answer.trim(),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  function next() {
    setQueue((items) => items.slice(1));
    setAnswer("");
    setGrade(null);
    setError("");
  }

  return (
    <div className="translate-screen">
      <section className="panel">
        <div className="panel-title">
          <h2>{ui === "ru" ? "Перевод" : "Translate"}</h2>
          <span className="muted">Gemini</span>
        </div>
        {!hasKey && (
          <p className="muted">
            {ui === "ru" ? "Сначала добавьте ключ Gemini в " : "Add a Gemini API key in "}
            <Link to="/settings">{ui === "ru" ? "Настройках" : "Settings"}</Link>.
          </p>
        )}
        <div className="btn-row" role="group" aria-label={ui === "ru" ? "Тип фразы" : "Sentence style"}>
          {([
            ["textbook", ui === "ru" ? "Учебник" : "Textbook"],
            ["everyday", ui === "ru" ? "Живая речь" : "Everyday speech"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn ${style === id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setStyle(id);
                setQueue([]);
                setGrade(null);
                setAnswer("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="muted">
          {style === "textbook"
            ? ui === "ru"
              ? "Ясная фраза, как в курсе немецкого. Gemini пишет её сам и не цитирует изданный учебник."
              : "A clear coursebook-style sentence. Gemini writes it and does not quote a published textbook."
            : ui === "ru"
              ? "Реплика, как в разговоре или сообщении. Тоже написана Gemini, не цитата."
              : "A line someone might say or text. Also written by Gemini, not a quotation."}
        </p>
        <div className="btn-row" role="group" aria-label={ui === "ru" ? "Язык задания" : "Prompt language"}>
          {(["ru", "en"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              className={`btn ${sourceLang === lang ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setSourceLang(lang);
                setQueue([]);
                setGrade(null);
              }}
            >
              {lang === "ru" ? "Русский → Deutsch" : "English → Deutsch"}
            </button>
          ))}
        </div>
        {bands.map((items) => (
          <div key={items[0].band} className="btn-row translate-levels">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`btn ${level === item.id ? "btn-primary" : "btn-ghost"}`}
                title={item.hint}
                onClick={() => {
                  setLevel(item.id);
                  setQueue([]);
                  setGrade(null);
                }}
              >
                {item.id}
              </button>
            ))}
          </div>
        ))}
        <p className="muted">{TRANSLATE_LEVELS.find((item) => item.id === level)?.hint}</p>
      </section>

      <section className="prompt-card">
        {current ? (
          <>
            <div className="example-label">{current.topic || (ui === "ru" ? "Предложение" : "Sentence")}</div>
            <div className="prompt-text">{current.source}</div>
            {current.citation && (
              <p className="muted">
                {[current.citation.author, current.citation.title, current.citation.year].filter(Boolean).join(" · ")}
              </p>
            )}
            <label className="field">
              <span>{ui === "ru" ? "Ваш перевод на немецкий" : "Your German translation"}</span>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={3}
                disabled={Boolean(grade) || busy === "grade"}
              />
            </label>
            {grade && (
              <div className={`feedback ${grade.verdict === "needs_fix" ? "incorrect" : "correct"}`}>
                <div className="feedback-title">
                  {grade.verdict === "correct"
                    ? ui === "ru" ? "Верно" : "Correct"
                    : grade.verdict === "acceptable"
                      ? ui === "ru" ? "Допустимо" : "Acceptable"
                      : ui === "ru" ? "Нужно исправить" : "Needs a fix"}
                </div>
                <p>{grade.summary}</p>
                {grade.corrected && (
                  <div className="example-de-row">
                    <div className="example-de">{grade.corrected}</div>
                    <PronounceButton text={grade.corrected} label={ui === "ru" ? "Слушать" : "Listen"} />
                  </div>
                )}
                {grade.errors.length > 0 && (
                  <ul className="hint-list">
                    {grade.errors.map((item, i) => (
                      <li key={`${item.fragment}-${i}`}>
                        {item.fragment ? <strong>{item.fragment}: </strong> : null}
                        {item.issue}
                        {item.fix ? ` → ${item.fix}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                {grade.alternative && (
                  <p className="muted">
                    {ui === "ru" ? "Ещё вариант: " : "Another option: "}
                    {grade.alternative}
                  </p>
                )}
              </div>
            )}
            <div className="btn-row">
              {!grade ? (
                <button type="button" className="btn btn-primary" disabled={busy !== null || !answer.trim()} onClick={() => void check()}>
                  {busy === "grade" ? "…" : ui === "ru" ? "Проверить" : "Check"}
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={next}>
                  {ui === "ru" ? "Дальше" : "Next"}
                </button>
              )}
              <button type="button" className="btn btn-ghost" disabled={busy !== null} onClick={() => void loadPrompts(true)}>
                {ui === "ru" ? "Новая пачка" : "New batch"}
              </button>
            </div>
          </>
        ) : (
          <div className="btn-row">
            <button type="button" className="btn btn-primary" disabled={!hasKey || busy !== null} onClick={() => void loadPrompts(true)}>
              {busy === "generate" ? "…" : ui === "ru" ? "Получить предложения" : "Get sentences"}
            </button>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <p className="muted">
          {ui === "ru"
            ? "Бесплатный Gemini может использовать задания и ответы для улучшения моделей. Не вводите личные данные."
            : "Free Gemini may use prompts and answers to improve its models. Do not enter personal data."}
        </p>
      </section>
    </div>
  );
}
