"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ChatMessage, UseChatReturn } from "@/types/types";
import { UserAuth } from "@/context/AuthContext";
import { useTranslations, useLocale } from "next-intl";
import { getAssistantApiUrl } from "@/lib/assistantApi";
import {
  localizeEmptyWeekly,
  localizeEmptyMonthly,
  localizeEmptyGeneric,
  periodLabel as canonicalPeriodLabel,
} from "@/prompts/spendlyPal/canonicalPhrases";
import { parseTransactionLocally } from "@/lib/parseTransactionLocally";
// import { trackEvent } from "@/lib/telemetry";
import { supabase } from "@/lib/supabaseClient";
import type { AIResponse, AssistantTone, Period } from "@/types/ai";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/components/ui/use-toast";

type PendingAction =
  | {
    type: "add_transaction";
    payload: {
      title: string;
      amount: number;
      budget_folder_id: string | null;
      budget_name: string;
    };
  }
  | {
    type: "save_recurring_rule";
    payload: {
      title_pattern: string;
      budget_folder_id: string | null;
      avg_amount: number;
      cadence: "weekly" | "monthly";
      next_due_date: string;
    };
  };

// JSON‑ответ ассистента: либо стандартный AIResponse (action/message), либо «канонический» контракт при обходе LLM
type AssistantJSON =
  | AIResponse
  | {
    intent: string;
    period?: string;
    currency?: string;
    totals?: Record<string, unknown>;
    breakdown?: Array<{
      name?: string;
      title?: string;
      category?: string;
      amount?: number | string;
    }>;
    topExpenses?: Array<{
      title?: string;
      name?: string;
      category?: string;
      amount?: number | string;
      date?: string;
    }>;
    text?: string;
    shouldRefetch?: boolean;
  };

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uiCurrency, setUICurrency] = useState<string>("USD");

  const { session } = UserAuth();
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);

  const tAssistant = useTranslations("assistant");
  const locale = useLocale();
  const { subscriptionPlan } = useSubscription();
  const { toast } = useToast();
  const PRESET_CACHE_TTL_MS = 45000;
  const presetPrompts = useMemo(() => [
    tAssistant("presets.showWeek"),
    tAssistant("presets.saveMoney"),
    tAssistant("presets.analyzePatterns"),
    tAssistant("presets.createBudgetPlan"),
    tAssistant("presets.showBiggest"),
    tAssistant("presets.compareMonths"),
  ], [tAssistant]);
  const isPresetMessage = useCallback((text: string) => {
    const s = (text || "").trim();
    return presetPrompts.includes(s);
  }, [presetPrompts]);
  const readPresetCache = (): Record<string, { ts: number; text: string }> => {
    try {
      const raw = window.localStorage.getItem("spendly:ai_preset_cache") || "{}";
      const obj = JSON.parse(raw);
      return typeof obj === "object" && obj ? obj : {};
    } catch { return {}; }
  };
  const writePresetCache = (prompt: string, text: string) => {
    try {
      const cache = readPresetCache();
      cache[prompt] = { ts: Date.now(), text };
      window.localStorage.setItem("spendly:ai_preset_cache", JSON.stringify(cache));
    } catch { }
  };
  const getCachedPreset = (prompt: string): string | null => {
    const cache = readPresetCache();
    const entry = cache[prompt];
    if (!entry) return null;
    if (Date.now() - entry.ts > PRESET_CACHE_TTL_MS) return null;
    return entry.text;
  };
  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  // Сниппет из первого сообщения для заголовка (как ChatGPT)
  const deriveTitle = useCallback(
    (text: string): string => {
      const cleaned = (text || "").replace(/\s+/g, " ").trim();
      if (!cleaned) return tAssistant("history.untitled");
      const sentenceEnd = cleaned.search(/[.!?]/);
      const base =
        sentenceEnd !== -1 ? cleaned.slice(0, sentenceEnd + 1) : cleaned;
      const max = 80;
      return base.length > max ? base.slice(0, max).trim() + "…" : base;
    },
    [tAssistant],
  );
  const [assistantTone, setAssistantToneState] =
    useState<AssistantTone>("neutral");
  const persistTimer = useRef<number | null>(null);
  const skipNextLoadRef = useRef(false);

  useEffect(() => {
    const initTone = async () => {
      try {
        const user = session?.user;
        const tone = (user?.user_metadata as any)?.assistant_tone as
          | AssistantTone
          | undefined;
        if (subscriptionPlan === "free") {
          setAssistantToneState("neutral");
        } else if (tone) {
          setAssistantToneState(tone);
        }
      } catch {
        // no-op
      }
    };
    initTone();
  }, [session?.user, subscriptionPlan]);

  const setAssistantTone = useCallback(
    async (tone: AssistantTone) => {
      if (subscriptionPlan === "free") {
        setAssistantToneState("neutral");
        return;
      }
      setAssistantToneState(tone);
      if (persistTimer.current) {
        window.clearTimeout(persistTimer.current);
      }
      persistTimer.current = window.setTimeout(async () => {
        try {
          await supabase.auth.updateUser({ data: { assistant_tone: tone } });
        } catch (e) {
          console.warn("Failed to persist tone", e);
        }
      }, 400);
    },
    [subscriptionPlan],
  );

  // ID текущей AI‑сессии (Supabase или локальная)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // ФОЛБЭК: локальное сохранение сообщения — объявлено раньше persistMessage
  const persistLocalMessage = useCallback(
    (role: "user" | "assistant", content: string, sid: string) => {
      try {
        const key = `spendly:ai_messages:${sid}`;
        const raw = window.localStorage.getItem(key) || "[]";
        const arr = JSON.parse(raw) as any[];
        arr.push({
          id: Date.now().toString(),
          content,
          role,
          created_at: new Date().toISOString(),
        });
        window.localStorage.setItem(key, JSON.stringify(arr));
        window.dispatchEvent(
          new CustomEvent("ai:sessionUpdated", { detail: { id: sid } }),
        );
      } catch { }
    },
    [],
  );

  // Сохранение сообщения в Supabase — для local-* пишем только в локалку
  const persistMessage = useCallback(
    async (
      role: "user" | "assistant",
      content: string,
      sessionId?: string | null,
    ) => {
      const sid = sessionId ?? currentSessionId;
      if (!sid) return;

      if (String(sid).startsWith("local-")) {
        persistLocalMessage(role, content, sid);
        return;
      }

      const { error } = await supabase.from("ai_chat_messages").insert({
        session_id: sid,
        role,
        content,
        tool_calls: null,
      });
      if (error) {
        console.warn("Failed to insert ai_chat_message", error);
        persistLocalMessage(role, content, sid);
      } else {
        // trackEvent("ai_message_sent", { role, sessionId: sid });
        window.dispatchEvent(
          new CustomEvent("ai:sessionUpdated", { detail: { id: sid } }),
        );
      }
    },
    [currentSessionId, persistLocalMessage],
  );

  // Загрузка сообщений для сессии
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    // КРИТИЧЕСКОЕ: фиксируем выбранную сессию,
    // чтобы sendMessage не создавал новую
    setCurrentSessionId(sessionId);

    if (String(sessionId).startsWith("local-")) {
      try {
        const raw =
          window.localStorage.getItem(`spendly:ai_messages:${sessionId}`) ||
          "[]";
        const arr = JSON.parse(raw) as Array<{
          id: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string;
        }>;
        const msgs: ChatMessage[] = arr.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.created_at ? new Date(m.created_at) : new Date(),
        }));
        setMessages(msgs);
      } catch {
        setMessages([]);
      }
      return;
    }

    const { data, error } = await supabase
      .from("ai_chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (error) {
      console.warn("Failed to load messages for session", error);
      setMessages([]);
      return;
    }
    const msgs: ChatMessage[] = (data || []).map((r: any) => ({
      id: r.id || Date.now().toString(),
      role: r.role,
      content: r.content,
      timestamp: new Date(r.created_at),
    }));
    setMessages(msgs);
  }, []);

  useEffect(() => {
    if (!currentSessionId) return;
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }
    void loadSessionMessages(currentSessionId);
  }, [currentSessionId, loadSessionMessages]);

  // Авто‑титул: короткий заголовок 3–4 слова
  const generateAutoTitle = useCallback(
    async (firstMessage: string, sid: string) => {
      try {
        const res = await fetch(getAssistantApiUrl(locale), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session?.user?.id,
            isPro: subscriptionPlan === "pro",
            enableLimits: true,
            message: `Generate a concise 3-4 word title for this conversation based on: ${firstMessage}`,
          }),
        });
        const ct = res.headers.get("content-type") || "";
        if (res.ok && ct.includes("application/json")) {
          const json = (await res.json().catch(() => null)) as any;
          const title: string | undefined =
            json?.kind === "message" && typeof json?.message === "string"
              ? json.message
              : typeof json === "string"
                ? json
                : undefined;
          const finalTitle = title?.trim().slice(0, 80) || null;
          if (finalTitle) {
            if (String(sid).startsWith("local-")) {
              try {
                const raw =
                  window.localStorage.getItem("spendly:ai_sessions") || "[]";
                const arr = JSON.parse(raw) as any[];
                const idx = arr.findIndex((s: any) => s.id === sid);
                if (idx >= 0) {
                  arr[idx].title = finalTitle;
                  window.localStorage.setItem(
                    "spendly:ai_sessions",
                    JSON.stringify(arr),
                  );
                }
                window.dispatchEvent(
                  new CustomEvent("ai:sessionUpdated", { detail: { id: sid } }),
                );
              } catch { }
            } else {
              await supabase
                .from("ai_chat_sessions")
                .update({ title: finalTitle })
                .eq("id", sid);
              // trackEvent("ai_title_generated", { sessionId: sid });
              window.dispatchEvent(
                new CustomEvent("ai:sessionUpdated", { detail: { id: sid } }),
              );
            }
          }
        }
      } catch (e) {
        console.warn("Auto-title failed", e);
      }
    },
    [locale, session?.user?.id, subscriptionPlan],
  );

  const saveLocalSession = useCallback(
    (firstMessage: string) => {
      const sid = `local-${Date.now()}`;
      skipNextLoadRef.current = true;
      setCurrentSessionId(sid);
      try {
        const raw = window.localStorage.getItem("spendly:ai_sessions") || "[]";
        const arr = JSON.parse(raw) as any[];
        arr.unshift({
          id: sid,
          // Было: title: null
          title: deriveTitle(firstMessage) || tAssistant("history.untitled"),
          created_at: new Date().toISOString(),
          user_id: session?.user?.id || "unknown",
        });
        window.localStorage.setItem("spendly:ai_sessions", JSON.stringify(arr));
        window.dispatchEvent(
          new CustomEvent("ai:sessionCreated", { detail: { id: sid } }),
        );
      } catch { }
      void generateAutoTitle(firstMessage, sid);
      // trackEvent("ai_session_created", { sessionId: sid });
      return sid;
    },
    [session?.user?.id, generateAutoTitle, deriveTitle, tAssistant],
  );

  const createSessionIfNeeded = useCallback(
    async (firstMessage: string) => {
      if (currentSessionId || !session?.user?.id) return currentSessionId;
      const initialTitle =
        deriveTitle(firstMessage) || tAssistant("history.untitled");
      const { data, error } = await supabase
        .from("ai_chat_sessions")
        // Было: title: tAssistant('history.untitled')
        .insert({ user_id: session.user.id, title: initialTitle })
        .select("id")
        .single();
      if (error || !data?.id) {
        console.warn("Failed to create ai_chat_session", error);
        return saveLocalSession(firstMessage);
      }
      const sessionId = data.id as string;
      skipNextLoadRef.current = true;
      setCurrentSessionId(sessionId);
      void generateAutoTitle(firstMessage, sessionId);
      // trackEvent("ai_session_created", { sessionId });
      window.dispatchEvent(
        new CustomEvent("ai:sessionCreated", { detail: { id: sessionId } }),
      );
      return sessionId;
    },
    [
      currentSessionId,
      session?.user?.id,
      saveLocalSession,
      generateAutoTitle,
      deriveTitle,
      tAssistant,
    ],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      // trackEvent("ai_request_used");

      const isTransactionLike = /\d/.test(content) && /[\p{L}]/u.test(content);
      const transactionFallback = tAssistant("transactionFallback");

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content,
        role: "user",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      if (!session?.user?.id) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: "Please sign in to use the assistant.",
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        setIsTyping(false);
        return;
      }

      const sid = await createSessionIfNeeded(content);
      await persistMessage("user", content, sid);

      const localParse = parseTransactionLocally(content, locale);
      if (localParse.success && (localParse.transactions?.length || localParse.transaction)) {
        const transactions =
          localParse.transactions && localParse.transactions.length > 0
            ? localParse.transactions
            : localParse.transaction
              ? [localParse.transaction]
              : [];

        if (transactions.length === 0) {
          // Fall through to server call
        } else {
        let finalTransactions = transactions;
        try {
          const normalizeTitle = (s: string) =>
            String(s || "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, " ");

          const { data: recent, error: recentErr } = await supabase
            .from("transactions")
            .select(
              `
              title,
              budget_folders (
                name
              )
            `,
            )
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(50);

          if (!recentErr && recent && recent.length > 0) {
            const pairs = recent
              .map((r) => ({
                title: normalizeTitle((r as any).title),
                category: (r as any).budget_folders?.name as string | undefined,
              }))
              .filter((p) => p.title && p.category);

            finalTransactions = transactions.map((tx) => {
              const txTitle = normalizeTitle(tx.title);
              const match = pairs.find(
                (p) => p.title === txTitle || p.title.includes(txTitle) || txTitle.includes(p.title),
              );
              return match?.category
                ? { ...tx, category_name: match.category }
                : tx;
            });
          }
        } catch (e) {
          console.warn("Smart category lookup failed:", e);
        }

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: "",
          role: "assistant",
          timestamp: new Date(),
          toolInvocations: [
            {
              toolCallId: `local-${Date.now()}`,
              toolName: "propose_transaction",
              args: { transactions: finalTransactions },
              state: "result",
              result: { success: true, transactions: finalTransactions },
            },
          ],
        };
        setMessages((prev) => [...prev, aiMessage]);
        setIsTyping(false);
        setAbortController(null);
        return;
        }
      }

      const controller = new AbortController();
      setAbortController(controller);

      const cachedText = isPresetMessage(content) ? getCachedPreset(content) : null;
      if (cachedText) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: cachedText,
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        await persistMessage("assistant", cachedText, sid);
        setIsTyping(false);
        setAbortController(null);
        return;
      }

      let timeoutId: number | null = null;
      let didTimeout = false;
      let streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      try {
        timeoutId = window.setTimeout(() => {
          didTimeout = true;
          try {
            streamReader?.cancel();
          } catch { }
          controller.abort();
        }, 45000);

        const apiUrl = getAssistantApiUrl(locale);
        console.log("ASSISTANT_API_URL:", apiUrl);
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            isPro: subscriptionPlan === "pro",
            enableLimits: true,
            message: content,
            tone: subscriptionPlan === "pro" ? assistantTone : "neutral",
            locale,
          }),
          signal: controller.signal,
        });

        const contentType = response.headers.get("content-type") || "";
        const headerCurrency = response.headers.get("X-Currency") || "";
        if (headerCurrency) setUICurrency(headerCurrency);

        console.log(
          "ASSISTANT_API_STATUS:",
          response.status,
          response.ok,
          contentType,
        );

        if (!response.ok) {
          if (contentType.includes("text/html") || response.status === 404) {
            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              content:
                "Assistant endpoint is not reachable for this locale. Please reload the page or try again.",
              role: "assistant",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
            return;
          }
        }

        if (response.status === 429) {
          // trackEvent("ai_limit_hit");
          const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
          const cooldownMs =
            Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 3000;
          setRateLimitedUntil(Date.now() + cooldownMs);

          const baseMsg = tAssistant("rateLimited");
          const msg =
            retryAfter > 0 ? `${baseMsg} (${retryAfter}s)` : baseMsg;

          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: msg,
            role: "assistant",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          return;
        }
        if (response.status === 401) {
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: "Please sign in to use the assistant.",
            role: "assistant",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          return;
        }

        if (response.status === 503) {
          let msg = isTransactionLike
            ? transactionFallback
            : "Assistant is temporarily unavailable. Please try again later.";
          try {
            const json = (await response.json().catch(() => null)) as any;
            if (json && typeof json.message === "string") msg = json.message;
          } catch { }
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: msg,
            role: "assistant",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          return;
        }
        if (response.status >= 500) {
          let msg = isTransactionLike
            ? transactionFallback
            : "Assistant encountered an error. Please try again later.";
          try {
            const json = (await response.json().catch(() => null)) as any;
            if (json && typeof json.error === "string") msg = json.error;
            else if (json && typeof json.message === "string") msg = json.message;
          } catch { }
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: msg,
            role: "assistant",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          return;
        }

        if (contentType.includes("application/json")) {
          const json = (await response.json()) as AssistantJSON;
          console.log("ASSISTANT_API_JSON_KIND:", (json as any)?.kind || "(none)");
          if ("kind" in json) {
            if (json.kind === "action") {
              const confirmText = json.confirmText;
              const action = json.action as PendingAction;
              if (action.type === "add_transaction") {
                setPendingAction(null);
                const today = new Date().toISOString().split("T")[0];
                const computeIsoWithOffset = (offsetDays: number) => {
                  const d = new Date();
                  d.setDate(d.getDate() + offsetDays);
                  return d.toISOString().split("T")[0];
                };

                const contentLower = String(content || "").toLowerCase();
                const localeKey = String(locale || "en")
                  .split("-")[0]
                  .toLowerCase();

                const includesAny = (tokens: string[]) =>
                  tokens.some((t) => t && contentLower.includes(t));

                const relativeTokens: Record<
                  string,
                  { today: string[]; yesterday: string[]; tomorrow: string[] }
                > = {
                  en: { today: ["today"], yesterday: ["yesterday"], tomorrow: ["tomorrow"] },
                  ru: { today: ["сегодня"], yesterday: ["вчера"], tomorrow: ["завтра"] },
                  uk: { today: ["сьогодні"], yesterday: ["вчора"], tomorrow: ["завтра"] },
                  ja: { today: ["今日"], yesterday: ["昨日"], tomorrow: ["明日"] },
                  id: { today: ["hari ini"], yesterday: ["kemarin"], tomorrow: ["besok"] },
                  hi: { today: ["आज"], yesterday: [], tomorrow: [] },
                  ko: { today: ["오늘"], yesterday: ["어제"], tomorrow: ["내일"] },
                };

                const tokens = relativeTokens[localeKey] || relativeTokens.en;
                const dateFromContent = includesAny(tokens.yesterday)
                  ? computeIsoWithOffset(-1)
                  : includesAny(tokens.tomorrow)
                    ? computeIsoWithOffset(1)
                    : includesAny(tokens.today)
                      ? computeIsoWithOffset(0)
                      : null;

                const dateFromAction =
                  typeof (action as any)?.payload?.date === "string"
                    ? ((action as any).payload.date as string)
                    : null;

                const finalDate = dateFromContent || dateFromAction || today;
                const proposal = {
                  title: action.payload.title,
                  amount: action.payload.amount,
                  type: "expense",
                  category_name: action.payload.budget_name,
                  date: finalDate,
                };

                const aiMessage: ChatMessage = {
                  id: (Date.now() + 1).toString(),
                  content: "",
                  role: "assistant",
                  timestamp: new Date(),
                  toolInvocations: [
                    {
                      toolCallId: `assistant-${Date.now()}`,
                      toolName: "propose_transaction",
                      args: proposal,
                      state: "result",
                      result: { success: true, transactions: [proposal] },
                    },
                  ],
                };
                setMessages((prev) => [...prev, aiMessage]);
                await persistMessage("assistant", confirmText, sid);
              } else {
                setPendingAction(action);
                const aiMessage: ChatMessage = {
                  id: (Date.now() + 1).toString(),
                  content: confirmText,
                  role: "assistant",
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, aiMessage]);
              }
            } else if (json.kind === "message") {
              const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                content: json.message,
                role: "assistant",
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, aiMessage]);
              await persistMessage("assistant", json.message, sid);
              if (isPresetMessage(content)) writePresetCache(content, json.message);
            }
            return;
          }

          // Канонический JSON‑контракт (bypass LLM)
          if (json && typeof json.intent === "string") {
            const respLocale = response.headers.get("X-Locale") || "en-US";
            const respCurrencyHeader = response.headers.get("X-Currency") || "";
            const currency =
              typeof json.currency === "string"
                ? json.currency
                : respCurrencyHeader || "USD";
            setUICurrency(currency);

            const nf = new Intl.NumberFormat(respLocale, {
              style: "currency",
              currency,
            });
            const df = new Intl.DateTimeFormat(respLocale, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            const isRu = respLocale.toLowerCase().startsWith("ru");
            const L = (en: string, ru: string) => (isRu ? ru : en);

            const periodRaw =
              typeof json.period === "string" ? json.period : "unknown";
            const period: Period =
              periodRaw === "thisWeek" ||
                periodRaw === "lastWeek" ||
                periodRaw === "thisMonth" ||
                periodRaw === "lastMonth"
                ? (periodRaw as Period)
                : "unknown";
            const periodLabel = canonicalPeriodLabel(period, respLocale);
            let lines: string[] = [];

            const title = L("Weekly summary", "Еженедельная сводка");
            lines.push(`${title}: ${periodLabel}`);

            const totals = json.totals || {};
            const totalExpenses =
              typeof (totals as any)?.expenses === "number"
                ? (totals as any).expenses
                : Number((totals as any)?.expenses || 0);
            if (Number.isFinite(totalExpenses)) {
              lines.push(
                `${L("Total expenses", "Итого расходы")}: ${nf.format(totalExpenses)}`,
              );
            }

            const breakdown = Array.isArray(json.breakdown)
              ? json.breakdown
              : [];
            if (breakdown.length > 0) {
              const topCats = breakdown
                .filter(
                  (b) =>
                    typeof b?.amount === "number" ||
                    typeof b?.amount === "string",
                )
                .slice(0, 3)
                .map((b) => {
                  const label =
                    b?.name ||
                    b?.title ||
                    b?.category ||
                    L("Category", "Категория");
                  const amt =
                    typeof b?.amount === "number"
                      ? b.amount
                      : Number(b?.amount);
                  return `${label}: ${nf.format(Number(amt))}`;
                });
              if (topCats.length > 0) {
                lines.push(`${L("Top categories", "Топ категории")}:`);
                lines.push(...topCats.map((s) => `• ${s}`));
              }
            }

            const topExpenses = Array.isArray(json.topExpenses)
              ? json.topExpenses
              : [];
            if (topExpenses.length > 0) {
              const topItems = topExpenses
                .filter(
                  (e) =>
                    typeof e?.amount === "number" ||
                    typeof e?.amount === "string",
                )
                .slice(0, 3)
                .map((e) => {
                  const label =
                    e?.title ||
                    e?.name ||
                    e?.category ||
                    L("Item", "Транзакция");
                  const amt =
                    typeof e?.amount === "number"
                      ? e.amount
                      : Number(e?.amount);
                  const dateStr = e?.date ? df.format(new Date(e.date)) : "";
                  return `${label}: ${nf.format(Number(amt))}${dateStr ? ` (${dateStr})` : ""}`;
                });
              if (topItems.length > 0) {
                lines.push(`${L("Top expenses", "Топ расходы")}:`);
                lines.push(...topItems.map((s) => `• ${s}`));
              }
            }

            if (lines.length <= 1) {
              if (period === "thisWeek") {
                lines.push(localizeEmptyWeekly("thisWeek", respLocale));
              } else if (period === "lastWeek") {
                lines.push(localizeEmptyWeekly("lastWeek", respLocale));
              } else if (period === "thisMonth") {
                lines.push(localizeEmptyMonthly("thisMonth", respLocale));
              } else if (period === "lastMonth") {
                lines.push(localizeEmptyMonthly("lastMonth", respLocale));
              } else {
                lines.push(localizeEmptyGeneric(respLocale));
              }
            }

            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              content: lines.join("\n"),
              role: "assistant",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
            await persistMessage("assistant", aiMessage.content, sid);
            return;
          }

          const fallback =
            typeof (json as any)?.message === "string"
              ? (json as any).message
              : "Unexpected server response.";
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: fallback,
            role: "assistant",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          await persistMessage("assistant", aiMessage.content, sid);
          return;
        }

        // Стриминговый ответ (LLM)
        const reader = response.body?.getReader();
        streamReader = reader ?? null;
        const decoder = new TextDecoder();
        let acc = "";

        const streamMsgId = (Date.now() + 1).toString();
        setMessages((prev) => [
          ...prev,
          {
            id: streamMsgId,
            content: "",
            role: "assistant",
            timestamp: new Date(),
          },
        ]);

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamMsgId ? { ...m, content: acc } : m,
            ),
          );
        }

        const providerEmptyMsgPattern =
          /LLM provider returned empty text candidates\./i;
        if (providerEmptyMsgPattern.test(acc)) {
          const blockedReasonMatch = acc.match(/Blocked:\s*([^.\n]+)/i);
          const reason = blockedReasonMatch?.[1]?.trim();
          const friendly = reason
            ? `Your request was blocked by the provider (${reason}). Tip: Try rephrasing your request and avoid sensitive content.`
            : "The assistant could not generate a response this time. Try rephrasing your request or reducing its complexity.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamMsgId ? { ...m, content: friendly } : m,
            ),
          );
          await persistMessage("assistant", friendly, sid);
        } else {
          await persistMessage("assistant", acc, sid);
          if (isPresetMessage(content)) writePresetCache(content, acc);
        }
      } catch (error) {
        const errName = (error as any)?.name;
        if (errName === "AbortError") {
          if (!didTimeout) return;
          const isRu = (navigator.language || "en-US")
            .toLowerCase()
            .startsWith("ru");
          const msg = isTransactionLike
            ? transactionFallback
            : isRu
              ? "Запрос занял слишком много времени. Попробуйте ещё раз."
              : "Request timed out. Please try again.";
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: msg,
            role: "assistant",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          return;
        }
        console.error("Error sending message:", error);
        const isRu = (navigator.language || "en-US").toLowerCase().startsWith("ru");
        const msg = isTransactionLike
          ? transactionFallback
          : isRu
            ? "Ассистент временно недоступен. Попробуйте повторить позже."
            : "Assistant is temporarily unavailable. Please try again later.";
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: msg,
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        setIsTyping(false);
        setAbortController(null);
      }
    },
    [
      session?.user?.id,
      assistantTone,
      locale,
      subscriptionPlan,
      createSessionIfNeeded,
      persistMessage,
      tAssistant,
    ],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  const abort = useCallback(() => {
    abortController?.abort();
    setIsTyping(false);
  }, [abortController]);

  const confirmAction = useCallback(
    async (confirm: boolean) => {
      if (!pendingAction || !session?.user?.id) return;

      // Отмена действия — как было
      if (!confirm) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: "Action cancelled.",
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        setPendingAction(null);
        await persistMessage("assistant", aiMessage.content, currentSessionId || undefined);
        return;
      }

      // Подтверждение: шлём confirm=true на /api/assistant
      try {
        const res = await fetch(getAssistantApiUrl(locale), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            isPro: subscriptionPlan === "pro",
            enableLimits: true,
            message: "confirm",
            confirm: true,
            actionType:
              pendingAction.type === "add_transaction"
                ? "add_transaction"
                : "save_recurring_rule",
            actionPayload: pendingAction.payload,
            tone: subscriptionPlan === "pro" ? assistantTone : "neutral",
            sessionId: currentSessionId || undefined,
          }),
        });

        if (res.status === 429) {
          const retryAfter = Number(res.headers.get("Retry-After") ?? "0");
          const baseMsg = tAssistant("rateLimited");
          const msg = retryAfter > 0 ? `${baseMsg} (${retryAfter}s)` : baseMsg;
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: msg,
            role: "assistant",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setPendingAction(null);
          await persistMessage("assistant", aiMessage.content, currentSessionId || undefined);
          return;
        }

        if (!res.ok) {
          let errMsg = "Failed to process action. Please try again.";
          try {
            const ctErr = res.headers.get("content-type") || "";
            if (ctErr.includes("application/json")) {
              const json = (await res.json().catch(() => null)) as any;
              if (json && typeof json.message === "string") errMsg = json.message;
              else if (json && typeof json.error === "string") errMsg = json.error;
            } else {
              const text = await res.text().catch(() => "");
              if (text && text.trim().length > 0) errMsg = text;
            }
          } catch {
            // ignore
          }

          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: errMsg,
            role: "assistant",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setPendingAction(null);
          await persistMessage(
            "assistant",
            aiMessage.content,
            currentSessionId || undefined,
          );
          return;
        }

        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const json = (await res.json()) as {
            kind?: "message";
            message?: string;
            ok?: boolean;
            shouldRefetch?: boolean;
          };
          const text = json?.message || "Action confirmed and processed.";
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: text,
            role: "assistant",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setPendingAction(null);
          await persistMessage("assistant", aiMessage.content, currentSessionId || undefined);

          if (json?.shouldRefetch) {
            window.dispatchEvent(new CustomEvent("transaction:created"));
            window.dispatchEvent(new CustomEvent("budgetTransactionAdded"));
          }
        } else {
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: "Failed to process action. Please try again.",
            role: "assistant",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setPendingAction(null);
          await persistMessage("assistant", aiMessage.content, currentSessionId || undefined);
        }
      } catch {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: "Network error while confirming the action. Please try again.",
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        setPendingAction(null);
        await persistMessage("assistant", aiMessage.content, currentSessionId || undefined);
      }
    },
    [
      pendingAction,
      session?.user?.id,
      subscriptionPlan,
      assistantTone,
      locale,
      currentSessionId,
      persistMessage,
      tAssistant,
    ],
  );

  const newChat = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(null);
    setPendingAction(null);
    setIsTyping(false);
  }, []);

  const syncLocalToCloud: () => Promise<void> = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const rawSessions =
        window.localStorage.getItem("spendly:ai_sessions") || "[]";
      const sessionsArr = JSON.parse(rawSessions) as Array<{
        id: string;
        title?: string | null;
        created_at?: string;
        user_id?: string | null;
      }>;

      const localSessions = sessionsArr.filter((s) =>
        String(s.id).startsWith("local-"),
      );
      for (const ls of localSessions) {
        // Загружаем сообщения локальной сессии заранее, чтобы взять сниппет
        const oldKey = `spendly:ai_messages:${ls.id}`;
        const rawMsgs = window.localStorage.getItem(oldKey) || "[]";
        const msgs = JSON.parse(rawMsgs) as Array<{
          role: "user" | "assistant";
          content: string;
          created_at?: string;
        }>;
        const firstUserMsg =
          msgs.find((m) => m.role === "user")?.content ??
          msgs[0]?.content ??
          "";
        const initialTitle =
          ls.title && ls.title.trim()
            ? ls.title!
            : deriveTitle(firstUserMsg) || tAssistant("history.untitled");

        // 1) Создаём серверную сессию с безопасным и полезным title
        const { data, error } = await supabase
          .from("ai_chat_sessions")
          .insert({ user_id: session.user.id, title: initialTitle })
          .select("id")
          .single();
        if (error || !data?.id) {
          console.warn("Failed to create server session during sync", error);
          continue;
        }
        const newSid = data.id as string;

        // 2) Переносим сообщения
        const rows = msgs.map((m) => ({
          session_id: newSid,
          role: m.role,
          content: m.content,
          tool_calls: null,
        }));
        if (rows.length > 0) {
          const { error: insertErr } = await supabase
            .from("ai_chat_messages")
            .insert(rows);
          if (insertErr) {
            console.warn("Failed to import messages during sync", insertErr);
          }
        }

        // 3) Обновляем локальные данные
        const newKey = `spendly:ai_messages:${newSid}`;
        window.localStorage.setItem(newKey, JSON.stringify(msgs));
        window.localStorage.removeItem(oldKey);

        const idx = sessionsArr.findIndex((s) => s.id === ls.id);
        if (idx >= 0) {
          sessionsArr[idx].id = newSid;
          sessionsArr[idx].user_id = session.user.id;
          sessionsArr[idx].title = initialTitle;
        }
        window.localStorage.setItem(
          "spendly:ai_sessions",
          JSON.stringify(sessionsArr),
        );

        // 4) Обновляем текущую сессию и UI
        setCurrentSessionId(newSid);
        // trackEvent("ai_session_created", {
        //   from: ls.id,
        //   to: newSid,
        //   synced: true,
        // });
        window.dispatchEvent(
          new CustomEvent("ai:sessionUpdated", { detail: { id: newSid } }),
        );
      }
    } catch (e) {
      console.warn("Sync failed", e);
    }
  }, [session?.user?.id, deriveTitle, tAssistant]);

  const deleteSession = useCallback(
    async (sid: string) => {
      if (!sid) return;

      try {
        if (String(sid).startsWith("local-")) {
          window.localStorage.removeItem(`spendly:ai_messages:${sid}`);
          const raw =
            window.localStorage.getItem("spendly:ai_sessions") || "[]";
          const arr = JSON.parse(raw) as Array<{ id: string }>;
          const next = arr.filter((s) => s.id !== sid);
          window.localStorage.setItem(
            "spendly:ai_sessions",
            JSON.stringify(next),
          );
        } else {
          if (!session?.user?.id) return;
          await supabase
            .from("ai_chat_messages")
            .delete()
            .eq("session_id", sid);
          await supabase.from("ai_chat_sessions").delete().eq("id", sid);
        }

        if (currentSessionId === sid) {
          setCurrentSessionId(null);
          setMessages([]);
        }

        window.dispatchEvent(
          new CustomEvent("ai:sessionUpdated", { detail: { id: sid } }),
        );
        // trackEvent("ai_session_created", { sessionId: sid, deleted: true });
      } catch (e) {
        console.warn("Failed to delete session", e);
      }
    },
    [session?.user?.id, currentSessionId],
  );

  const hasPendingAction = !!pendingAction;
  const isRateLimited = !!(rateLimitedUntil && Date.now() < rateLimitedUntil);

  // Приведение pendingAction к payload интерфейса UseChatReturn
  const pendingActionPayload = pendingAction
    ? pendingAction.type === "add_transaction"
      ? {
        title: pendingAction.payload.title,
        amount: pendingAction.payload.amount,
        budget_folder_id: pendingAction.payload.budget_folder_id,
        budget_name: pendingAction.payload.budget_name,
      }
      : {
        title_pattern: pendingAction.payload.title_pattern,
        avg_amount: pendingAction.payload.avg_amount,
        cadence: pendingAction.payload.cadence,
        next_due_date: pendingAction.payload.next_due_date,
        budget_folder_id: pendingAction.payload.budget_folder_id,
      }
    : null;

  return {
    messages,
    isOpen,
    isTyping,
    openChat,
    closeChat,
    sendMessage,
    clearMessages,
    abort,
    confirmAction,
    hasPendingAction,
    isRateLimited,
    pendingActionPayload,
    assistantTone,
    setAssistantTone,
    currency: uiCurrency,
    currentSessionId,
    loadSessionMessages,
    newChat,
    syncLocalToCloud,
    deleteSession,
  };
};
