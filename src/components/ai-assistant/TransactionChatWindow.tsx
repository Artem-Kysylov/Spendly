"use client";

import { Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { UserAuth } from "@/context/AuthContext";
import { useTransactionChat } from "@/hooks/useTransactionChat";
import { supabase } from "@/lib/supabaseClient";
import { TransactionChatMessages } from "./TransactionChatMessages";
import LimitReachedModal from "@/components/modals/LimitReachedModal";

export function TransactionChatWindow({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  type Budget = { id: string; name: string; emoji?: string; type: "expense" | "income" };
  const { session } = UserAuth();
  const { toast } = useToast();
  const tAI = useTranslations("assistant");
  const tChat = useTranslations("chat");
  const tTx = useTranslations("transactions");
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    stop,
    isRateLimited,
    isLimitModalOpen,
    limitModalMessage,
    closeLimitModal,
  } = useTransactionChat();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [currency, setCurrency] = useState<string>("USD");

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

  useEffect(() => {
    if (!isOpen) return;

    const meta = session?.user?.user_metadata;
    const metaCurrency =
      meta && typeof meta === "object"
        ? (meta as { currency_preference?: unknown }).currency_preference
        : undefined;

    if (typeof metaCurrency === "string" && metaCurrency.trim()) {
      setCurrency(metaCurrency.trim().toUpperCase());
      return;
    }

    try {
      const ls =
        typeof window !== "undefined"
          ? window.localStorage.getItem("user-currency")
          : null;
      if (ls && ls.trim()) {
        setCurrency(ls.trim().toUpperCase());
      }
    } catch {
      // ignore
    }
  }, [isOpen, session?.user?.user_metadata]);

  const handleTransactionSuccess = () => {
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
    <div className="bg-background text-foreground flex flex-col relative h-full">
      {/* Header */}
      <SheetHeader className="text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <SheetTitle id="transaction-chat-title">
            💰 {tTx("addTransaction")}
          </SheetTitle>
        </div>
        <SheetClose
          className="absolute top-2 right-2 block p-1.5 hover:bg-muted rounded-full transition-colors duration-200 touch-manipulation"
          aria-label={tAI("buttons.close")}
          onClick={onClose}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </SheetClose>
      </SheetHeader>

      {/* Chat Content */}
      <div className="flex-1 min-h-0 grid grid-rows-[1fr_auto] bg-background">
        <div className="min-h-0 overflow-y-auto">
          {isRateLimited && (
            <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-t border-b border-amber-200 dark:text-amber-100 dark:bg-amber-900 dark:border-amber-800">
              {tAI("rateLimited")}
            </div>
          )}
          {messages.length === 0 ? (
            <div className="px-4 py-6">
              <div className="border border-dashed border-white/10 bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⚡️</span>
                  <span className="font-semibold">
                    {tChat("empty_state.quick_add_title")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {tChat("empty_state.quick_add_desc")}
                </p>
                <div className="space-y-2">
                  <div className="font-mono text-sm text-muted-foreground">
                    {tChat("empty_state.quick_add_pattern")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tChat("empty_state.pattern_example")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tChat("empty_state.quick_add_footer")}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <TransactionChatMessages
              messages={messages}
              isLoading={isLoading}
              budgets={budgets}
              onTransactionSuccess={handleTransactionSuccess}
              onTransactionError={handleTransactionError}
              onSuggestionClick={(text) => setInput(text)}
              currency={currency}
            />
          )}
        </div>

        {/* Input */}
        <div className="bg-background flex-shrink-0 border-t border-border px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tAI("input.placeholder")}
              disabled={isLoading || isRateLimited}
              className="flex-1"
            />
            {isLoading ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-lg"
                onClick={stop}
              >
                <X className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 rounded-lg"
                disabled={!input.trim() || isRateLimited}
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </form>
        </div>
      </div>

      <LimitReachedModal
        isOpen={isLimitModalOpen}
        onClose={closeLimitModal}
        limitType="custom"
        customMessage={limitModalMessage || tAI("rateLimited")}
      />
    </div>
  );
}
