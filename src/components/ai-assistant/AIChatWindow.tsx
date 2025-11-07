'use client'

import { X } from 'lucide-react'
import { ChatMessage } from '@/types/types'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { ChatPresets } from './ChatPresets'
import { useTranslations } from 'next-intl'
import { SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export const AIChatWindow = ({
    isOpen,
    messages,
    isTyping,
    onClose,
    onSendMessage,
    onAbort,
    onConfirmAction,
    hasPendingAction,
    isRateLimited,
    pendingAction,
    assistantTone,
    onToneChange
}: {
    isOpen: boolean
    messages: ChatMessage[]
    isTyping: boolean
    onClose: () => void
    onSendMessage: (content: string) => Promise<void>
    onAbort: () => void
    onConfirmAction: (confirm: boolean) => Promise<void>
    hasPendingAction: boolean
    isRateLimited: boolean
    pendingAction?: { title?: string; amount?: number; budget_folder_id: string | null; budget_name?: string; title_pattern?: string; avg_amount?: number; cadence?: 'weekly' | 'monthly'; next_due_date?: string } | null
    assistantTone: 'neutral' | 'friendly' | 'formal' | 'playful'
    onToneChange: (tone: 'neutral' | 'friendly' | 'formal' | 'playful') => void | Promise<void>
}) => {
    if (!isOpen) return null
    const tAI = useTranslations('assistant')

    return (
        <>
            {/* Контент шторки */}
            <div className="h-full bg-background text-foreground flex flex-col">
                {/* Header внутри шторки */}
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <SheetTitle id="ai-assistant-title">{tAI('title')}</SheetTitle>
                  </div>
                  <SheetClose
                    className="block p-1.5 hover:bg-muted rounded-full transition-colors duration-200 touch-manipulation"
                    aria-label={tAI('buttons.close')}
                    onClick={onClose}
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </SheetClose>
                </SheetHeader>

                {/* Chat Content */}
                <div className="flex-1 flex flex-col min-h-0 bg-background">
                    {isRateLimited && (
                        <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-t border-b border-amber-200 dark:text-amber-100 dark:bg-amber-900 dark:border-amber-800">
                            {tAI('rateLimited')}
                        </div>
                    )}
                    {messages.length === 0 ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="p-4 text-center flex-shrink-0">
                                <div className="text-3xl mb-3">✨</div>
                                <h4 className="font-semibold mb-2">{tAI('welcomeTitle')}</h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {tAI('welcomeDesc')}
                                </p>
                            </div>
                            <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
                                <ChatPresets onSelectPreset={onSendMessage} />
                            </div>
                        </div>
                    ) : (
                        <ChatMessages messages={messages} isTyping={isTyping} />
                    )}

                    {/* Input */}
                    {hasPendingAction && !isTyping && (
                        <div className="px-4 py-3 border-t border-border bg-background">
                            <div className="text-sm font-semibold text-secondary-black dark:text-white mb-1">{tAI('confirm.title')}</div>
                            {pendingAction && (
                                <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                                    {pendingAction.title && (
                                      <>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{tAI('confirm.fields.title')}:</span> {pendingAction.title}
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{tAI('confirm.fields.budget')}:</span> {pendingAction.budget_name}
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">{tAI('confirm.fields.amount')}:</span> ${Number(pendingAction.amount ?? 0).toFixed(2)}
                                        </div>
                                      </>
                                    )}
                                    {!pendingAction.title && pendingAction.title_pattern && (
                                      <>
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">Pattern:</span> {pendingAction.title_pattern}
                                        </div>
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">Cadence:</span> {pendingAction.cadence}
                                        </div>
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">Avg amount:</span> ${Number(pendingAction.avg_amount ?? 0).toFixed(2)}
                                        </div>
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">Next due:</span> {pendingAction.next_due_date}
                                        </div>
                                      </>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-3 py-1 rounded bg-green-600 text-white text-sm"
                                    onClick={() => onConfirmAction(true)}
                                >
                                    {tAI('actions.accept')}
                                </button>
                                <button
                                    className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-700 text-secondary-black dark:text-white text-sm"
                                    onClick={() => onConfirmAction(false)}
                                >
                                    {tAI('actions.decline')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Input with integrated Abort */}
                    <div className="border-t border-border bg-background flex-shrink-0">
                        <div className="flex items-center gap-2 p-2 sm:pb-safe">
                            <div className="flex-1">
                                <ChatInput
                                    onSendMessage={onSendMessage}
                                    disabled={isRateLimited}
                                    isThinking={isTyping}
                                    onAbort={onAbort}
                                    assistantTone={assistantTone}
                                    onToneChange={onToneChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}