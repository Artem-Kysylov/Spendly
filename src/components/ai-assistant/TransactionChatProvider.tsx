"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TransactionChatWindow } from "./TransactionChatWindow";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";

export function TransactionChatProvider({
  showFloatingButton = false,
}: {
  showFloatingButton?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setIsOpen(true);
    window.addEventListener("transactions:chat", handler);
    return () => window.removeEventListener("transactions:chat", handler);
  }, []);

  return (
    <>
      {/* Floating button to open transaction chat */}
      {showFloatingButton && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 rounded-full w-14 h-14 shadow-lg"
          size="icon"
          title="Add transaction via AI"
        >
          <MessageSquarePlus className="w-6 h-6" />
        </Button>
      )}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="bottom"
          className="bg-background text-foreground h-[95dvh] pb-[env(safe-area-inset-bottom)] overflow-hidden z-[10010] p-0"
          aria-labelledby="transaction-chat-title"
          overlayClassName="bg-foreground/40"
        >
          <TransactionChatWindow
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
