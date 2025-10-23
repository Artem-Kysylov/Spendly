'use client'

import { X } from 'lucide-react'
import { ChatMessage } from '@/types/types'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { ChatPresets } from './ChatPresets'
import { useTranslations } from 'next-intl'

interface AIChatWindowProps {
    isOpen: boolean
    messages: ChatMessage[]
    isTyping: boolean
    onClose: () => void
    onSendMessage: (content: string) => Promise<void>
}

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
    pendingAction
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
    pendingAction?: { title: string; amount: number; budget_folder_id: string | null; budget_name: string } | null
}) => {
    if (!isOpen) return null
  const tAI = useTranslations('assistant')

    return (
        <>
            <div className="fixed inset-x-0 bottom-36 top-0 z-[90] pt-safe pb-safe lg:pt-0 lg:pb-0 lg:bottom-20 lg:right-4 lg:top-auto lg:left-auto w-full lg:w-[450px] lg:h-[550px] animate-in slide-in-from-bottom-2 fade-in-0 duration-300">
              {/* Chat Window */}
              <div className="h-full bg-white text-secondary-black dark:bg-black dark:text-white lg:rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-black lg:rounded-t-xl flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <h3 className="font-semibold text-secondary-black dark:text-white">{tAI('title')}</h3>
                  </div>
                  {/* Close button (mobile + desktop) */}
                  <button
                    onClick={onClose}
                    className="block p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors duration-200 touch-manipulation"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                  </button>
                </div>

                {/* Chat Content */}
                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-black">
                    {/* Rate limit indicator */}
                    {isRateLimited && (
                        <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-t border-b border-amber-200 dark:text-amber-100 dark:bg-amber-900 dark:border-amber-800">
                            {tAI('rateLimited')}
                        </div>
                    )}
                    {messages.length === 0 ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Welcome Message */}
                            <div className="p-4 text-center flex-shrink-0">
                                <div className="text-3xl mb-3">✨</div>
                                <h4 className="font-semibold text-secondary-black dark:text-white mb-2">{tAI('welcomeTitle')}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {tAI('welcomeDesc')}
                                </p>
                            </div>
                            {/* Presets - Scrollable */}
                            <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
                                <ChatPresets onSelectPreset={onSendMessage} />
                            </div>
                        </div>
                    ) : (
                        <ChatMessages messages={messages} isTyping={isTyping} />
                    )}

                    {/* Input */}
                    {hasPendingAction && !isTyping && (
                        <div className="px-4 py-3 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
                            <div className="text-sm font-semibold text-secondary-black dark:text-white mb-1">{tAI('confirm.title')}</div>
                            {pendingAction && (
                                <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{tAI('confirm.fields.title')}:</span> {pendingAction.title}
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{tAI('confirm.fields.budget')}:</span> {pendingAction.budget_name}
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">{tAI('confirm.fields.amount')}:</span> ${pendingAction.amount.toFixed(2)}
                                    </div>
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
                    <div className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-black lg:rounded-b-xl flex-shrink-0">
                        <div className="flex items-center gap-2 p-2 lg:pb-safe">
                            <div className="flex-1">
                                <ChatInput
                                    onSendMessage={onSendMessage}
                                    disabled={isRateLimited}
                                    isThinking={isTyping}
                                    onAbort={onAbort}
                                />
                            </div>
                        </div>
                    </div>
                </div>          {/* закрываем flex-1 контент */}
              </div>            {/* закрываем внутренний контейнер окна (h-full ...) */}
            </div>              {/* закрываем внешний fixed контейнер */}

            {/* Убрали мобильную кнопку снизу, чтобы окно было над внешней кнопкой */}
        </>
    )
}