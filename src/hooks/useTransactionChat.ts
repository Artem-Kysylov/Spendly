"use client";

import { UserAuth } from "@/context/AuthContext";
import { useState, useCallback } from "react";
import { parseTransactionLocally } from "@/lib/parseTransactionLocally";

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
}

/**
 * Hook for transaction chat with AI
 * Custom implementation to handle streaming and tool invocations
 */
export function useTransactionChat(): UseTransactionChatReturn {
  const { session } = UserAuth();
  const userId = session?.user?.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const rawInput = input.trim();
      if (!userId || !rawInput) {
        return;
      }

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

      // ECONOMY MODE: Try to parse simple patterns locally first
      // Do this BEFORE enabling loading state to avoid any chance of being stuck.
      const localParse = parseTransactionLocally(rawInput);
      
      if (localParse.success && localParse.transaction) {
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
              args: localParse.transaction,
              state: "result",
              result: {
                success: true,
                transactions: [localParse.transaction],
              },
            },
          ],
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
        setAbortController(null);
        return; // Skip LLM call entirely!
      }

      setIsLoading(true);

      const controller = new AbortController();
      setAbortController(controller);

      // Complex input - send to AI
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            message: rawInput,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
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
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err);
          console.error("Transaction chat error:", err);
        }
      } finally {
        setIsLoading(false);
        setAbortController(null);
      }
    },
    [userId, input, abortController],
  );

  const stop = useCallback(() => {
    abortController?.abort();
    setIsLoading(false);
  }, [abortController]);

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    error,
    stop,
  };
}
