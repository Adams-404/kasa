/**
 * The browser side of the assistant. It talks to our own `/api/chat`, never to a
 * provider, and it never sees a key.
 */

export type ChatConfig = { configured: boolean; model: string | null };

export class ChatError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ChatError";
    this.status = status;
  }
}

export async function chatConfig(): Promise<ChatConfig> {
  try {
    const response = await fetch("/api/chat", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { configured: false, model: null };
    const body = (await response.json()) as Partial<ChatConfig>;
    return { configured: body.configured === true, model: body.model ?? null };
  } catch {
    // No server route in this build, or it is unreachable: treat as switched off.
    return { configured: false, model: null };
  }
}

export async function askAssistant(question: string, context: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ question, context }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new ChatError(0, "Could not reach the assistant. Check the connection and try again.");
  }

  let body: { answer?: string; error?: string } = {};
  try {
    body = (await response.json()) as { answer?: string; error?: string };
  } catch {
    // Fall through to the status-based message below.
  }

  if (!response.ok) {
    throw new ChatError(
      response.status,
      body.error ??
        (response.status === 503
          ? "The assistant is not configured on this deployment."
          : "The assistant could not answer. Try again."),
    );
  }

  if (!body.answer) {
    throw new ChatError(response.status, "The assistant returned an empty answer.");
  }
  return body.answer;
}
