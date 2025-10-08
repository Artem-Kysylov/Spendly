'use client'

import { X } from 'lucide-react'
import { ChatMessage } from '@/types/types'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { ChatPresets } from './ChatPresets'

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

    return (
    <div className="fixed bottom-20 right-4 w-[450px] h-[550px] bg-black text-white rounded-xl shadow-2xl border border-gray-800 flex flex-col z-40 animate-in slide-in-from-bottom-2 fade-in-0 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-black rounded-t-xl flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="font-semibold text-white">Spendly Pal</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-800 rounded-full transition-colors duration-200 touch-manipulation"
        >
          <X className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      {/* Chat Content */}
      <div className="flex-1 flex flex-col min-h-0 bg-black">
        {/* Rate limit indicator */}
        {isRateLimited && (
          <div className="px-4 py-2 text-xs text-amber-100 bg-amber-900 border-t border-b border-amber-800">
            Rate limit reached. Please wait a few seconds…
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Welcome Message */}
            <div className="p-4 text-center flex-shrink-0">
              <div className="text-3xl mb-3">✨</div>
              <h4 className="font-semibold text-white mb-2">Welcome to AI Assistant</h4>
              <p className="text-sm text-gray-300 leading-relaxed">Ask me anything about your finances or choose a preset below</p>
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
          <div className="px-4 py-3 border-t border-gray-800 bg-black">
            <div className="text-sm font-semibold text-white mb-1">Confirm transaction</div>
            {pendingAction && (
              <div className="text-xs text-gray-300 mb-2">
                <div><span className="text-gray-400">Title:</span> {pendingAction.title}</div>
                <div><span className="text-gray-400">Budget:</span> {pendingAction.budget_name}</div>
                <div><span className="text-gray-400">Amount:</span> ${pendingAction.amount.toFixed(2)}</div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded bg-green-600 text-white text-sm" onClick={() => onConfirmAction(true)}>Accept</button>
              <button className="px-3 py-1 rounded bg-gray-700 text-white text-sm" onClick={() => onConfirmAction(false)}>Decline</button>
            </div>
          </div>
        )}
        {/* Input with integrated Abort */}
        <div className="border-t border-gray-800 bg-black rounded-b-xl flex-shrink-0">
          <div className="flex items-center gap-2 p-2">
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
      </div>
    </div>
  )
}