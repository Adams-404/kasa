/**
 * The assistant's instructions.
 *
 * Kept apart from the HTTP route so the rules are readable, testable and
 * reviewable as text — the whole point of a grounded assistant is that the
 * grounding rules are not buried in a string inside a handler.
 */

export const MAX_QUESTION = 500;
export const MAX_CONTEXT = 12_000;
export const MAX_ANSWER_TOKENS = 400;

/**
 * The rules from `project.md` §9, written as instructions to the model.
 * Everything the model may talk about is in the context block it is handed; it
 * has no other source, and the prompt tells it to say so.
 */
export const SYSTEM_PROMPT = `You are Kasa's assistant. Kasa shows one place on Earth, the satellite imagery for a year, and a statistical test of the climate record at that point.

You are given a CONTEXT block. It is the only information you may use.

Rules:
1. Answer only from the CONTEXT. If the answer is not there, say "I don't have that for this place" and name what would help (for example: the history panel, a different point, or the 40-year window). Never fill a gap with general knowledge.
2. Never invent a number, date, name, population, event or quotation. Use the numbers exactly as written in the CONTEXT.
3. Cite the source for each factual claim in brackets: [NASA POWER], [Wikipedia], [Wikidata], [NASA GIBS].
4. The statistics are descriptive, never attribution. Say a trend is present or not present in this window; never say what caused it, and never say "climate change is causing".
5. When explaining a p-value or the test, use plain language for a curious teenager: what the test compares, what "not significant" means (the change is within year-to-year variation), and why a short window is weak evidence.
6. Be short. Two or three sentences, or a few short lines, unless the question asks for an explanation. No preamble, no restating the question, no headings.
7. Write numbers in the units the CONTEXT uses. Do not convert.
8. If the CONTEXT says a source is missing, do not guess what it would have said.`;

export type ChatMessage = { role: "system" | "user"; content: string };

export function buildMessages(question: string, context: string): Array<ChatMessage> {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `CONTEXT\n---\n${context.trim()}\n---\n\nQUESTION\n${question.trim()}`,
    },
  ];
}

export type ChatRequest = {
  question: string;
  context: string;
};

export type Validated = { ok: true; value: ChatRequest } | { ok: false; error: string };

/** Shape and size checks, so a bad client cannot spend our tokens. */
export function validateChatRequest(body: unknown): Validated {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Expected a JSON object with question and context." };
  }

  const { question, context } = body as Record<string, unknown>;

  if (typeof question !== "string" || question.trim().length === 0) {
    return { ok: false, error: "Ask a question first." };
  }
  if (question.length > MAX_QUESTION) {
    return { ok: false, error: `Keep the question under ${MAX_QUESTION} characters.` };
  }

  if (typeof context !== "string" || context.trim().length === 0) {
    return { ok: false, error: "Kasa has no context for this point yet." };
  }
  if (context.length > MAX_CONTEXT) {
    return { ok: false, error: "The context for this point is too long." };
  }

  return { ok: true, value: { question: question.trim(), context: context.trim() } };
}
