// Функциональный компонент: ChatInput
import { ToneSelect } from './ToneSelect'
import { useState, KeyboardEvent, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Select } from '@/components/ui/select'
import { useSubscription } from '@/hooks/useSubscription'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

import { PresetChipsRow } from './PresetChipsRow'

interface ChatInputProps {
    onSendMessage: (content: string) => Promise<void>
    disabled?: boolean
    isThinking?: boolean
    onAbort?: () => void
    assistantTone?: 'neutral' | 'friendly' | 'formal' | 'playful'
    onToneChange?: (tone: 'neutral' | 'friendly' | 'formal' | 'playful') => void | Promise<void>
    showTone?: boolean
    showChips?: boolean
}

export const ChatInput = ({ onSendMessage, disabled, isThinking, onAbort, assistantTone = 'neutral', onToneChange, showTone = true, showChips = true }: ChatInputProps) => {
    const [message, setMessage] = useState('')
    const tAI = useTranslations('assistant')
    const toneEmoji = { neutral: '😐', friendly: '😊', formal: '🧑‍💼', playful: '😜' } as const
    const { subscriptionPlan } = useSubscription()
    const isFree = subscriptionPlan === 'free'

    // авто‑рост textarea + скрытие скролла до лимита
    // фиксируем высоту textarea под кнопку
    // const MAX_TEXTAREA_HEIGHT = 160
    const MAX_TEXTAREA_HEIGHT = 40
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const [isOverflowing, setIsOverflowing] = useState(false)

    const autoResize = () => {
        const el = textareaRef.current
        if (!el) return
        // фиксированная высота
        el.style.height = `${MAX_TEXTAREA_HEIGHT}px`
        // скролл только при переполнении
        const overflow = el.scrollHeight > MAX_TEXTAREA_HEIGHT
        setIsOverflowing(overflow)
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
        <div className="w-full p-0">
            <div className="flex flex-col gap-2">
                {showChips && (
                    <div className="hidden lg:block">
                        <PresetChipsRow onSelect={onSendMessage} className="flex-shrink-0" />
                    </div>
                )}
                {showTone && (
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                            {tAI('tone.select_label')}
                        </label>
                        {isFree ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <ToneSelect
                                      value={'neutral'}
                                      onChange={() => {}}
                                      disabled
                                      aria-label={tAI('tone.label')}
                                      className="w-full"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="font-medium">
                                  {tAI('settings.proOnlyHint')}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <ToneSelect
                                value={assistantTone}
                                onChange={(tone) => onToneChange?.(tone)}
                                disabled={(disabled ?? false) || (isThinking ?? false)}
                                aria-label={tAI('tone.label')}
                                className="w-full"
                            />
                        )}
                    </div>
                )}
                {/* Инпут и кнопка — растянуты по ширине секции */}
                <div className="flex items-center space-x-2 w-full">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={tAI('input.placeholder')}
                        disabled={(disabled ?? false) || (isThinking ?? false)}
                        rows={1}
                        style={{
                            height: MAX_TEXTAREA_HEIGHT,
                            maxHeight: MAX_TEXTAREA_HEIGHT,
                            overflowY: isOverflowing ? 'auto' : 'hidden',
                        }}
                        className="flex-1 resize-none border border-border bg-card text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed h-10"
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