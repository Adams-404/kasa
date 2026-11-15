import { currentEnv, llmConfig } from "./env";
import { chatCompletion, LlmError } from "./llm";
import {
  MAX_ANSWER_TOKENS,
  buildMessages,
  validateChatRequest,
} from "./prompt";

/**
 * `POST /api/chat` — the only place the model key exists.
 *
 * The body is `{ question, context }`, where `context` is the exact text the
 * browser built from data it already fetched. The route does not fetch anything
 * itself and does not trust the client for anything but text: it checks the
 * shape and the size, then hands the pair to the model with the grounding rules.
 *
 * `GET /api/chat` reports whether the assistant is configured, so the UI can say
 * "not set up here" instead of failing at the first question.
 */

type HttpRequest = {
  method?: string;
  setEncoding(encoding: string): void;
  on(event: "data", listener: (chunk: string) => void): void;
  on(event: "end", listener: () => void): void;
  on(event: "error", listener: (error: Error) => void): void;
};

type HttpResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
};

const MAX_BODY_BYTES = 64 * 1024;

export async function handleChat(
  req: HttpRequest,
  res: HttpResponse,
  env: Record<string, string | undefined> = currentEnv(),
): Promise<void> {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");

  const config = llmConfig(env);

  if (req.method === "GET") {
    send(res, 200, { configured: config !== null, model: config?.model ?? null });
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("allow", "GET, POST");
    send(res, 405, { error: "Use POST to ask a question." });
    return;
  }

  if (!config) {
    send(res, 503, {
      error:
        "The assistant is not configured on this deployment. Set LLM_API_KEY and LLM_MODEL on the server.",
      configured: false,
    });
    return;
  }

  let body: unknown;
  try {
    body = await readJson(req);
  } catch (error) {
    send(res, 400, {
      error: error instanceof Error ? error.message : "Could not read the request body.",
    });
    return;
  }

  const validated = validateChatRequest(body);
  if (!validated.ok) {
    send(res, 400, { error: validated.error });
    return;
  }

  try {
    const answer = await chatCompletion(
      config,
      buildMessages(validated.value.question, validated.value.context),
      MAX_ANSWER_TOKENS,
    );
    send(res, 200, { answer, model: config.model });
  } catch (error) {
    const status = error instanceof LlmError ? error.status : 502;
    send(res, status, {
      error:
        error instanceof LlmError
          ? error.message
          : "The assistant could not answer. Try again.",
    });
  }
}

function readJson(req: HttpRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    let settled = false;

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      if (settled) return;
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        settled = true;
        reject(new Error("That request is too large."));
      }
    });
    req.on("end", () => {
      if (settled) return;
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Expected a JSON body."));
      }
    });
    req.on("error", () => {
      if (settled) return;
      settled = true;
      reject(new Error("The connection dropped before the question arrived."));
    });
  });
}

function send(res: HttpResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}
