'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from '@/types/types'
import { User, Bot } from 'lucide-react'
import { UserAuth } from '@/context/AuthContext'
import { useTranslations, useLocale } from 'next-intl'

interface ChatMessagesProps {
    messages: ChatMessage[]
    isTyping: boolean
}

export const ChatMessages = ({ messages, isTyping }: ChatMessagesProps) => {
    const { session } = UserAuth()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const tAI = useTranslations('assistant')
    const locale = useLocale()

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
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

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()

    const dayLabel = (d: Date) => {
      const now = new Date()
      const yesterday = new Date()
      yesterday.setDate(now.getDate() - 1)
      if (isSameDay(d, now)) return tAI('dates.today')
      if (isSameDay(d, yesterday)) return tAI('dates.yesterday')
      return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(d)
    }

    const renderMarkdownLite = (text: string) => {
      // bold **text**, inline code `code`, link [label](url)
      const parts = text.split('\n').map((line, i) => {
        const withBold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        const withCode = withBold.replace(/`([^`]+?)`/g, '<code>$1</code>')
        const withLinks = withCode.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
        return <p key={i} className="text-sm whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: withLinks }} />
      })
      return parts
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {/* Date separators */}
            {messages.map((message, idx) => {
                const showSeparator = idx === 0 || !isSameDay(message.timestamp, messages[idx - 1].timestamp)
                return (
                  <div key={message.id}>
                    {showSeparator && (
                      <div className="flex items-center my-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="mx-3 text-[11px] text-muted-foreground">{dayLabel(message.timestamp)}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div
                      className={`flex items-start space-x-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
                        {renderMarkdownLite(message.content)}
                        <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-200 dark:text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {message.role === 'user' && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm overflow-hidden">
                            {userAvatar ? (
                                <img src={userAvatar} alt="User avatar" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                            ) : (
                                <div className="w-full h-full bg-indigo-600 dark:bg-indigo-400 flex items-center justify-center">
                                    <span className="text-white text-xs font-semibold">{userInitial}</span>
                                </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                )
            })}

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