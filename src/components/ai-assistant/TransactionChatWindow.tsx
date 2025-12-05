"use client";

import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";
import { TransactionChatMessages } from "./TransactionChatMessages";
import { useTransactionChat } from "@/hooks/useTransactionChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabaseClient";
import { UserAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export function TransactionChatWindow({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { session } = UserAuth();
  const { toast } = useToast();
  const tAI = useTranslations("assistant");
  const { messages, input, setInput, handleSubmit, isLoading, stop } =
    useTransactionChat();
  const [budgets, setBudgets] = useState<any[]>([]);

  // Fetch budgets on mount
  useEffect(() => {
    async function fetchBudgets() {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("budget_folders")
        .select("id, name, emoji, type")
        .eq("user_id", session.user.id)
        .order("name", { ascending: true });

      if (!error && data) {
        setBudgets(data);
      }
    }

    if (isOpen) {
      fetchBudgets();
    }
  }, [session?.user?.id, isOpen]);

  const handleTransactionSuccess = () => {
    toast({
      title: "Success",
      description: "Transaction saved successfully!",
    });
    // Optionally trigger refetch of dashboard data
    window.dispatchEvent(new CustomEvent("transaction:created"));
  };

  const handleTransactionError = (error: string) => {
    toast({
      title: "Error",
      description: error,
      variant: "destructive",
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="bg-background text-foreground flex flex-col relative h-full">
        {/* Header */}
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <SheetTitle id="transaction-chat-title">
              💰 Add Transaction
            </SheetTitle>
          </div>
          <SheetClose
            className="block p-1.5 hover:bg-muted rounded-full transition-colors duration-200 touch-manipulation"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </SheetClose>
        </SheetHeader>

        {/* Chat Content */}
        <div className="flex-1 min-h-0 grid grid-rows-[1fr_auto] bg-background">
          <div className="min-h-0 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="p-4 text-center">
                <div className="text-3xl mb-3">💸</div>
                <h4 className="font-semibold mb-2">Add Transaction via Chat</h4>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Describe your transaction in natural language and I'll help
                  you add it.
                </p>
                <div className="bg-muted p-3 rounded-lg text-left text-sm space-y-2">
                  <p className="font-medium">Examples:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• "Yesterday gas 500"</li>
                    <li>• "Spent $50 on groceries"</li>
                    <li>• "Coffee $5 this morning"</li>
                  </ul>
                </div>
              </div>
            ) : (
              <TransactionChatMessages
                messages={messages}
                isLoading={isLoading}
                budgets={budgets}
                onTransactionSuccess={handleTransactionSuccess}
                onTransactionError={handleTransactionError}
              />
            )}
          </div>

          {/* Input */}
          <div className="bg-background flex-shrink-0 border-t border-border px-4 pb-2 pt-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your transaction..."
                disabled={isLoading}
                className="flex-1"
              />
              {isLoading ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={stop}
                >
                  <X className="w-4 h-4" />
                </Button>
              ) : (
                <Button type="submit" size="icon" disabled={!input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
