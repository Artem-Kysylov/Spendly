// Реальный стрим OpenAI Chat Completions (SSE)
import { logLLMDebug } from "./debug";

type StreamParams = {
  model: string;
  prompt: string;
  system?: string;
  requestId?: string;
};

export type OpenAIStreamResult =
  | { ok: true; stream: ReadableStream<string> }
  | { ok: false; status: number; message: string };

interface OpenAIStreamOptions {
  model: string;
  prompt: string;
  system?: string;
  requestId?: string;
  timeoutMs?: number;
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_DEFAULT_TIMEOUT_MS = 15_000;

export async function createOpenAIChatStream(
  opts: OpenAIStreamOptions,
): Promise<OpenAIStreamResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 0, message: "OPENAI_API_KEY not configured" };
  }

  const debug =
    process.env.LLM_DEBUG === "1" || process.env.LLM_DEBUG === "true";
  const timeoutMs = opts.timeoutMs ?? OPENAI_DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        stream: true,
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: opts.prompt },
        ],
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const err = e instanceof Error ? e : new Error("Unknown OpenAI error");
    const isAbort = err.name === "AbortError" || /abort/i.test(err.message);
    return {
      ok: false,
      status: isAbort ? 504 : 0,
      message: isAbort
        ? `OpenAI timeout after ${timeoutMs}ms`
        : err.message,
    };
  }

  if (!res.ok || !res.body) {
    clearTimeout(timer);
    const errText = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      message: `OpenAI HTTP ${res.status} ${res.statusText || ""}: ${errText.slice(0, 240)}`.trim(),
    };
  }

  const body = res.body;

  const stream = new ReadableStream<string>({
    async start(controller) {
      const reader = body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buf = "";
      let sseLines = 0;
      let totalTextLen = 0;

      const finish = () => {
        clearTimeout(timer);
        if (debug) {
          logLLMDebug("[LLM_DEBUG openai post]", {
            requestId: opts.requestId,
            model: opts.model,
            sseLines,
            totalTextLen,
          });
        }
        try {
          controller.close();
        } catch {
          /* no-op */
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            finish();
            return;
          }
          buf += decoder.decode(value, { stream: true });

          const lines = buf.split("\n");
          buf = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            sseLines++;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              finish();
              return;
            }
            try {
              const json = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = json?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                controller.enqueue(delta);
                totalTextLen += delta.length;
                const PREMIUM_BASE_DELAY = 30;
                const PREMIUM_JITTER = 20;
                const jitter = Math.floor(Math.random() * PREMIUM_JITTER);
                await new Promise((r) =>
                  setTimeout(r, PREMIUM_BASE_DELAY + jitter),
                );
              }
            } catch {
              /* skip malformed SSE line */
            }
          }
        }
      } catch (e) {
        clearTimeout(timer);
        controller.error(
          e instanceof Error ? e : new Error("Unknown OpenAI stream error"),
        );
      }
    },
    cancel() {
      clearTimeout(timer);
    },
  });

  return { ok: true, stream };
}

export function streamOpenAIText({
  model,
  prompt,
  system,
  requestId,
}: StreamParams): ReadableStream<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const debug =
    process.env.LLM_DEBUG === "1" || process.env.LLM_DEBUG === "true";

  return new ReadableStream<string>({
    async start(controller) {
      if (debug) {
        try {
          logLLMDebug("[LLM_DEBUG openai pre]", {
            requestId,
            model,
            promptLengthChars: prompt.length,
            hasSystem: !!system,
          });
        } catch {
          /* no-op */
        }
      }

      const res = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!res.body || !res.ok) {
        const errText = await res.text().catch(() => "");
        controller.enqueue(
          `Error from OpenAI (${res.status} ${res.statusText}): ${errText}`,
        );
        controller.close();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buf = "";
      let sseLines = 0;
      let totalTextLen = 0;

      const pump = async () => {
        try {
          const { done, value } = await reader.read();
          if (done) {
            if (debug) {
              try {
                logLLMDebug("[LLM_DEBUG openai post]", {
                  requestId,
                  model,
                  sseLines,
                  totalTextLen,
                });
              } catch {
                /* no-op */
              }
            }
            controller.close();
            return;
          }
          buf += decoder.decode(value, { stream: true });

          const lines = buf.split("\n");
          buf = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            sseLines++;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              if (debug) {
                try {
                  logLLMDebug("[LLM_DEBUG openai post]", {
                    requestId,
                    model,
                    sseLines,
                    totalTextLen,
                  });
                } catch {
                  /* no-op */
                }
              }
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                controller.enqueue(delta);
                totalTextLen += delta.length;
                const PREMIUM_BASE_DELAY = 30; // ms
                const PREMIUM_JITTER = 20; // ms
                const jitter = Math.floor(Math.random() * PREMIUM_JITTER);
                await new Promise((r) => setTimeout(r, PREMIUM_BASE_DELAY + jitter));
              }
            } catch {
              // skip
            }
          }

          pump();
        } catch (e) {
          controller.error(
            e instanceof Error ? e : new Error("Unknown OpenAI stream error"),
          );
        }
      };

      pump();
    },
  });
}
