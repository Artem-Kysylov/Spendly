'use client'

import { useState, useCallback } from 'react'
import { ChatMessage, UseChatReturn } from '@/types/types'

export const useChat = (): UseChatReturn => {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isTyping, setIsTyping] = useState(false)

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

        try {
            // Simulate AI response delay
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

            // Mock AI response
            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                content: `Это тестовый ответ на ваше сообщение: "${content}". В будущем здесь будет настоящий AI-ассистент.`,
                role: 'assistant',
                timestamp: new Date()
            }

            setMessages(prev => [...prev, aiMessage])
        } catch (error) {
            console.error('Error sending message:', error)
        } finally {
            setIsTyping(false)
        }
    }, [])

    const clearMessages = useCallback(() => {
        setMessages([])
    }, [])

    return {
        messages,
        isOpen,
        isTyping,
        openChat,
        closeChat,
        sendMessage,
        clearMessages
    }
}