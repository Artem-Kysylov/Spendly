// Реальный стрим Gemini (Generative Language API SSE)

type StreamParams = {
  model: string
  prompt: string
  system?: string
}

export function streamGeminiText({ model, prompt, system }: StreamParams): ReadableStream<string> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('Missing GOOGLE_API_KEY')
  }

  // v1 generateContent вместо v1beta streamGenerateContent
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`

  return new ReadableStream<string>({
    async start(controller) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...(system ? [{ role: 'user', parts: [{ text: system }] }] : []),
            { role: 'user', parts: [{ text: prompt }] }
          ],
          generationConfig: { temperature: 0.7 }
        })
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        controller.enqueue(`Error from Gemini (${res.status} ${res.statusText}): ${errText}`)
        controller.close()
        return
      }

      // Парсим обычный JSON-ответ и отдаём текст как единый поток
      const json = await res.json().catch(() => null)
      if (!json) {
        controller.enqueue('Error: failed to parse Gemini response JSON')
        controller.close()
        return
      }

      const parts = (json as any)?.candidates?.[0]?.content?.parts ?? []
      let emitted = false
      for (const p of parts) {
        const t = (p as any)?.text
        if (typeof t === 'string' && t.length > 0) {
          controller.enqueue(t)
          emitted = true
        }
      }
      if (!emitted) {
        const promptFeedback = (json as any)?.promptFeedback?.blockReason
        controller.enqueue(`No text candidates from Gemini.${promptFeedback ? ` Blocked: ${promptFeedback}` : ''}`)
      }
      controller.close()
    }
  })
}