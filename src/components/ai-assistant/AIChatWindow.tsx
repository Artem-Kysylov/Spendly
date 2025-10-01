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
    onSendMessage
}: AIChatWindowProps) => {
    if (!isOpen) return null

    return (
        <div className="fixed bottom-20 right-4 w-80 h-[496px] bg-white rounded-xl shadow-2xl border border-gray-200/50 flex flex-col z-40 animate-in slide-in-from-bottom-2 fade-in-0 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-t-xl flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <h3 className="font-semibold text-gray-900">Spendly Pal</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors duration-200 touch-manipulation"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-gray-50/30 to-white">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Welcome Message */}
                        <div className="p-4 text-center flex-shrink-0">
                            <div className="text-3xl mb-3 animate-bounce">✨</div>
                            <h4 className="font-semibold text-gray-900 mb-2">Welcome to AI Assistant</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">Ask me anything about your finances or choose a preset below</p>
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
                <div className="border-t border-gray-100 bg-white rounded-b-xl flex-shrink-0">
                    <ChatInput onSendMessage={onSendMessage} disabled={isTyping} />
                </div>
            </div>
        </div>
    )
}