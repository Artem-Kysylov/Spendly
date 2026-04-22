// Реальный стрим Gemini (Generative Language API SSE)
import { logLLMDebug } from "./debug";

type StreamParams = {
  model: string;
  prompt: string;
  system?: string;
  requestId?: string;
};

export type GeminiFetchResult =
  | { ok: true; text: string }
  | { ok: false; status: number; message: string };

interface GeminiFetchOptions {
  model: string;
  prompt: string;
  system?: string;
  requestId?: string;
  timeoutMs?: number;
}

const GEMINI_FAST_TIMEOUT_MS = 6000;
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1/models";

export async function fetchGeminiText(
  opts: GeminiFetchOptions,
): Promise<GeminiFetchResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 0, message: "GOOGLE_API_KEY not configured" };
  }

  const timeoutMs = opts.timeoutMs ?? GEMINI_FAST_TIMEOUT_MS;
  const url = `${GEMINI_API_BASE}/${encodeURIComponent(opts.model)}:generateContent?key=${apiKey}`;

  const parts: Array<{ text: string }> = [];
  if (opts.system && opts.system.trim().length > 0) {
    parts.push({ text: opts.system });
  }
  const userText =
    opts.prompt && opts.prompt.trim().length > 0
      ? opts.prompt
      : "Respond in plain text.";
  parts.push({ text: userText });

  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      candidateCount: 1,
      maxOutputTokens: 2048,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: `Gemini HTTP ${res.status} ${res.statusText || ""}`.trim(),
      };
    }

    const data = (await res.json().catch(() => null)) as
      | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
      | null;

    const candidates = data?.candidates ?? [];
    let text = "";
    if (Array.isArray(candidates) && candidates.length > 0) {
      const outParts = candidates[0]?.content?.parts ?? [];
      text = outParts
        .map((p) => (typeof p?.text === "string" ? p.text : ""))
        .join("");
    }

    if (!text || text.trim().length === 0) {
      return { ok: false, status: 502, message: "Empty response from Gemini" };
    }

    logLLMDebug("[LLM_DEBUG gemini fast ok]", {
      requestId: opts.requestId,
      model: opts.model,
      chars: text.length,
    });
    return { ok: true, text };
  } catch (e) {
    const err = e instanceof Error ? e : new Error("Unknown Gemini error");
    const isAbort =
      err.name === "AbortError" || /abort/i.test(err.message);
    return {
      ok: false,
      status: isAbort ? 504 : 0,
      message: isAbort
        ? `Gemini timeout after ${timeoutMs}ms`
        : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

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
      const PREMIUM_BASE_DELAY = 30; // ms
      const PREMIUM_JITTER = 20; // ms
      for (const chunk of chunks) {
        controller.enqueue(chunk);
        const jitter = Math.floor(Math.random() * PREMIUM_JITTER);
        await new Promise((r) => setTimeout(r, PREMIUM_BASE_DELAY + jitter));
      }
      controller.close();
      return;
    },
  });
}
