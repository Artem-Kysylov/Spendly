"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/types/types";
import { User, Bot } from "lucide-react";
import { UserAuth } from "@/context/AuthContext";
import { useTranslations, useLocale } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { TransactionProposalCard } from "./TransactionProposalCard";

interface Budget {
  id: string;
  name: string;
  emoji?: string;
  type: "expense" | "income";
}

interface PendingActionPayload {
  title: string;
  amount: number;
  budget_folder_id: string | null;
  budget_name: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  pendingAction?: PendingActionPayload | null;
  budgets?: Budget[];
  onConfirmAction?: (confirmed: boolean) => void;
}

export const ChatMessages = ({
  messages,
  isTyping,
  pendingAction,
  budgets = [],
  onConfirmAction,
}: ChatMessagesProps) => {
  const { session } = UserAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tAI = useTranslations("assistant");
  const locale = useLocale();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, pendingAction]);

  // Получаем аватар пользователя
  const userAvatar = session?.user?.user_metadata?.avatar_url;
  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email ||
    "U";
  const userInitial = displayName.charAt(0).toUpperCase();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const dayLabel = (d: Date) => {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(d, now)) return tAI("dates.today");
    if (isSameDay(d, yesterday)) return tAI("dates.yesterday");
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  };

  const renderMarkdownLite = (text: string) => {
    // bold **text**, inline code `code`, link [label](url)
    const parts = text.split("\n").map((line, i) => {
      const withBold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      const withCode = withBold.replace(/`([^`]+?)`/g, "<code>$1</code>");
      const withLinks = withCode.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
      );
      return (
        <p
          key={i}
          className="text-sm whitespace-pre-wrap leading-relaxed"
          dangerouslySetInnerHTML={{ __html: withLinks }}
        />
      );
    });
    return parts;
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
      table: ["className"],
      thead: ["className"],
      tbody: ["className"],
      tr: ["className"],
      th: ["className"],
      td: ["className"],
      code: ["className"],
      pre: ["className"],
    },
  };

  // Универсальная нормализация Markdown для всех локалей
  const normalizeMarkdown = (text: string) => {
    let s = text;

    // Перенос строки перед маркером списка, если он идёт после знака препинания
    s = s.replace(/([:;,.!?—–])\s+([\-*•]\s)/g, "$1\n$2");

    // Пустая строка перед списком для корректного распознавания Markdown
    s = s.replace(/\n([\-*•]\s)/g, "\n\n$1");

    // Даты в отдельные пункты списка (локале-агностично)
    s = s.replace(/(\d{4}-\d{2}-\d{2})\s—\s/g, "\n- $1 — ");

    return s;
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
      {/* Date separators and bubbles */}
      {messages.map((message, idx) => {
        const showSeparator =
          idx === 0 ||
          !isSameDay(message.timestamp, messages[idx - 1].timestamp);
        return (
          <div key={message.id}>
            {showSeparator && (
              <div className="flex items-center my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="mx-3 text-[11px] text-muted-foreground">
                  {dayLabel(message.timestamp)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <div
              className={`flex items-start space-x-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-7 h-7 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                  <Bot className="w-4 h-4 text-secondary-black dark:text-white" />
                </div>
              )}
              <div
                className={`w-fit max-w-[85%] p-3 rounded-2xl shadow-sm text-[14px] sm:text-[15px] break-words overflow-x-auto ${message.role === "user"
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
                  {preprocessContent(normalizeMarkdown(message.content))}
                </ReactMarkdown>
                <div
                  className={`text-xs mt-2 ${message.role === "user" ? "text-blue-200 dark:text-blue-100" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
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
        );
      })}

      {/* Typing Indicator */}
      {isTyping && (
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

      {/* Pending Action Card */}
      {pendingAction && (
        <div className="flex items-start space-x-3 animate-in fade-in-0 duration-300">
          <div className="w-7 h-7 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
            <Bot className="w-4 h-4 text-secondary-black dark:text-white" />
          </div>
          <div className="max-w-[85%] w-full sm:w-[320px]">
            <TransactionProposalCard
              proposal={{
                title: pendingAction.title,
                amount: pendingAction.amount,
                type: "expense", // Defaulting to expense as per typical flow, but could be inferred
                category_name: pendingAction.budget_name,
                date: new Date().toISOString().split("T")[0],
              }}
              budgets={budgets}
              onSuccess={() => onConfirmAction?.(true)}
              onError={() => { }} // Handle error if needed
            />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
