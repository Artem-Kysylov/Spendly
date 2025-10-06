'use client'

import { useState, useCallback } from 'react'
import { UserAuth } from '@/context/AuthContext'

export function useAISuggestions() {
  const { session } = UserAuth()
  const [text, setText] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const fetchSuggestion = useCallback(async (prompt: string) => {
    if (!session?.user?.id) return
    setText('')
    setLoading(true)
    setError(null)
    setIsRateLimited(false)

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          isPro: false,
          enableLimits: true,
          message: prompt
        }),
        signal: controller.signal
      })

      if (!res.ok) {
        if (res.status === 429) {
          setIsRateLimited(true)
          setError('Rate limit reached. Please try again later.')
          return
        }
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const json = await res.json()
          setError(json.error || 'Failed to fetch suggestion')
          return
        }
        setError('Failed to fetch suggestion')
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let acc = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setText(acc)
      }

      const providerEmptyMsgPattern = /LLM provider returned empty text candidates\./i
      if (providerEmptyMsgPattern.test(acc)) {
        const blockedReasonMatch = acc.match(/Blocked:\s*([^.\n]+)/i)
        const reason = blockedReasonMatch?.[1]?.trim()
        const isRu = (typeof navigator !== 'undefined' ? (navigator.language || '').toLowerCase().startsWith('ru') : false)

        const friendly = reason
          ? (isRu
              ? `Запрос был заблокирован провайдером (${reason}). Попробуйте переформулировать и избегать чувствительного контента.`
              : `Your request was blocked by the provider (${reason}). Tip: Try rephrasing and avoid sensitive content.`)
          : (isRu
              ? 'Модель не смогла сгенерировать ответ. Попробуйте переформулировать запрос короче и конкретнее.'
              : 'The assistant could not generate a response this time. Try rephrasing your request or reducing its complexity.')

        setText(friendly)
      }
    } catch (e) {
      if ((e as any)?.name === 'AbortError') {
        setError(null)
      } else {
        setError('Network error')
      }
    } finally {
      setLoading(false)
      setAbortController(null)
    }
  }, [session?.user?.id])

  const abort = useCallback(() => {
    abortController?.abort()
    setLoading(false)
  }, [abortController])

  return { text, loading, error, isRateLimited, fetchSuggestion, abort }
}