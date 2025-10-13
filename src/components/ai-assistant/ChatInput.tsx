'use client'

import { useState, KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
    onSendMessage: (content: string) => Promise<void>
    disabled?: boolean
    isThinking?: boolean
    onAbort?: () => void
}

export const ChatInput = ({ onSendMessage, disabled, isThinking, onAbort }: ChatInputProps) => {
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
                    disabled={(disabled ?? false) || (isThinking ?? false)}
                    rows={1}
                    className="flex-1 resize-none border border-gray-300 bg-white text-secondary-black placeholder:text-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed h-10 dark:border-gray-700 dark:bg-black dark:text-white dark:placeholder:text-gray-400"
                />
                <button
                    onClick={isThinking ? (onAbort ?? (() => {})) : handleSend}
                    disabled={isThinking ? false : (!message.trim() || !!disabled)}
                    className={`h-10 w-10 ${isThinking ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary/90'} text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0`}
                    aria-label={isThinking ? 'Abort' : 'Send'}
                    title={isThinking ? 'Abort' : 'Send'}
                >
                    {isThinking ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                </button>
            </div>
        </div>
    )
}