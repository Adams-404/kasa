import type { LlmConfig } from "./env";
import type { ChatMessage } from "./prompt";

/**
 * One call to an OpenAI-compatible chat-completions endpoint.
 *
 * No SDK: this is the whole integration, which makes the provider choice a
 * base URL rather than a dependency.
 */

export class LlmError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LlmError";
    this.status = status;
  }
}

type CompletionBody = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function chatCompletion(
  config: LlmConfig,
  messages: Array<ChatMessage>,
  maxTokens: number,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.2,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new LlmError(504, "The model did not answer in time.");
  }

  if (!response.ok) {
    // Do not forward the provider's body: it can contain request details.
    throw new LlmError(
      response.status === 429 ? 429 : 502,
      response.status === 429
        ? "The model is rate limited right now. Try again in a moment."
        : `The model refused the request (${response.status}).`,
    );
  }

  let body: CompletionBody;
  try {
    body = (await response.json()) as CompletionBody;
  } catch {
    throw new LlmError(502, "The model sent something we could not read.");
  }

  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new LlmError(502, "The model returned an empty answer.");
  return text;
}
