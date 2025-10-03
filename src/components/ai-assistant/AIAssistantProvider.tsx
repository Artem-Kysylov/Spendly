"use client"

import React from 'react'
import { FloatingAIButton } from './index'
import { AIChatWindow } from './AIChatWindow'
import { useChat } from '@/hooks/useChat'

const AIAssistantProvider: React.FC = () => {
  const {
    messages,
    isOpen,
    isTyping,
    openChat,
    closeChat,
    sendMessage,
    abort,
    confirmAction,
    hasPendingAction,
    isRateLimited,
    pendingActionPayload,
  } = useChat()

  const handleAIButtonClick = () => {
    if (isOpen) {
      closeChat()
    } else {
      openChat()
    }
  }

  return (
    <>
      <FloatingAIButton 
        onClick={handleAIButtonClick} 
        isOpen={isOpen}
      />
      <AIChatWindow
        isOpen={isOpen}
        messages={messages}
        isTyping={isTyping}
        onClose={closeChat}
        onSendMessage={sendMessage}
        onAbort={abort}
        onConfirmAction={confirmAction}
        hasPendingAction={hasPendingAction}
        isRateLimited={isRateLimited}
        pendingAction={pendingActionPayload}
      />
    </>
  )
}

export default AIAssistantProvider