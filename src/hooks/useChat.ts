// Хук: useChat
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ChatMessage, UseChatReturn } from '@/types/types'
import { UserAuth } from '@/context/AuthContext'
import { useTranslations, useLocale } from 'next-intl'
import { getAssistantApiUrl } from '@/lib/assistantApi'
import { localizeEmptyWeekly, localizeEmptyMonthly, localizeEmptyGeneric, periodLabel as canonicalPeriodLabel } from '@/prompts/spendlyPal/canonicalPhrases'
import { trackEvent } from '@/lib/telemetry';
import { supabase } from '@/lib/supabaseClient'
import type { AIResponse, AssistantTone, Period } from '@/types/ai'
import { useSubscription } from '@/hooks/useSubscription'

type PendingAction =
  | { type: 'add_transaction'; payload: { title: string; amount: number; budget_folder_id: string | null; budget_name: string } }
  | { type: 'save_recurring_rule'; payload: { title_pattern: string; budget_folder_id: string | null; avg_amount: number; cadence: 'weekly' | 'monthly'; next_due_date: string } }

// JSON‑ответ ассистента: либо стандартный AIResponse (action/message), либо «канонический» контракт при обходе LLM
type AssistantJSON =
  | AIResponse
  | {
      intent: string
      period?: string
      currency?: string
      totals?: Record<string, unknown>
      breakdown?: Array<{ name?: string; title?: string; category?: string; amount?: number | string }>
      topExpenses?: Array<{ title?: string; name?: string; category?: string; amount?: number | string; date?: string }>
      text?: string
      shouldRefetch?: boolean
    }



