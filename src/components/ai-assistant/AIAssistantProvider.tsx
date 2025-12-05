"use client";

import { useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { AIChatWindow } from "./AIChatWindow";
import useDeviceType from "@/hooks/useDeviceType";
import { useChat } from "@/hooks/useChat";

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
  } = useChat();
  const { isDesktop } = useDeviceType();

  // Слушатель глобального открытия ассистента
  useEffect(() => {
    const handler = () => openChat();
    window.addEventListener("ai-assistant:open", handler);
    return () => window.removeEventListener("ai-assistant:open", handler);
  }, [openChat]);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(o) => (o ? openChat() : closeChat())}>
        <SheetContent
          side="right"
          className="p-0 overflow-hidden"
          aria-labelledby="ai-assistant-title"
        >
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
  );
};
export default AIAssistantProvider;
