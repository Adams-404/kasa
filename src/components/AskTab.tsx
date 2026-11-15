import { useEffect, useMemo, useRef, useState } from "react";
import type { Place } from "../lib/format";
import type { TrendAnalysis } from "../lib/stats/analyse";
import type { VariableId } from "../lib/variables";
import { buildChatContext } from "../lib/chatContext";
import { loadHistory } from "../lib/api/wikipedia";
import { askAssistant, chatConfig, ChatError, type ChatConfig } from "../lib/api/chat";

type AskTabProps = {
  place: Place;
  imageryDate: string;
  imageryLabel: string;
  windowYears: number;
  analyses: Partial<Record<VariableId, TrendAnalysis>>;
};

const STARTERS = [
  "What changed here in the last 10 years?",
  "Is this trend real or just noise?",
  "Tell me the history of this place.",
];

type Phase = "idle" | "gathering" | "asking" | "answered" | "error";

/**
 * The Ask tab.
 *
 * The bundle is built in the browser from data already on the page, so the
 * panel can show exactly what the model was given. The model is behind our own
 * route; nothing here knows a provider or a key.
 */
export default function AskTab({
  place,
  imageryDate,
  imageryLabel,
  windowYears,
  analyses,
}: AskTabProps) {
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{
    question: string;
    context: string;
    sources: Array<string>;
  } | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    chatConfig().then((value) => {
      if (!cancelled) setConfig(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const busy = phase === "gathering" || phase === "asking";

  const paragraphs = useMemo(
    () => answer.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean),
    [answer],
  );

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setQuestion(trimmed);
    setError("");
    setAnswer("");
    setSent(null);
    setPhase("gathering");

    // The encyclopedia entry is optional context; a miss is honest, not fatal.
    const wiki = await loadHistory(place.lat, place.lon)
      .then((result) => result.entry)
      .catch(() => null);

    const context = buildChatContext({
      place,
      imageryDate,
      imageryLabel,
      windowYears,
      analyses,
      wiki,
    });

    if (context.thin) {
      setPhase("error");
      setError(
        "There is not enough data for this point to answer safely: NASA returned no complete years, and there is no encyclopedia entry within 10 km. Try another point, or open the history panel.",
      );
      return;
    }

    setSent({ question: trimmed, context: context.text, sources: context.sources });
    setPhase("asking");

    try {
      setAnswer(await askAssistant(trimmed, context.text));
      setQuestion("");
      setPhase("answered");
    } catch (caught) {
      setPhase("error");
      setError(
        caught instanceof ChatError
          ? caught.message
          : "The assistant could not answer. Try again.",
      );
    }
  };

  const reset = () => {
    setPhase("idle");
    setAnswer("");
    setError("");
    setSent(null);
    setQuestion("");
    inputRef.current?.focus();
  };

  if (config === null) {
    return (
      <div className="ask ask--state" role="status">
        <span className="analysis__pulse" aria-hidden="true" />
        <p>Checking the assistant…</p>
      </div>
    );
  }

  if (!config.configured) {
    return (
      <div className="ask ask--state">
        <p className="ask__title">The assistant is not switched on here.</p>
        <p className="ask__note">
          This deployment has no model key, so the Ask tab stays closed. Everything else on
          this page — the imagery, the chart, the test and the history — works without it.
        </p>
        <p className="ask__note ask__note--dim">
          To enable it, set <code>LLM_BASE_URL</code>, <code>LLM_API_KEY</code> and{" "}
          <code>LLM_MODEL</code> on the server. See <code>.env.example</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="ask">
      <div className="ask__thread">
        {phase === "idle" && (
          <>
            <p className="ask__title">Ask about this point</p>
            <p className="ask__note">
              Answers use only what Kasa already fetched for this place: the NASA POWER
              series and test, the imagery date, and the encyclopedia entry. Nothing else.
            </p>
            <ul className="ask__starters">
              {STARTERS.map((starter) => (
                <li key={starter}>
                  <button
                    type="button"
                    className="ask__starter"
                    onClick={() => void ask(starter)}
                  >
                    {starter}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {sent && (
          <div className="ask__qa">
            <p className="ask__question">{sent.question}</p>

            {busy && (
              <p className="ask__waiting" role="status">
                <span className="analysis__pulse" aria-hidden="true" />
                {phase === "gathering"
                  ? "Gathering what Kasa knows about this point…"
                  : "Reading the data for an answer…"}
              </p>
            )}

            {phase === "answered" &&
              paragraphs.map((paragraph, index) => (
                <p key={index} className="ask__answer">
                  {paragraph}
                </p>
              ))}

            {phase === "error" && (
              <div className="ask__error" role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void ask(sent.question)}
                >
                  Try again
                </button>
              </div>
            )}

            <details className="ask__sources">
              <summary>
                What the assistant was given
                <span className="ask__sources-list"> · {sent.sources.join(" · ")}</span>
              </summary>
              <pre className="ask__context">{sent.context}</pre>
            </details>

            {phase === "answered" && (
              <button type="button" className="text-link ask__again" onClick={reset}>
                Ask another question
              </button>
            )}
          </div>
        )}

        {phase === "idle" && <p className="ask__model">Model: {config.model}</p>}
      </div>

      <form
        className="ask__form"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
      >
        <label className="sr-only" htmlFor="ask-question">
          Your question about this place
        </label>
        <textarea
          ref={inputRef}
          id="ask-question"
          className="ask__input"
          rows={2}
          maxLength={500}
          placeholder="Ask about this place, or pick a question above"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask(question);
            }
          }}
        />
        <button type="submit" className="ask__send" disabled={busy || question.trim() === ""}>
          Ask
        </button>
      </form>
    </div>
  );
}
