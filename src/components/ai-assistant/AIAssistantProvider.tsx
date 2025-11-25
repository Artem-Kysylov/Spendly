// AIAssistantProvider component
"use client"

import React, { useEffect } from 'react'
import { FloatingAIButton } from './FloatingAIButton'
import { AIChatWindow } from './AIChatWindow'
import { useChat } from '@/hooks/useChat'
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet'
import useDeviceType from '@/hooks/useDeviceType'

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
  const { isDesktop } = useDeviceType()

  // Слушатель глобального открытия ассистента
  useEffect(() => {
    const handler = () => openChat()
    window.addEventListener('ai-assistant:open', handler)
    return () => window.removeEventListener('ai-assistant:open', handler)
  }, [openChat])

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(o) => (o ? openChat() : closeChat())}>
        {/* Показываем плавающую кнопку только на десктопе */}
        {!isOpen && isDesktop && (
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