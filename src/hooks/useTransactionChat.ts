"use client";

import { UserAuth } from "@/context/AuthContext";
import { useState, useCallback } from "react";
import { parseTransactionLocally } from "@/lib/parseTransactionLocally";
import { supabase } from "@/lib/supabaseClient";
import { useTranslations } from "next-intl";
import { getAssistantApiUrl } from "@/lib/assistantApi";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolInvocations?: any[];
}

export interface UseTransactionChatReturn {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  error: Error | undefined;
  stop: () => void;
  isRateLimited: boolean;
  isLimitModalOpen: boolean;
  limitModalMessage?: string | null;
  closeLimitModal: () => void;
}

/**
 * Hook for transaction chat with AI
 * Custom implementation to handle streaming and tool invocations
 */
export function useTransactionChat(): UseTransactionChatReturn {
  console.log("HOOK_VERSION_FINAL_3");
  const { session } = UserAuth();
  const userId = session?.user?.id;
  const tAssistant = useTranslations("assistant");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const rawInput = input.trim();
      if (!userId || !rawInput) {
        return;
      }

      console.log("API ENDPOINT: /api/chat");

      // If a previous request is still in-flight, make sure we cancel it and reset loading.
      // This prevents any chance of the UI being stuck in a loading state.
      if (abortController) {
        abortController.abort();
      }
      setAbortController(null);
      setIsLoading(false);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: rawInput,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setError(undefined);

      const locale =
        typeof document !== "undefined" && document.documentElement.lang
          ? document.documentElement.lang.split("-")[0]
          : "en";

      const isTransactionLike = /\d/.test(rawInput) && /[\p{L}]/u.test(rawInput);
      const transactionFallback = tAssistant("transactionFallback");

      // ECONOMY MODE: Try to parse simple patterns locally first
      // Do this BEFORE enabling loading state to avoid any chance of being stuck.
      const localParse = parseTransactionLocally(rawInput, locale);
      console.log("Local Parse Result:", localParse);
      
      if (localParse.success && (localParse.transactions?.length || localParse.transaction)) {
        console.log("Local parse SUCCESS - skipping LLM");
        const transactions =
          localParse.transactions && localParse.transactions.length > 0
            ? localParse.transactions
            : localParse.transaction
              ? [localParse.transaction]
              : [];

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
            .eq("user_id", userId)
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

        try {
          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession();
          const token = currentSession?.access_token;

          if (token) {
            const consumeResp = await fetch("/api/ai/consume", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                requestType: "chat",
                promptChars: String(rawInput || "").length,
              }),
            });

            if (!consumeResp.ok) {
              setRateLimitedUntil(Date.now() + 60_000);
              setIsLimitModalOpen(true);

              let custom = "";
              try {
                const ct = consumeResp.headers.get("content-type") || "";
                if (ct.includes("application/json")) {
                  const json = (await consumeResp.json().catch(() => null)) as unknown;
                  if (json && typeof json === "object") {
                    const j = json as { message?: unknown; error?: unknown };
                    if (typeof j.message === "string") custom = j.message;
                    else if (typeof j.error === "string") custom = j.error;
                  }
                }
              } catch {
                // ignore
              }

              const msg = custom || tAssistant("rateLimited");
              setLimitModalMessage(msg);
              const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: msg,
              };
              setMessages((prev) => [...prev, aiMessage]);
              setError(new Error(msg));
              return;
            }
          }
        } catch {
          // If limiter fails, fall back to existing behavior to avoid blocking due to infra.
        }

        if (transactions.length === 0) {
          setIsLoading(true);
        } else {
        // Simple pattern detected! Skip LLM, create tool invocation directly
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "", // No text content needed, just the tool card
          toolInvocations: [
            {
              toolCallId: `local-${Date.now()}`,
              toolName: "propose_transaction",
              // UI expects a single proposal object shape (title/amount/category/date)
              args: { transactions: finalTransactions },
              state: "result",
              result: {
                success: true,
                transactions: finalTransactions,
              },
            },
          ],
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        console.log("Force Reset Loading State (local parse)");
        setIsLoading(false);
        setAbortController(null);
        return; // Skip LLM call entirely!
        }
      }

      setIsLoading(true);

      const controller = new AbortController();
      setAbortController(controller);

      let timeoutId: number | null = null;
      let didTimeout = false;
      let streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      // Complex input - send to AI
      try {
        timeoutId = window.setTimeout(() => {
          didTimeout = true;
          try {
            streamReader?.cancel();
          } catch {
            // ignore
          }
          controller.abort();
        }, 45000);

        const response = await fetch(getAssistantApiUrl(locale), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept-Language":
              typeof document !== "undefined" && document.documentElement.lang
                ? document.documentElement.lang
                : locale,
          },
          body: JSON.stringify({
            userId,
            message: rawInput,
            tone: "neutral",
            locale,
          }),
          signal: controller.signal,
        });

        const contentType = response.headers.get("content-type") || "";

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
          const cooldownMs =
            Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 3000;
          setRateLimitedUntil(Date.now() + cooldownMs);
          setIsLimitModalOpen(true);

          let custom = "";
          try {
            if (contentType.includes("application/json")) {
              const json = (await response.json().catch(() => null)) as any;
              if (json && typeof json.message === "string") custom = json.message;
              else if (json && typeof json.error === "string") custom = json.error;
            }
          } catch {
            // ignore
          }

          const baseMsg = tAssistant("rateLimited");
          const msg =
            custom || (retryAfter > 0 ? `${baseMsg} (${retryAfter}s)` : baseMsg);
          setLimitModalMessage(msg);
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: msg,
          };
          setMessages((prev) => [...prev, aiMessage]);
          setError(new Error(msg));
          return;
        }

        if (response.status === 403) {
          setRateLimitedUntil(Date.now() + 60_000);
          setIsLimitModalOpen(true);

          let custom = "";
          try {
            if (contentType.includes("application/json")) {
              const json = (await response.json().catch(() => null)) as any;
              if (json && typeof json.message === "string") custom = json.message;
              else if (json && typeof json.error === "string") custom = json.error;
            }
          } catch {
            // ignore
          }

          const msg = custom || tAssistant("rateLimited");
          setLimitModalMessage(msg);
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: msg,
          };
          setMessages((prev) => [...prev, aiMessage]);
          setError(new Error(msg));
          return;
        }

        if (response.ok && contentType.includes("application/json")) {
          const json = (await response.json().catch(() => null)) as any;
          if (json && typeof json === "object" && "kind" in json) {
            if (json.kind === "action" && json.action?.type === "add_transaction") {
              const payload = json.action.payload || {};
              const proposal = {
                title: payload.title,
                amount: payload.amount,
                type: "expense",
                category_name: payload.budget_name,
                date:
                  typeof payload.date === "string"
                    ? payload.date
                    : new Date().toISOString().split("T")[0],
              };

              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "",
                toolInvocations: [
                  {
                    toolCallId: `assistant-${Date.now()}`,
                    toolName: "propose_transaction",
                    args: { transactions: [proposal] },
                    state: "result",
                    result: { success: true, transactions: [proposal] },
                  },
                ],
              };

              setMessages((prev) => [...prev, assistantMessage]);
              return;
            }

            if (json.kind === "message" && typeof json.message === "string") {
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: json.message,
              };
              setMessages((prev) => [...prev, assistantMessage]);
              return;
            }
          }
        }

        if (!response.ok) {
          let details = "";
          try {
            const ct = response.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              const json = await response.json().catch(() => null);
              details = json ? JSON.stringify(json) : "";
            } else {
              details = await response.text().catch(() => "");
            }
          } catch {
            // ignore
          }
          throw new Error(
            `HTTP error! status: ${response.status}${details ? `, details: ${details}` : ""}`,
          );
        }

        const reader = response.body?.getReader();
        streamReader = reader ?? null;
        if (!reader) {
          const msg = isTransactionLike
            ? transactionFallback
            : locale === "ru"
              ? "Ассистент временно недоступен. Попробуйте повторить позже."
              : "Assistant is temporarily unavailable. Please try again later.";
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: msg,
          };
          setMessages((prev) => [...prev, aiMessage]);
          setError(new Error(msg));
          return;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        let currentMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "",
        };

        setMessages((prev) => [...prev, currentMessage]);

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("0:")) {
              // Text chunk - AI SDK format: 0:"text content"
              try {
                const jsonStr = line.slice(2);
                const text = JSON.parse(jsonStr);
                if (typeof text === "string") {
                  currentMessage.content += text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === currentMessage.id
                        ? { ...m, content: currentMessage.content }
                        : m,
                    ),
                  );
                }
              } catch {
                // Fallback: try old parsing method
                const text = line.slice(3, line.lastIndexOf('"'));
                currentMessage.content += text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === currentMessage.id
                      ? { ...m, content: currentMessage.content }
                      : m,
                  ),
                );
              }
            } else if (line.startsWith("9:")) {
              // Tool call - AI SDK format: 9:{toolCallId, toolName, args}
              try {
                const toolCall = JSON.parse(line.slice(2));
                if (toolCall.toolName === "propose_transaction") {
                  const toolInvocation = {
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    args: toolCall.args,
                    state: "call",
                  };
                  currentMessage.toolInvocations = [
                    ...(currentMessage.toolInvocations || []),
                    toolInvocation,
                  ];
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === currentMessage.id ? { ...currentMessage } : m,
                    ),
                  );
                }
              } catch (e) {
                console.error("Failed to parse tool call:", e);
              }
            } else if (line.startsWith("a:")) {
              // Tool result - AI SDK format: a:{toolCallId, result}
              try {
                const toolResult = JSON.parse(line.slice(2));
                if (currentMessage.toolInvocations) {
                  currentMessage.toolInvocations = currentMessage.toolInvocations.map(
                    (inv: any) =>
                      inv.toolCallId === toolResult.toolCallId
                        ? { ...inv, state: "result", result: toolResult.result }
                        : inv,
                  );
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === currentMessage.id ? { ...currentMessage } : m,
                    ),
                  );
                }
              } catch (e) {
                console.error("Failed to parse tool result:", e);
              }
            } else {
              const candidate = line.replace(/^data:\s*/, "").trimEnd();
              if (candidate) {
                currentMessage.content += (currentMessage.content ? "\n" : "") + candidate;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === currentMessage.id
                      ? { ...m, content: currentMessage.content }
                      : m,
                  ),
                );
              }
            }
          }
        }

        const trailing = buffer.replace(/^data:\s*/, "").trim();
        if (trailing && !trailing.startsWith("0:") && !trailing.startsWith("9:") && !trailing.startsWith("a:")) {
          currentMessage.content += (currentMessage.content ? "\n" : "") + trailing;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentMessage.id
                ? { ...m, content: currentMessage.content }
                : m,
            ),
          );
        }

        const isEmptyAssistantMessage =
          !currentMessage.content.trim() &&
          (!currentMessage.toolInvocations || currentMessage.toolInvocations.length === 0);

        if (isEmptyAssistantMessage) {
          const msg = isTransactionLike
            ? transactionFallback
            : locale === "ru"
              ? "Ассистент временно недоступен. Попробуйте повторить позже."
              : "Assistant is temporarily unavailable. Please try again later.";

          setMessages((prev) =>
            prev.map((m) =>
              m.id === currentMessage.id ? { ...m, content: msg } : m,
            ),
          );
          setError(new Error(msg));
        }
      } catch (err) {
        const errName = (err as any)?.name;
        if (errName === "AbortError") {
          if (!didTimeout) return;
          const msg =
            locale === "ru"
              ? "Запрос занял слишком много времени. Попробуйте ещё раз."
              : "Request timed out. Please try again.";
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: msg,
          };
          setMessages((prev) => [...prev, aiMessage]);
          setError(new Error(msg));
          return;
        }

        if (err instanceof Error) {
          setError(err);
          console.error("Transaction chat error:", err);
        }

        const msg = isTransactionLike
          ? transactionFallback
          : locale === "ru"
            ? "Ассистент временно недоступен. Попробуйте повторить позже."
            : "Assistant is temporarily unavailable. Please try again later.";

        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (
            last?.role === "assistant" &&
            !last.content &&
            (!last.toolInvocations || last.toolInvocations.length === 0)
          ) {
            return prev.map((m, idx) =>
              idx === prev.length - 1 ? { ...m, content: msg } : m,
            );
          }
          return [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: msg,
            },
          ];
        });
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        // ГАРАНТИРОВАННЫЙ СБРОС - CRITICAL FIX
        setIsLoading(false);
        console.log("Force Reset Loading State");
        setAbortController(null);
        
        console.log("Chat transaction finished. Loading state reset.");
      }
    },
    [userId, input, abortController],
  );

  const stop = useCallback(() => {
    abortController?.abort();
    setIsLoading(false);
  }, [abortController]);

  const isRateLimited = !!(rateLimitedUntil && Date.now() < rateLimitedUntil);
  const closeLimitModal = useCallback(() => {
    setIsLimitModalOpen(false);
    setLimitModalMessage(null);
  }, []);

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    error,
    stop,
    isRateLimited,
    isLimitModalOpen,
    limitModalMessage,
    closeLimitModal,
  };
}
