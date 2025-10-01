'use client'

import { useState, KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
    onSendMessage: (content: string) => Promise<void>
    disabled?: boolean
}

export const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
    const [message, setMessage] = useState('')

    const handleSend = async () => {
        if (!message.trim() || disabled) return

        const messageToSend = message.trim()
        setMessage('')
        await onSendMessage(messageToSend)
    }

    const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="p-4">
            <div className="flex items-center space-x-2">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your expenses..."
                    disabled={disabled}
                    rows={1}
                    className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed h-10"
                />
                <button
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                    className="h-10 w-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}