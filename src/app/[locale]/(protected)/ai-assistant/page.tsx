"use client";

import { useChat } from "@/hooks/useChat";
import { ChatMessages } from "@/components/ai-assistant/ChatMessages";
import { ChatInput } from "@/components/ai-assistant/ChatInput";
import { ChatPresets } from "@/components/ai-assistant/ChatPresets";
import { PresetChipsRow } from "@/components/ai-assistant/PresetChipsRow";
import { useTranslations } from "next-intl";
import useDeviceType from "@/hooks/useDeviceType";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState, useCallback } from "react";
import { UserAuth } from "@/context/AuthContext";
import { Trash } from "lucide-react";
import { ToneSelect } from "@/components/ai-assistant/ToneSelect";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ChevronLeft, Pencil } from "lucide-react";
import { useBudgets } from "@/hooks/useBudgets";
import { useUIStore } from "@/store/ui-store";

export default function AIAssistantPage() {
  const {
    messages,
    isTyping,
    sendMessage,
    abort,
    assistantTone,
    setAssistantTone,
    hasPendingAction,
    isRateLimited,
    currentSessionId,
    loadSessionMessages,
    newChat,
    deleteSession,
    pendingActionPayload,
    confirmAction,
  } = useChat();
  const tAI = useTranslations("assistant");
  const t = useTranslations();
  const { isDesktop } = useDeviceType();
  const { session } = UserAuth();
  const [sessions, setSessions] = useState<
    Array<{ id: string; title: string | null; created_at: string }>
  >([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { budgets } = useBudgets();
  const { isTabBarVisible } = useUIStore();

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
                  <div
                    className={`relative w-full max-w-full overflow-hidden rounded-md border bg-card transition-colors ${isActive ? "border-primary/30" : "border-border hover:bg-muted/40"}`}
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
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-error hover:bg-red-50"
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
                  </div>
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
    <div
      className={`h-[100dvh] flex flex-col min-h-0 overflow-x-hidden min-w-0 md:h-full`}
    >
      {!isDesktop && (
        <div className="sticky top-0 z-20 px-0 pt-2 pb-2 border-b border-border bg-background flex items-center justify-between w-full">
          <button
            className="flex items-center text-primary"
            aria-label={tAI("history.title")}
            onClick={() => setHistoryOpen(true)}
          >
            <ChevronLeft className="h-6 w-6 text-primary" />
          </button>
          <ToneSelect
            value={assistantTone}
            onChange={(tone) => setAssistantTone(tone)}
            disabled={isTyping}
            aria-label={tAI("tone.label")}
            className="w-[180px] text-[16px]"
          />
        </div>
      )}
      {/* Контент */}
      {isRateLimited && (
        <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-t border-b border-amber-200 dark:text-amber-100 dark:bg-amber-900 dark:border-amber-800">
          {tAI("rateLimited")}
        </div>
      )}
      {messages.length === 0 ? (
        <div className="flex-1 min-h-0 overflow-y-auto w-full">
          <div className="flex flex-col items-center justify-center min-h-full px-4 py-8">
            <div className="w-full max-w-[560px]">
              <div className="text-center mb-4">
                <div className="text-3xl mb-3">✨</div>
                <h4 className="font-semibold mb-2">{tAI("welcomeTitle")}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tAI("welcomeDesc")}
                </p>
                <div className="mt-4 px-4 py-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    💡 {tAI("tipAddTransaction")}
                  </p>
                </div>
              </div>
            </div>
            <ChatPresets onSelectPreset={sendMessage} />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 min-w-0 flex flex-col">
          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            pendingAction={pendingActionPayload as any}
            budgets={budgets}
            onConfirmAction={confirmAction}
          />
        </div>
      )}
      {/* Инпут: обычный поток внизу контейнера, без sticky */}
      {/* Инпут: обычный поток внизу контейнера, sticky bottom-0, с минимальным отступом снизу */}
      {/* Инпут: обычный поток внизу контейнера, sticky bottom-0, с минимальным отступом снизу */}
      <div
        className={`shrink-0 z-10 bg-background border-t border-border md:pb-0 transition-[padding] duration-200 ${isTabBarVisible && !isDesktop
            ? "pb-[calc(env(safe-area-inset-bottom)+64px)]"
            : "pb-[env(safe-area-inset-bottom)]"
          }`}
      >
        <div className="pt-2 px-2">
          <ChatInput
            onSendMessage={sendMessage}
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
    <div className="h-full w-full md:grid md:grid-cols-[320px_1fr] md:gap-3 p-3 overflow-x-hidden">
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
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <button
                    className="flex items-center text-primary"
                    onClick={() => setHistoryOpen(false)}
                    aria-label={tAI("history.title")}
                  >
                    <ChevronLeft className="h-6 w-6 text-primary -scale-x-100" />
                  </button>
                  <button
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
                <div className="flex-1 p-3">{HistoryPane}</div>
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}