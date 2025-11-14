// Функциональный компонент: ChatInput
import { ToneSelect } from './ToneSelect'
import { useState, KeyboardEvent, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Select } from '@/components/ui/select'
import { useSubscription } from '@/hooks/useSubscription'

interface ChatInputProps {
    onSendMessage: (content: string) => Promise<void>
    disabled?: boolean
    isThinking?: boolean
    onAbort?: () => void
    assistantTone?: 'neutral' | 'friendly' | 'formal' | 'playful'
    onToneChange?: (tone: 'neutral' | 'friendly' | 'formal' | 'playful') => void | Promise<void>
}

export const ChatInput = ({ onSendMessage, disabled, isThinking, onAbort, assistantTone = 'neutral', onToneChange }: ChatInputProps) => {
    const [message, setMessage] = useState('')
    const tAI = useTranslations('assistant')
    const toneEmoji = { neutral: '😐', friendly: '😊', formal: '🧑‍💼', playful: '😜' } as const
    const { subscriptionPlan } = useSubscription()
    const isFree = subscriptionPlan === 'free'

    // авто‑рост textarea + скрытие скролла до лимита
    const MAX_TEXTAREA_HEIGHT = 160
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)

    const autoResize = () => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        const next = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)
        el.style.height = `${next}px`
        el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
    }

    useEffect(() => {
        autoResize()
    }, [message])

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
            <div className="flex flex-col gap-2">
                {/* Тон: выпадающий список над инпутом и кнопкой */}
                <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {tAI('tone.select_label')}
                    </label>
                    <ToneSelect
                        value={isFree ? 'neutral' : assistantTone}
                        onChange={(tone) => {
                            if (isFree) return
                            onToneChange?.(tone)
                        }}
                        disabled={(disabled ?? false) || (isThinking ?? false) || isFree}
                        aria-label={tAI('tone.label')}
                        className="w-full"
                    />
                </div>

                <div className="flex items-center space-x-2">
                    {/* Инпут и кнопка — оставлены как были */}
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={tAI('input.placeholder')}
                        disabled={(disabled ?? false) || (isThinking ?? false)}
                        rows={1}
                        style={{ maxHeight: MAX_TEXTAREA_HEIGHT, overflowY: 'hidden' }}
                        className="flex-1 resize-none border border-gray-300 bg-white text-secondary-black placeholder:text-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-h-10 h-auto dark:border-gray-700 dark:bg-black dark:text-white"
                    />
                    <button
                        onClick={isThinking ? (onAbort ?? (() => {})) : handleSend}
                        disabled={isThinking ? false : (!message.trim() || !!disabled)}
                        className={`h-10 w-10 ${isThinking ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary/90'} text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0`}
                        aria-label={isThinking ? tAI('actions.abort') : tAI('actions.send')}
                        title={isThinking ? tAI('actions.abort') : tAI('actions.send')}
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
        </div>
    )
}