export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  const { session } = UserAuth()
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null)

  const tAssistant = useTranslations('assistant')
  const locale = useLocale()
  const { subscriptionPlan } = useSubscription()
  const openChat = useCallback(() => setIsOpen(true), [])
  const closeChat = useCallback(() => setIsOpen(false), [])

  // Тон ассистента + лёгкий debounce сохранения в профиле
  const [assistantTone, setAssistantToneState] = useState<AssistantTone>('neutral')
  const persistTimer = useRef<number | null>(null)

  useEffect(() => {
    // Попытка подгрузить сохранённый тон из профиля с учётом плана
    const initTone = async () => {
      try {
        const user = session?.user
        const tone = (user?.user_metadata as any)?.assistant_tone as AssistantTone | undefined
        if (subscriptionPlan === 'free') {
          setAssistantToneState('neutral')
        } else if (tone) {
          setAssistantToneState(tone)
        }
      } catch {
        // no-op
      }
    }
    initTone()
  }, [session?.user, subscriptionPlan])

  const setAssistantTone = useCallback(async (tone: AssistantTone) => {
    // Для Free блокируем изменения тона
    if (subscriptionPlan === 'free') {
      setAssistantToneState('neutral')
      return
    }
    setAssistantToneState(tone)
    if (persistTimer.current) {
      window.clearTimeout(persistTimer.current)
    }
    persistTimer.current = window.setTimeout(async () => {
      try {
        await supabase.auth.updateUser({ data: { assistant_tone: tone } })
      } catch (e) {
        console.warn('Failed to persist tone', e)
      }
    }, 400)
  }, [subscriptionPlan])

  const sendMessage = useCallback(async (content: string) => {
    trackEvent('ai_request_used');
    // Добавляем сообщение пользователя
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    if (!session?.user?.id) {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Please sign in to use the assistant.',
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
      setIsTyping(false)
      return
    }

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const response = await fetch(getAssistantApiUrl('en'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          isPro: subscriptionPlan === 'pro',
          enableLimits: true,
          message: content,
          tone: subscriptionPlan === 'pro' ? assistantTone : 'neutral'
        }),
        signal: controller.signal
      })

      const contentType = response.headers.get('content-type') || ''

      // Дружелюбная обработка HTML/404
      if (!response.ok) {
        if (contentType.includes('text/html') || response.status === 404) {
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: 'Assistant endpoint is not reachable for this locale. Please reload the page or try again.',
            role: 'assistant',
            timestamp: new Date()
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }
      }

      // Rate limit / Unauthorized
      if (response.status === 429) {
        trackEvent('ai_limit_hit');
        const cooldownMs = 3000
        setRateLimitedUntil(Date.now() + cooldownMs)
        const msg = tAssistant('rateLimited')
        const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), content: msg, role: 'assistant', timestamp: new Date() }
        setMessages(prev => [...prev, aiMessage])
        return
      }
      if (response.status === 401) {
        const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), content: 'Please sign in to use the assistant.', role: 'assistant', timestamp: new Date() }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      if (contentType.includes('application/json')) {
        // JSON: либо action/message, либо канонический контракт (bypass)
        const json = (await response.json()) as AssistantJSON

        // Ветка action/message (AIResponse)
        if ('kind' in json) {
          if (json.kind === 'action') {
            const confirmText = json.confirmText
            const action = json.action as PendingAction
            setPendingAction(action)
            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              content: confirmText,
              role: 'assistant',
              timestamp: new Date()
            }
            setMessages(prev => [...prev, aiMessage])
          } else if (json.kind === 'message') {
            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              content: json.message,
              role: 'assistant',
              timestamp: new Date()
            }
            setMessages(prev => [...prev, aiMessage])

            const shouldRefetch = (json as any)?.shouldRefetch === true
            if (shouldRefetch) {
              window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
            }
          }
          return
        }

        // Канонический JSON‑контракт (bypass LLM)
        if (json && typeof json.intent === 'string') {
          const respLocale = response.headers.get('X-Locale') || 'en-US'
          const respCurrencyHeader = response.headers.get('X-Currency') || ''
          const currency = typeof json.currency === 'string' ? json.currency : (respCurrencyHeader || 'USD')

          const nf = new Intl.NumberFormat(respLocale, { style: 'currency', currency })
          const df = new Intl.DateTimeFormat(respLocale, { year: 'numeric', month: 'short', day: 'numeric' })
          const isRu = respLocale.toLowerCase().startsWith('ru')
          const L = (en: string, ru: string) => (isRu ? ru : en)

          const periodRaw = typeof json.period === 'string' ? json.period : 'unknown'
          const period: Period =
            periodRaw === 'thisWeek' || periodRaw === 'lastWeek' || periodRaw === 'thisMonth' || periodRaw === 'lastMonth'
              ? (periodRaw as Period)
              : 'unknown'
          const periodLabel = canonicalPeriodLabel(period, respLocale)
          let lines: string[] = []

          const title = L('Weekly summary', 'Еженедельная сводка')
          lines.push(`${title}: ${periodLabel}`)

          const totals = json.totals || {}
          const totalExpenses = typeof (totals as any)?.expenses === 'number' ? (totals as any).expenses : Number((totals as any)?.expenses || 0)
          if (Number.isFinite(totalExpenses)) {
            lines.push(`${L('Total expenses', 'Итого расходы')}: ${nf.format(totalExpenses)}`)
          }

          const breakdown = Array.isArray(json.breakdown) ? json.breakdown : []
          if (breakdown.length > 0) {
            const topCats = breakdown
              .filter((b) => typeof b?.amount === 'number' || typeof b?.amount === 'string')
              .slice(0, 3)
              .map((b) => {
                const label = b?.name || b?.title || b?.category || L('Category', 'Категория')
                const amt = typeof b?.amount === 'number' ? b.amount : Number(b?.amount)
                return `${label}: ${nf.format(Number(amt))}`
              })
            if (topCats.length > 0) {
              lines.push(`${L('Top categories', 'Топ категории')}:`)
              lines.push(...topCats.map((s) => `• ${s}`))
            }
          }

          const topExpenses = Array.isArray(json.topExpenses) ? json.topExpenses : []
          if (topExpenses.length > 0) {
            const topItems = topExpenses
              .filter((e) => typeof e?.amount === 'number' || typeof e?.amount === 'string')
              .slice(0, 3)
              .map((e) => {
                const label = e?.title || e?.name || e?.category || L('Item', 'Транзакция')
                const amt = typeof e?.amount === 'number' ? e.amount : Number(e?.amount)
                const dateStr = e?.date ? df.format(new Date(e.date)) : ''
                return `${label}: ${nf.format(Number(amt))}${dateStr ? ` (${dateStr})` : ''}`
              })
            if (topItems.length > 0) {
              lines.push(`${L('Top expenses', 'Топ расходы')}:`)
              lines.push(...topItems.map((s) => `• ${s}`))
            }
          }

          if (lines.length <= 1) {
            // Пустой период — локализованный фолбэк
            if (period === 'thisWeek') {
              lines.push(localizeEmptyWeekly('thisWeek', respLocale))
            } else if (period === 'lastWeek') {
              lines.push(localizeEmptyWeekly('lastWeek', respLocale))
            } else if (period === 'thisMonth') {
              lines.push(localizeEmptyMonthly('thisMonth', respLocale))
            } else if (period === 'lastMonth') {
              lines.push(localizeEmptyMonthly('lastMonth', respLocale))
            } else {
              lines.push(localizeEmptyGeneric(respLocale))
            }
          }

          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: lines.join('\n'),
            role: 'assistant',
            timestamp: new Date()
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        // Непредвиденная форма JSON — безопасный фолбэк
        const fallback = typeof (json as any)?.message === 'string'
          ? (json as any).message
          : 'Unexpected server response.'
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: fallback,
          role: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      // Стриминговый ответ (LLM)
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let acc = ''

      const streamMsgId = (Date.now() + 1).toString()
      setMessages(prev => [...prev, { id: streamMsgId, content: '', role: 'assistant', timestamp: new Date() }])

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, content: acc } : m))
      }

      // Пост‑обработка: дружелюбный текст при пустых кандидатах
      const providerEmptyMsgPattern = /LLM provider returned empty text candidates\./i
      if (providerEmptyMsgPattern.test(acc)) {
        const blockedReasonMatch = acc.match(/Blocked:\s*([^.\n]+)/i)
        const reason = blockedReasonMatch?.[1]?.trim()
        const friendly = reason
          ? `Your request was blocked by the provider (${reason}). Tip: Try rephrasing your request and avoid sensitive content.`
          : 'The assistant could not generate a response this time. Try rephrasing your request or reducing its complexity.'
        setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, content: friendly } : m))
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsTyping(false)
      setAbortController(null)
    }
  }, [session?.user?.id, assistantTone, locale, subscriptionPlan])

  const clearMessages = useCallback(() => setMessages([]), [])

  const abort = useCallback(() => {
    abortController?.abort()
    setIsTyping(false)
  }, [abortController])

  const confirmAction = useCallback(async (confirm: boolean) => {
    if (!pendingAction || !session?.user?.id) return

    if (!confirm) {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        content: 'Cancelled.',
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
      setPendingAction(null)
      return
    }

    try {
      const res = await fetch(getAssistantApiUrl('en'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          isPro: subscriptionPlan === 'pro',
          enableLimits: true,
          confirm: true,
          actionPayload: pendingAction.payload,
          actionType: pendingAction.type
        })
      })
  
      if (!res.ok) {
          const ct = res.headers.get('content-type') || ''
          if (ct.includes('text/html') || res.status === 404) {
              const aiMessage: ChatMessage = {
                  id: (Date.now() + 3).toString(),
                  content: 'Assistant endpoint is not reachable for this locale. Please reload and try again.',
                  role: 'assistant',
                  timestamp: new Date()
              }
              setMessages(prev => [...prev, aiMessage])
              setPendingAction(null)
              return
          }
          const jsonErr = ct.includes('application/json') ? await res.json().catch(() => null) : null
          const msg = jsonErr?.error || 'Failed to confirm action'
          const aiMessage: ChatMessage = {
              id: (Date.now() + 3).toString(),
              content: msg,
              role: 'assistant',
              timestamp: new Date()
          }
          setMessages(prev => [...prev, aiMessage])
          setPendingAction(null)
          return
      }
      const jsonConfirm = await res.json() as { message?: string; shouldRefetch?: boolean }
      const aiMessage: ChatMessage = {
          id: (Date.now() + 3).toString(),
          content: jsonConfirm.message || 'Done.',
          role: 'assistant',
          timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
      if (jsonConfirm.shouldRefetch) {
          window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
      }
    } catch (e) {
      console.error('Confirm failed:', e)
    } finally {
      setPendingAction(null)
    }
  }, [pendingAction, session?.user?.id, locale, subscriptionPlan])

  const hasPendingAction = !!pendingAction
  const isRateLimited = rateLimitedUntil ? Date.now() < rateLimitedUntil : false

  return {
    messages,
    isOpen,
    isTyping,
    openChat,
    closeChat,
    sendMessage,
    clearMessages,
    abort,
    confirmAction,
    hasPendingAction,
    isRateLimited,
    pendingActionPayload: pendingAction?.payload ?? null,
    assistantTone,
    setAssistantTone
  }
}