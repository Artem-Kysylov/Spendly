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

  // Hack: Preprocess AI content to fix broken markdown tables
  const preprocessContent = (content: string) => {
    if (!content) return "";
    // Fix tables: Replace "||-" or "||---" with "|\n|---" (insert newline)
    let clean = content.replace(/\|\s*\|[-:]/g, (match) => {
      return match.replace("||", "|\n|");
    });
    return clean;
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
                      // Text styling
                      p: ({ node, ...props }) => (
                        <p className="mb-3 last:mb-0" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="my-2 ml-6 list-disc [&>li]:mt-1" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="my-2 ml-6 list-decimal [&>li]:mt-1" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="leading-normal" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold" {...props} />
                      ),
                      a: ({ node, ...props }) => (
                        <a className="font-medium underline underline-offset-4 text-primary" {...props} />
                      ),
                      // Table styling
                      table: ({ node, ...props }) => (
                        <div className="my-4 w-full overflow-hidden rounded-md border border-border">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm" {...props} />
                          </div>
                        </div>
                      ),
                      thead: ({ node, ...props }) => (
                        <thead className="bg-muted/80 font-medium" {...props} />
                      ),
                      tbody: ({ node, ...props }) => (
                        <tbody className="divide-y divide-border bg-background/50" {...props} />
                      ),
                      tr: ({ node, ...props }) => (
                        <tr className="transition-colors hover:bg-muted/50" {...props} />
                      ),
                      th: ({ node, ...props }) => (
                        <th className="px-4 py-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="px-4 py-2 align-middle [&:has([role=checkbox])]:pr-0" {...props} />
                      ),
                    }}
                  >
                    {preprocessContent(message.content)}
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
