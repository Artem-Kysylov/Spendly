"use client";

import { ChevronLeft, Pencil, Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ChatInput } from "@/components/ai-assistant/ChatInput";
import { ChatMessages } from "@/components/ai-assistant/ChatMessages";
import { ChatPresets } from "@/components/ai-assistant/ChatPresets";
import { ToneSelect } from "@/components/ai-assistant/ToneSelect";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { UserAuth } from "@/context/AuthContext";
import { useChat } from "@/hooks/useChat";
import useDeviceType from "@/hooks/useDeviceType";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabaseClient";
import { useUIStore } from "@/store/ui-store";
import LimitReachedModal from "@/components/modals/LimitReachedModal";

export default function AIAssistantPage() {
  const {
    messages,
    isTyping,
    sendMessage,
    abort,
    confirmAction,
    hasPendingAction,
    pendingActionPayload,
    assistantTone,
    setAssistantTone,
    isRateLimited,
    isLimitModalOpen,
    limitModalMessage,
    closeLimitModal,
    currentSessionId,
    loadSessionMessages,
    newChat,
    deleteSession,
  } = useChat();
  const tAI = useTranslations("assistant");
  const tChat = useTranslations("chat");
  const { isDesktop } = useDeviceType();
  const { subscriptionPlan } = useSubscription();
  const isFree = subscriptionPlan === "free";
  const { session } = UserAuth();
  const [budgets, setBudgets] = useState<
    Array<{ id: string; name: string; emoji?: string; type: "expense" | "income" }>
  >([]);
  const [sessions, setSessions] = useState<
    Array<{ id: string; title: string | null; created_at: string }>
  >([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { isTabBarVisible } = useUIStore();

  useEffect(() => {
    async function fetchBudgets() {
      const userId = session?.user?.id;
      if (!userId) return;
      const { data, error } = await supabase
        .from("budget_folders")
        .select("id, name, emoji, type")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (!error && Array.isArray(data)) setBudgets(data);
    }

    fetchBudgets();
  }, [session?.user?.id]);

  const refreshSessions = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    const { data, error } = await supabase
      .from("ai_chat_sessions")
      .select("id, title, created_at, user_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const remote = Array.isArray(data) ? data : [];
    let local: Array<{
      id: string;
      title: string | null;
      created_at: string;
      user_id?: string;
    }> = [];
    try {
      const raw = window.localStorage.getItem("spendly:ai_sessions") || "[]";
      const arr = JSON.parse(raw) as any[];
      local = arr.filter((s) => s?.user_id === userId);
    } catch { }
    const merged = [...local, ...remote]
      .map((s) => ({
        id: String(s.id),
        title: (s.title ?? null) as string | null,
        created_at: String(s.created_at),
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    const unique = Array.from(new Map(merged.map((s) => [s.id, s])).values());
    setSessions(unique);
    if (error) {
      console.warn("Failed to load sessions", error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    const onCreated = () => refreshSessions();
    const onUpdated = () => refreshSessions();
    window.addEventListener("ai:sessionCreated", onCreated);
    window.addEventListener("ai:sessionUpdated", onUpdated);
    return () => {
      window.removeEventListener("ai:sessionCreated", onCreated);
      window.removeEventListener("ai:sessionUpdated", onUpdated);
    };
  }, [refreshSessions]);

  const HistoryPane = (
    <div className="border border-border rounded-lg bg-card h-full min-h-0 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{tAI("history.title")}</h2>
          {isDesktop && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary text-white"
              onClick={() => {
                newChat();
              }}
            >
              <Pencil size={14} />
              {tAI("buttons.newChat")}
            </button>
          )}
        </div>
      </div>

      {/* Прокрутка списка — занимает всё доступное пространство */}
      <div className="flex-1 min-h-0 px-2 py-2 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="text-muted-foreground px-2">
            {tAI("history.empty")}
          </div>
        ) : (
          <ul className="space-y-1">
            {sessions.map((s) => {
              const title = s.title?.trim() || tAI("history.untitled");
              const date = new Date(s.created_at);
              const label = new Intl.DateTimeFormat(undefined, {
                month: "short",
                day: "numeric",
              }).format(date);
              const isActive = currentSessionId === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`relative w-full max-w-full overflow-hidden rounded-md border bg-card transition-colors text-left ${isActive ? "border-primary/30" : "border-border hover:bg-muted/40"}`}
                    onClick={() => {
                      loadSessionMessages(s.id);
                      setHistoryOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium truncate">
                          {title}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {label}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteSession(s.id);
                        }}
                        title={tAI("buttons.delete") ?? "Delete"}
                        aria-label={tAI("buttons.delete") ?? "Delete"}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Удалено: мобильная большая кнопка New chat внизу */}
    </div>
  );

  const ChatPane = (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* 2. Header (Tone Selector, etc.) - Fixed at top */}
      {!isDesktop && (
        <div className="flex-none px-4 py-2 border-b bg-background z-10 flex items-center justify-between">
          <button
            type="button"
            className="flex items-center text-primary"
            aria-label={tAI("history.title")}
            onClick={() => setHistoryOpen(true)}
          >
            <ChevronLeft className="h-6 w-6 text-primary" />
          </button>
          <ToneSelect
            value={isFree ? "neutral" : assistantTone}
            onChange={(tone) => {
              if (isFree) return;
              void setAssistantTone(tone);
            }}
            disabled={isTyping || isFree}
            aria-label={tAI("tone.label")}
            className="w-[180px] text-[16px]"
          />
        </div>
      )}

      {/* Rate Limit Warning */}
      {isRateLimited && (
        <div className="flex-none px-4 py-2 text-xs text-amber-700 bg-amber-50 border-t border-b border-amber-200 dark:text-amber-100 dark:bg-amber-900 dark:border-amber-800">
          {tAI("rateLimited")}
        </div>
      )}

      {/* 3. Messages Area (The Scrollable Part) */}
      {/* flex-1: Fills space. overflow-y-auto: Scrolls internally. min-h-0: Fixes flex nesting bugs. */}
      {messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto min-h-0 w-full scroll-smooth">
          <div className="flex flex-col items-center justify-center min-h-full px-4 py-8">
            <div className="w-full max-w-[560px]">
              <div className="text-center mb-4">
                <div className="text-3xl mb-3">✨</div>
                <h4 className="font-semibold mb-2">{tAI("welcomeTitle")}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tAI("welcomeDesc")}
                </p>
                <div className="mt-4 border border-dashed border-white/10 bg-white/5 rounded-xl p-4 text-center">
                  <div className="font-semibold mb-2">
                    {tChat("empty_state.quick_add_title")}
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
            </div>
            <ChatPresets onSelectPreset={sendMessage} />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 w-full scroll-smooth">
          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            onSuggestionClick={sendMessage}
            budgets={budgets}
          />
        </div>
      )}

      {/* 4. Input Area (Pinned to Bottom) */}
      <div
        className={`flex-none z-20 bg-background border-t border-border transition-[padding] duration-200 ${isTabBarVisible && !isDesktop
          ? "pb-[calc(env(safe-area-inset-bottom)+84px)]"
          : "pb-[env(safe-area-inset-bottom)]"
          }`}
      >
        {hasPendingAction && !isTyping && (
          <div className="px-4 pt-3">
            <div className="text-sm font-semibold text-secondary-black dark:text-white mb-1">
              {tAI("confirm.title")}
            </div>
            {pendingActionPayload && (
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                {pendingActionPayload.title && (
                  <>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        {tAI("confirm.fields.title")}:
                      </span>{" "}
                      {pendingActionPayload.title}
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        {tAI("confirm.fields.budget")}:
                      </span>{" "}
                      {pendingActionPayload.budget_name}
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        {tAI("confirm.fields.amount")}:
                      </span>{" "}
                      {String(pendingActionPayload.amount ?? "")}
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center justify-center gap-2 pb-2">
              <button
                type="button"
                className="px-3 py-1 rounded bg-green-600 text-white text-sm"
                onClick={() => void confirmAction(true)}
              >
                {tAI("actions.accept")}
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-700 text-secondary-black dark:text-white text-sm"
                onClick={() => void confirmAction(false)}
              >
                {tAI("actions.decline")}
              </button>
            </div>
          </div>
        )}
        <div className="pt-2 px-2 pb-2">
          <ChatInput
            onSendMessage={async (text) => {
              const trimmed = (text || "").trim();
              const yes = /^(yes|y|да|ага)$/i;
              const no = /^(no|n|нет|неа)$/i;
              if (hasPendingAction && yes.test(trimmed)) {
                await confirmAction(true);
                return;
              }
              if (hasPendingAction && no.test(trimmed)) {
                await confirmAction(false);
                return;
              }
              await sendMessage(text);
            }}
            isThinking={isTyping}
            onAbort={abort}
            assistantTone={assistantTone}
            onToneChange={setAssistantTone}
            showTone={isDesktop}
            showChips={isDesktop && messages.length > 0}
          />
        </div>
      </div>
    </div>
  );

  // Основной рендер страницы: сетка на десктопе, мобильная история через Sheet
  return (
    <>
      <div className="relative h-full w-full md:grid md:grid-cols-[320px_1fr] md:gap-3 md:p-3 overflow-hidden">
      {isDesktop ? (
        <>
          {HistoryPane}
          {ChatPane}
        </>
      ) : (
        <>
          {ChatPane}
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetContent side="left" className="p-0 w-[90vw] sm:w-[400px]">
              <div className="h-full min-h-0 flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <button
                    type="button"
                    className="flex items-center text-primary"
                    onClick={() => setHistoryOpen(false)}
                    aria-label={tAI("history.title")}
                  >
                    <ChevronLeft className="h-6 w-6 text-primary -scale-x-100" />
                  </button>
                  <button
                    type="button"
                    className="flex items-center text-primary"
                    onClick={() => {
                      newChat();
                      setHistoryOpen(false);
                    }}
                    aria-label={tAI("buttons.newChat")}
                    title={tAI("buttons.newChat") ?? "New chat"}
                  >
                    <Pencil className="h-6 w-6 text-primary" />
                  </button>
                </div>
                {/* История тянется на всю высоту шторки */}
                <div className="flex-1 min-h-0 p-3">{HistoryPane}</div>
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
      </div>

      <LimitReachedModal
        isOpen={isLimitModalOpen}
        onClose={closeLimitModal}
        limitType="custom"
        customMessage={limitModalMessage || tAI("rateLimited")}
      />
    </>
  );
}
