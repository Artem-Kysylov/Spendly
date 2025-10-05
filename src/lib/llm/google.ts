// Реальный стрим Gemini (Generative Language API SSE)

type StreamParams = {
  model: string
  prompt: string
  system?: string
  requestId?: string
}

export function streamGeminiText({ model, prompt, system, requestId }: StreamParams): ReadableStream<string> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('Missing GOOGLE_API_KEY')
  }

  // v1 generateContent вместо v1beta streamGenerateContent
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`

  return new ReadableStream<string>({
    async start(controller) {
      // Нормализуем входы в строку, чтобы parts[].text всегда был строкой
      const toText = (v: unknown) => {
        if (typeof v === 'string') return v
        if (v == null) return ''
        try {
          return JSON.stringify(v)
        } catch {
          return String(v)
        }
      }

      const debug = (process.env.LLM_DEBUG === '1' || process.env.LLM_DEBUG === 'true')

      const userParts: any[] = []
      if (system) {
        // Передаем системную директиву как текст без слова "Instruction:", чтобы модель не уходила в how-to
        userParts.push({ text: toText(system) })
      }
      userParts.push({ text: toText(prompt) })

      // Диагностика: длины входных parts
      if (debug) {
        try {
          const lengths = userParts.map(p => (typeof p?.text === 'string' ? p.text.length : 0))
          console.debug('[LLM_DEBUG gemini pre]', JSON.stringify({ requestId, model, userPartsLen: userParts.length, userPartsLengths: lengths }))
        } catch {
          // no-op
        }
      }

      // Гарантия: минимум один непустой текстовый part
      const nonEmptyParts = userParts.filter(p => typeof p?.text === 'string' && p.text.trim().length > 0)
      if (nonEmptyParts.length === 0) {
        // Добавляем безопасный минимальный текст, чтобы запрос не был пустым
        userParts.push({ text: 'Respond in plain text. No user content provided.' })
        if (debug) {
          console.debug('[Gemini] userParts were empty; injected minimal fallback part')
        }
      }

      const payload: any = {
        contents: [
          { role: 'user', parts: userParts }
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          candidateCount: 1,
          // Убираем responseMimeType, оставляем лимит длины ответа
          maxOutputTokens: 1024
        }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        if (debug) {
          console.debug('[Gemini] HTTP error:', res.status, res.statusText, 'body:', errText)
        }
        controller.enqueue(`Error from Gemini (${res.status} ${res.statusText}). Please try again later.`)
        controller.close()
        return
      }

      // Парсим обычный JSON-ответ и отдаём текст как единый поток
      const json = await res.json().catch(() => null)
      if (!json) {
        if (debug) {
          console.debug('[Gemini] Failed to parse response JSON')
        }
        controller.enqueue('Error: failed to parse Gemini response JSON')
        controller.close()
        return
      }

      const candidates = (json as any)?.candidates ?? []
      if (debug) {
        try {
          const firstParts = candidates?.[0]?.content?.parts ?? []
          const firstPartsLengths = firstParts.map((p: any) => (typeof p?.text === 'string' ? p.text.length : 0))
          const blockReason = (json as any)?.promptFeedback?.blockReason
          const safetyRatings = (json as any)?.promptFeedback?.safetyRatings ?? []
          const finishReason = candidates?.[0]?.finishReason
          console.debug('[LLM_DEBUG gemini post]', JSON.stringify({
            requestId,
            model,
            candidatesLen: Array.isArray(candidates) ? candidates.length : 0,
            firstCandidatePartsLen: firstParts.length,
            firstCandidatePartsLengths: firstPartsLengths,
            blockReason,
            safetyRatings,
            finishReason
          }))
        } catch {
          // no-op
        }
      }

      let emitted = false
      for (const c of candidates) {
        const parts = c?.content?.parts ?? []
        for (const p of parts) {
          const t = p?.text
          if (typeof t === 'string' && t.length > 0) {
            controller.enqueue(t)
            emitted = true
          }
        }
      }

      if (!emitted) {
        const blockReason = (json as any)?.promptFeedback?.blockReason
        const candidatesCount = Array.isArray(candidates) ? candidates.length : 0
        controller.enqueue(
          `LLM provider returned empty text candidates.${blockReason ? ` Blocked: ${blockReason}.` : ''} Candidates: ${candidatesCount}.`
        )
      }
      controller.close()
    }
  })
}