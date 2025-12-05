"use client";

import { useEffect, useRef } from "react";
import { User, Bot } from "lucide-react";
import { UserAuth } from "@/context/AuthContext";
import { TransactionProposalCard } from "./TransactionProposalCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Message } from "@/hooks/useTransactionChat";

interface Budget {
  id: string;
  name: string;
  emoji?: string;
  type: "expense" | "income";
}

interface TransactionChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  budgets: Budget[];
  onTransactionSuccess?: () => void;
  onTransactionError?: (error: string) => void;
}

export function TransactionChatMessages({
  messages,
  isLoading,
  budgets,
  onTransactionSuccess,
  onTransactionError,
}: TransactionChatMessagesProps) {
  const { session } = UserAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const userAvatar = session?.user?.user_metadata?.avatar_url;
  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email ||
    "U";
  const userInitial = displayName.charAt(0).toUpperCase();

  const markdownSchema = {
    ...defaultSchema,
    tagNames: [
      ...(defaultSchema.tagNames || []),
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    attributes: {
      ...defaultSchema.attributes,
      a: ["href", "title", "target", "rel"],
      code: ["className"],
      pre: ["className"],
    },
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
      {messages.map((message) => (
        <div key={message.id}>
          <div
            className={`flex items-start space-x-3 ${message.role === "user" ? "justify-end" : "justify-start"
              }`}
          >
            {message.role === "assistant" && (
              <div className="w-7 h-7 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                <Bot className="w-4 h-4 text-secondary-black dark:text-white" />
              </div>
            )}

            <div className="flex flex-col gap-3 max-w-[85%]">
              {/* Text content */}
              {message.content && (
                <div
                  className={`w-fit p-3 rounded-2xl shadow-sm text-[14px] sm:text-[15px] break-words overflow-x-auto ${message.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md"
                      : "bg-gray-100 text-secondary-black rounded-bl-md border border-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                    }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    rehypePlugins={[[rehypeSanitize, markdownSchema]]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 space-y-2 mb-3">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 space-y-2 mb-3">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed mb-1">{children}</li>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href as string}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          {children}
                        </a>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code className="bg-muted px-1 py-0.5 rounded font-mono text-[12px]">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}

              {/* Tool invocations (Transaction Proposals) */}
              {message.toolInvocations?.map((toolInvocation: any) => {
                if (
                  toolInvocation.toolName === "propose_transaction" &&
                  toolInvocation.state === "result"
                ) {
                  const result = toolInvocation.result;
                  if (result?.success && result?.transactions) {
                    return result.transactions.map(
                      (transaction: any, idx: number) => (
                        <TransactionProposalCard
                          key={`${toolInvocation.toolCallId}-${idx}`}
                          proposal={transaction}
                          budgets={budgets}
                          onSuccess={onTransactionSuccess}
                          onError={onTransactionError}
                        />
                      ),
                    );
                  }
                }
                return null;
              })}
            </div>

            {message.role === "user" && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm overflow-hidden">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt="User avatar"
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-indigo-600 dark:bg-indigo-400 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {userInitial}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-start space-x-3 animate-in fade-in-0 duration-300">
          <div className="w-7 h-7 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
            <Bot className="w-4 h-4 text-secondary-black dark:text-white" />
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
