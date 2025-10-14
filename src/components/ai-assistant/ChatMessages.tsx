'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from '@/types/types'
import { User, Bot } from 'lucide-react'
import { UserAuth } from '@/context/AuthContext'

interface ChatMessagesProps {
    messages: ChatMessage[]
    isTyping: boolean
}

export const ChatMessages = ({ messages, isTyping }: ChatMessagesProps) => {
    const { session } = UserAuth()
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isTyping])

    // Получаем аватар пользователя
    const userAvatar = session?.user?.user_metadata?.avatar_url
    const displayName =
      session?.user?.user_metadata?.full_name ||
      session?.user?.user_metadata?.name ||
      session?.user?.email ||
      'U'
    const userInitial = displayName.charAt(0).toUpperCase()

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                >
                    {message.role === 'assistant' && (
                        <div className="w-7 h-7 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                            <Bot className="w-4 h-4 text-secondary-black dark:text-white" />
                        </div>
                    )}
                    
                    <div
                        className={`max-w-[75%] p-3 rounded-2xl shadow-sm ${
                            message.role === 'user'
                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md'
                                : 'bg-gray-100 text-secondary-black rounded-bl-md border border-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-700'
                        }`}
                    >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <div className={`text-xs mt-2 ${
                            message.role === 'user' ? 'text-blue-600 dark:text-blue-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                            {message.timestamp.toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })}
                        </div>
                    </div>

                    {message.role === 'user' && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm overflow-hidden">
                            {userAvatar ? (
                                <img 
                                    src={userAvatar} 
                                    alt="User avatar" 
                                    className="w-full h-full object-cover rounded-full"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-full h-full bg-indigo-600 dark:bg-indigo-400 flex items-center justify-center">
                                    <span className="text-white text-xs font-semibold">{userInitial}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
                <div className="flex items-start space-x-3 animate-in fade-in-0 duration-300">
                    <div className="w-7 h-7 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                        <Bot className="w-4 h-4 text-secondary-black dark:text-white" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    )
}