// Хук: useAISuggestions
'use client'

import { useState, useCallback, useContext } from 'react'
import { AuthContext } from '@/context/AuthContext'
import { useTranslations, useLocale } from 'next-intl'
import { getAssistantApiUrl } from '@/lib/assistantApi'
import { useSubscription } from '@/hooks/useSubscription'
import { useToast } from '@/components/ui/use-toast'

export function useAISuggestions() {
  const authContext = useContext(AuthContext)
  const session = authContext?.session || null
  const [text, setText] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const tAssistant = useTranslations('assistant')
  const locale = useLocale()
  const { subscriptionPlan } = useSubscription()
  const isPro = subscriptionPlan === 'pro'
  const { toast } = useToast()

  const fetchSuggestion = useCallback(async (prompt: string) => {
    if (!session?.user?.id) return
    setText('')
    setLoading(true)
    setError(null)
    setIsRateLimited(false)

    const controller = new AbortController()
    setAbortController(controller)

    const tone = isPro ? ((session.user.user_metadata as any)?.assistant_tone || 'neutral') : 'neutral'

    try {
      const res = await fetch(getAssistantApiUrl(locale), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          isPro,
          enableLimits: true,
          message: prompt,
          tone
        }),
        signal: controller.signal
      })

      // Заголовки usage для soft‑toast
      const dailyLimitHeader = Number(res.headers.get('X-Daily-Limit') || '')
      const usedHeader = Number(res.headers.get('X-Usage-Used') || '')

      if (!res.ok) {
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('text/html') || res.status === 404) {
          setError('Assistant endpoint is not reachable for this locale. Please reload and try again.')
        } else if (res.status === 429) {
          setIsRateLimited(true)
          setError(tAssistant('rateLimited'))
          if (!isPro && Number.isFinite(dailyLimitHeader)) {
            toast({
              title: tAssistant('toasts.limitReached', { used: usedHeader, limit: dailyLimitHeader }),
              duration: 5000
            })
          }
        } else if (ct.includes('application/json')) {
          const json = await res.json()
          setError(json.error || 'Failed to fetch suggestion')
        } else {
          setError('Failed to fetch suggestion')
        }
        return
      }

      // Soft toasts on usage milestones for Free users
      if (!isPro && Number.isFinite(dailyLimitHeader) && Number.isFinite(usedHeader)) {
        if (usedHeader === 3) {
          toast({
            title: tAssistant('toasts.usedNOfDailyLimit', { used: usedHeader, limit: dailyLimitHeader }),
            duration: 5000
          })
        } else if (usedHeader === dailyLimitHeader) {
          toast({
            title: tAssistant('toasts.limitReached', { used: usedHeader, limit: dailyLimitHeader }),
            duration: 5000
          })
        }
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
  }, [session?.user?.id, locale, isPro, subscriptionPlan])

  const abort = useCallback(() => {
    abortController?.abort()
    setLoading(false)
  }, [abortController])

  return { text, loading, error, isRateLimited, fetchSuggestion, abort }
}