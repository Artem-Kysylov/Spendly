'use client'

// Imports 
import { useState, useCallback } from 'react'

// Import types 
import { ChatMessage, UseChatReturn } from '@/types/types'

// Import context 
import { UserAuth } from '@/context/AuthContext'
import { localizeEmptyWeekly, localizeEmptyMonthly, localizeEmptyGeneric, periodLabel as canonicalPeriodLabel } from '@/prompts/spendlyPal/canonicalPhrases'

export const useChat = (): UseChatReturn => {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isTyping, setIsTyping] = useState(false)

    const { session } = UserAuth()
    const [abortController, setAbortController] = useState<AbortController | null>(null)
    const [pendingAction, setPendingAction] = useState<null | { type: 'add_transaction'; payload: { title: string; amount: number; budget_folder_id: string | null; budget_name: string } }>(null)
    const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null)

    const openChat = useCallback(() => {
        setIsOpen(true)
    }, [])

    const closeChat = useCallback(() => {
        setIsOpen(false)
    }, [])

    const sendMessage = useCallback(async (content: string) => {
        // Add user message
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            content,
            role: 'user',
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setIsTyping(true)

        if (!session?.user?.id) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                content: 'Please sign in to use the assistant.',
                role: 'assistant',
                timestamp: new Date()
            }])
            setIsTyping(false)
            return
        }

        const controller = new AbortController()
        setAbortController(controller)

        try {
            const response = await fetch('/api/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: session.user.id,
                    isPro: false,
                    enableLimits: false,
                    message: content
                }),
                signal: controller.signal
            })

            if (!response.ok) {
                const contentType = response.headers.get('content-type') || ''
                if (response.status === 429) {
                    const cooldownMs = 3000
                    setRateLimitedUntil(Date.now() + cooldownMs)
                    const msg = 'Rate limit reached. Please wait a few seconds and try again.\nTip: Try shorter queries or come back later.'
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
                    const json = await response.json()
                    const msg = typeof json.error === 'string' ? json.error : 'Request failed'
                    const friendly = `${msg}\nTry: Rephrase your request or check your connection.`
                    const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), content: friendly, role: 'assistant', timestamp: new Date() }
                    setMessages(prev => [...prev, aiMessage])
                    return
                }
                const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), content: 'Assistant is temporarily unavailable. Please try again later.', role: 'assistant', timestamp: new Date() }
                setMessages(prev => [...prev, aiMessage])
                return
            }

            const contentType = response.headers.get('content-type') || ''

            if (contentType.includes('application/json')) {
                // Atomic JSON reply (message or action or structured contract)
                const json = await response.json()
                if (json.kind === 'action') {
                    const confirmText = json.confirmText as string
                    const action = json.action as typeof pendingAction
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
                    if (json.shouldRefetch) {
                        window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
                    }
                } else if (json && typeof json.intent === 'string') {
                    // Новый JSON‑контракт ответа ассистента
                    const period = typeof json.period === 'string' ? json.period : 'unknown'
                    // Читаем локаль/валюту из заголовков ответа
                    const respLocale = response.headers.get('X-Locale') || 'en-US'
                    const respCurrencyHeader = response.headers.get('X-Currency') || ''
                    const currency = typeof json.currency === 'string' ? json.currency : (respCurrencyHeader || 'USD')
                    const totals = json.totals || {}
                    const breakdown = Array.isArray(json.breakdown) ? json.breakdown : []
                    const topExpenses = Array.isArray(json.topExpenses) ? json.topExpenses : []
                    const shortText = typeof json.text === 'string' ? json.text : ''

                    const nf = new Intl.NumberFormat(respLocale, { style: 'currency', currency: currency })
                    const df = new Intl.DateTimeFormat(respLocale, { year: 'numeric', month: 'short', day: 'numeric' })
                    const isRu = respLocale.toLowerCase().startsWith('ru')
                    const L = (en: string, ru: string) => (isRu ? ru : en)

                    // Простая локализация лэйблов периода
                    const makePeriodLabel = (p: string, loc: string) => {
                        return canonicalPeriodLabel(
                            (p === 'thisWeek' || p === 'lastWeek' || p === 'thisMonth' || p === 'lastMonth') ? p : 'unknown',
                            loc
                        )
                    }

                    // Дружественный фолбэк: если текст отсутствует, строим локализованную сводку
                    let friendly = shortText
                    if (!friendly) {
                        const periodLabel = makePeriodLabel(period, respLocale)
                        const totalExp = typeof totals.expenses === 'number' ? totals.expenses
                            : typeof totals.expenses === 'string' ? Number(totals.expenses) : undefined
                        const totalInc = typeof totals.income === 'number' ? totals.income
                            : typeof totals.income === 'string' ? Number(totals.income) : undefined
                        const totalNet = typeof totals.net === 'number' ? totals.net
                            : typeof totals.net === 'string' ? Number(totals.net) : undefined

                        if (totalExp === 0) {
                            // Каноническая фраза — единообразие с сервером
                            friendly = period === 'thisWeek' ? localizeEmptyWeekly('thisWeek', respLocale)
                                     : period === 'lastWeek' ? localizeEmptyWeekly('lastWeek', respLocale)
                                     : period === 'thisMonth' ? localizeEmptyMonthly('thisMonth', respLocale)
                                     : period === 'lastMonth' ? localizeEmptyMonthly('lastMonth', respLocale)
                                     : localizeEmptyGeneric(respLocale)
                        } else {
                            const lines: string[] = []
                            lines.push(`${periodLabel}`)

                            if (typeof totalExp === 'number' && !Number.isNaN(totalExp)) {
                                lines.push(`${L('Total expenses', 'Всего расходы')}: ${nf.format(Number(totalExp))}`)
                            }
                            if (typeof totalInc === 'number' && !Number.isNaN(totalInc)) {
                                lines.push(`${L('Total income', 'Всего доходы')}: ${nf.format(Number(totalInc))}`)
                            }
                            if (typeof totalNet === 'number' && !Number.isNaN(totalNet)) {
                                lines.push(`${L('Net', 'Чистый итог')}: ${nf.format(Number(totalNet))}`)
                            }

                            if (breakdown.length > 0) {
                                const topCats: string[] = breakdown
                                    .filter((b: any) => typeof b?.amount === 'number' || typeof b?.amount === 'string')
                                    .slice(0, 3)
                                    .map((b: any) => {
                                        const label = b?.name || b?.category || b?.title || L('Category', 'Категория')
                                        const amt = typeof b?.amount === 'number' ? b.amount : Number(b?.amount)
                                        return `${label}: ${nf.format(Number(amt))}`
                                    })
                                if (topCats.length > 0) {
                                    lines.push(`${L('Top categories', 'Топ категории')}:`)
                                    lines.push(...topCats.map((s: string) => `• ${s}`))
                                }
                            }

                            if (topExpenses.length > 0) {
                                const topItems: string[] = topExpenses
                                    .filter((e: any) => typeof e?.amount === 'number' || typeof e?.amount === 'string')
                                    .slice(0, 3)
                                    .map((e: any) => {
                                        const label = e?.title || e?.name || e?.category || L('Item', 'Транзакция')
                                        const amt = typeof e?.amount === 'number' ? e.amount : Number(e?.amount)
                                        const dateStr = e?.date ? df.format(new Date(e.date)) : ''
                                        return `${label}: ${nf.format(Number(amt))}${dateStr ? ` (${dateStr})` : ''}`
                                    })
                                if (topItems.length > 0) {
                                    lines.push(`${L('Top expenses', 'Топ расходы')}:`)
                                    lines.push(...topItems.map((s: string) => `• ${s}`))
                                }
                            }

                            // Если ничего не смогли добавить — общий локализованный фолбэк
                            if (lines.length <= 1) {
                                lines.push(isRu ? 'Сводка доступна.' : 'Summary available.')
                            }

                            friendly = lines.join('\n')
                        }
                    }

                    const aiMessage: ChatMessage = {
                        id: (Date.now() + 1).toString(),
                        content: friendly,
                        role: 'assistant',
                        timestamp: new Date()
                    }
                    setMessages(prev => [...prev, aiMessage])
                } else {
                    const aiMessage: ChatMessage = {
                        id: (Date.now() + 1).toString(),
                        content: typeof json.message === 'string' ? json.message : '',
                        role: 'assistant',
                        timestamp: new Date()
                    }
                    setMessages(prev => [...prev, aiMessage])
                }
            } else {
                // Streaming text response
                const reader = response.body?.getReader()
                const decoder = new TextDecoder()
                let acc = ''

                // Intermediate assistant message (stream)
                const streamMsgId = (Date.now() + 1).toString()
                setMessages(prev => [...prev, { id: streamMsgId, content: '', role: 'assistant', timestamp: new Date() }])

                while (reader) {
                    const { done, value } = await reader.read()
                    if (done) break
                    acc += decoder.decode(value, { stream: true })
                    // Update last message content progressively
                    setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, content: acc } : m))
                }

                // Пост-обработка: дружелюбный фолбэк, если провайдер вернул пустые кандидаты
                const providerEmptyMsgPattern = /LLM provider returned empty text candidates\./i
                if (providerEmptyMsgPattern.test(acc)) {
                    // Попробуем вытащить Blocked: <reason> (если сервер его указал)
                    const blockedReasonMatch = acc.match(/Blocked:\s*([^.\n]+)/i)
                    const reason = blockedReasonMatch?.[1]?.trim()
                    const friendly = reason
                        ? `Your request was blocked by the provider (${reason}). Tip: Try rephrasing your request and avoid sensitive content.`
                        : 'The assistant could not generate a response this time. Try rephrasing your request or reducing its complexity.'
                    setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, content: friendly } : m))
                }
            }
        } catch (error) {
            console.error('Error sending message:', error)
        } finally {
            setIsTyping(false)
            setAbortController(null)
        }
    }, [session?.user?.id])

    const clearMessages = useCallback(() => {
        setMessages([])
    }, [])

    const abort = useCallback(() => {
        abortController?.abort()
        setIsTyping(false)
    }, [abortController])

    const confirmAction = useCallback(async (confirm: boolean) => {
        if (!pendingAction || !session?.user?.id) return

        if (!confirm) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 2).toString(),
                content: 'Cancelled.',
                role: 'assistant',
                timestamp: new Date()
            }])
            setPendingAction(null)
            return
        }

        try {
            const res = await fetch('/api/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: session.user.id,
                    confirm: true,
                    actionPayload: pendingAction.payload
                })
            })
            const json = await res.json()
            setMessages(prev => [...prev, {
                id: (Date.now() + 3).toString(),
                content: json.message || 'Done.',
                role: 'assistant',
                timestamp: new Date()
            }])
            if (json.shouldRefetch) {
                window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
            }
        } catch (e) {
            console.error('Confirm failed:', e)
        } finally {
            setPendingAction(null)
        }
    }, [pendingAction, session?.user?.id])

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
        pendingActionPayload: pendingAction?.payload ?? null
    }
}