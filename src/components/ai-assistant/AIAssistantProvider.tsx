"use client"

import React from 'react'
import { FloatingAIButton } from './FloatingAIButton'
import { AIChatWindow } from './AIChatWindow'
import { useChat } from '@/hooks/useChat'
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet'

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
    assistantTone,
    setAssistantTone,
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
      <Sheet open={isOpen} onOpenChange={(o) => (o ? openChat() : closeChat())}>
        {!isOpen && (
          <SheetTrigger>
            <FloatingAIButton />
          </SheetTrigger>
        )}

        <SheetContent side="right" className="p-0" aria-labelledby="ai-assistant-title">
          <AIChatWindow
            isOpen={true}
            messages={messages}
            isTyping={isTyping}
            onClose={closeChat}
            onSendMessage={sendMessage}
            onAbort={abort}
            onConfirmAction={confirmAction}
            hasPendingAction={hasPendingAction}
            isRateLimited={isRateLimited}
            pendingAction={pendingActionPayload}
            assistantTone={assistantTone}
            onToneChange={setAssistantTone}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

export default AIAssistantProvider