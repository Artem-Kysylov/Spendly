'use client'

import { useState, useCallback } from 'react'
import { ChatMessage, UseChatReturn } from '@/types/types'
import { UserAuth } from '@/context/AuthContext'

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
                    const msg = 'Rate limit reached. Please wait a few seconds and try again.'
                    const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), content: msg, role: 'assistant', timestamp: new Date() }
                    setMessages(prev => [...prev, aiMessage])
                    return
                }
                if (contentType.includes('application/json')) {
                    const json = await response.json()
                    const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), content: json.error || 'Request failed', role: 'assistant', timestamp: new Date() }
                    setMessages(prev => [...prev, aiMessage])
                    return
                }
            }

            const contentType = response.headers.get('content-type') || ''

            if (contentType.includes('application/json')) {
                // Atomic JSON reply (message or action)
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