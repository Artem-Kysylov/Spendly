// Реальный стрим OpenAI Chat Completions (SSE)
import { logLLMDebug } from "./debug";

type StreamParams = {
  model: string;
  prompt: string;
  system?: string;
  requestId?: string;
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

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
