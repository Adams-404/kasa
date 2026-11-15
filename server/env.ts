/**
 * Provider-agnostic configuration for the assistant.
 *
 * The route speaks the OpenAI chat-completions shape, which almost every
 * provider now serves (OpenAI, Groq, Together, OpenRouter, a local Ollama). That
 * keeps the deployment story to three environment variables and no SDK.
 *
 * These values are read on the server only. Nothing here is ever sent to the
 * browser, and the client never sees the key.
 */
declare const process: { env: Record<string, string | undefined> };

export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export const DEFAULT_BASE_URL = "https://api.openai.com/v1";

/** The real process environment. Here so the handler can default to it. */
export function currentEnv(): Record<string, string | undefined> {
  return process.env;
}

/**
 * `null` means the assistant is switched off on this deployment. The UI says so
 * plainly instead of offering a button that cannot work.
 */
export function llmConfig(env: Record<string, string | undefined> = process.env): LlmConfig | null {
  const apiKey = env.LLM_API_KEY?.trim();
  const model = env.LLM_MODEL?.trim();
  if (!apiKey || !model) return null;

  return {
    baseUrl: (env.LLM_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    apiKey,
    model,
  };
}
