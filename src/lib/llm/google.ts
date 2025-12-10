// Реальный стрим Gemini (Generative Language API SSE)
import { logLLMDebug } from "./debug";

type StreamParams = {
  model: string;
  prompt: string;
  system?: string;
  requestId?: string;
};

export function streamGeminiText({
  model,
  prompt,
  system,
  requestId,
}: StreamParams): ReadableStream<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY");
  }

  // v1 generateContent вместо v1beta streamGenerateContent
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

  return new ReadableStream<string>({
    async start(controller) {
      // Нормализуем входы в строку, чтобы parts[].text всегда был строкой
      const toText = (v: unknown) => {
        if (typeof v === "string") return v;
        if (v == null) return "";
        try {
          return JSON.stringify(v);
        } catch {
          return String(v);
        }
      };

      const debug =
        process.env.LLM_DEBUG === "1" || process.env.LLM_DEBUG === "true";

      const userParts: any[] = [];
      if (system) {
        // Передаем системную директиву как текст без слова "Instruction:", чтобы модель не уходила в how-to
        userParts.push({ text: toText(system) });
      }
      userParts.push({ text: toText(prompt) });

      // Диагностика: длины входных parts
      if (debug) {
        try {
          const lengths = userParts.map((p) =>
            typeof p?.text === "string" ? p.text.length : 0,
          );
          logLLMDebug("[LLM_DEBUG gemini pre]", {
            requestId,
            model,
            userPartsLen: userParts.length,
            userPartsLengths: lengths,
          });
        } catch {
          // no-op
        }
      }

      // Гарантия: минимум один непустой текстовый part
      const nonEmptyParts = userParts.filter(
        (p) => typeof p?.text === "string" && p.text.trim().length > 0,
      );
      if (nonEmptyParts.length === 0) {
        // Добавляем безопасный минимальный текст, чтобы запрос не был пустым
        userParts.push({
          text: "Respond in plain text. No user content provided.",
        });
        if (debug) {
          console.debug(
            "[Gemini] userParts were empty; injected minimal fallback part",
          );
        }
      }

      const payload: any = {
        contents: [{ role: "user", parts: userParts }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          candidateCount: 1,
          maxOutputTokens: 2048,
        },
      };

      // Добавлен: ретраи при 429/503
      const maxAttempts = Number(process.env.GEMINI_MAX_ATTEMPTS ?? "3");
      let res: Response | null = null;

      const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS ?? "10000");
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), timeoutMs);
        try {
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: ac.signal,
          });
        } catch {
          res = null;
        } finally {
          clearTimeout(t);
        }

        if (res && res.ok) break;

        const shouldRetry = !res || res.status === 429 || res.status === 503;
        if (!shouldRetry || attempt === maxAttempts) break;

        const retryAfter = res?.headers?.get("retry-after") || "";
        const baseDelay =
          retryAfter && /^\d+(\.\d+)?$/.test(retryAfter)
            ? Math.ceil(Number(retryAfter) * 1000)
            : 400 * attempt;
        const jitter = Math.floor(Math.random() * 300);
        await new Promise((r) => setTimeout(r, baseDelay + jitter));
      }

      if (!res || !res.ok) {
        const status = res?.status ?? 503;
        const statusText = res ? res.statusText : "Timeout";
        throw new Error(`GeminiHttp:${status}:${statusText}`);
      }

      const data = await res.json().catch(() => null);
      let text = "";
      try {
        const candidates = (data as any)?.candidates || [];
        if (Array.isArray(candidates) && candidates.length > 0) {
          const parts = candidates[0]?.content?.parts || [];
          text = parts
            .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
            .join("");
        }
      } catch {
        /* no-op */
      }

      if (!text || text.trim().length === 0) {
        controller.enqueue("LLM provider returned empty text candidates.");
        controller.close();
        return;
      }

      const CHUNK_SIZE = 48;
      const chunks = text.match(new RegExp(`.{1,${CHUNK_SIZE}}`, "g")) || [text];
      for (const chunk of chunks) {
        controller.enqueue(chunk);
        const jitter = Math.floor(Math.random() * 40);
        await new Promise((r) => setTimeout(r, 80 + jitter));
      }
      controller.close();
      return;
    },
  });
}
