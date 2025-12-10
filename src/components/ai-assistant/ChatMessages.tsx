"use client";

import { useEffect, useRef, Children } from "react";
import { ChatMessage } from "@/types/types";
import { User, Bot } from "lucide-react";
import { UserAuth } from "@/context/AuthContext";
import { useTranslations, useLocale } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { TransactionProposalCard } from "./TransactionProposalCard";
import { currencySymbol as currencySymUtil } from "@/prompts/spendlyPal/promptBuilder";

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
  currency?: string;
}

export const ChatMessages = ({
  messages,
  isTyping,
  pendingAction,
  budgets = [],
  onConfirmAction,
  currency,
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
    const sameYear = d.getFullYear() === now.getFullYear();
    const monthOpt = locale.toLowerCase().startsWith("ru") ? "long" : "short";
    const fmtOpts: Intl.DateTimeFormatOptions = sameYear
      ? { day: "numeric", month: monthOpt }
      : { day: "numeric", month: monthOpt, year: "numeric" };
    return new Intl.DateTimeFormat(locale, fmtOpts).format(d);
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

  const preprocessContent = (content: string) => {
    if (!content) return "";
    let s = content.replace(/\r\n/g, "\n");
    s = s.replace(/\|\|/g, "|\n|");

    const lines = s.split("\n");
    const out: string[] = [];
    let inTable = false;
    let alignmentInserted = false;

    const isRow = (t: string) => t.includes("|");
    const normalizeRow = (t: string) => {
      let r = t.trim();
      if (!r.startsWith("|")) r = "|" + r;
      if (!r.endsWith("|")) r = r + "|";
      return r;
    };
    const isAlignment = (t: string) => /^\s*\|?([\s:=-]+(?:\|[\s:=-]+)+)\|?\s*$/.test(t);
    const getColCount = (row: string) => row.split("|").filter(Boolean).length;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        out.push("");
        inTable = false;
        alignmentInserted = false;
        continue;
      }

      if (!trimmed.startsWith("|") && line.includes("|")) {
        const idx = line.indexOf("|");
        const heading = line.slice(0, idx).trim();
        const header = line.slice(idx).trim();
        if (heading) {
          out.push(`**${heading}**`);
          out.push("");
        }
        line = header;
      }

      if (isRow(line)) {
        const row = normalizeRow(line);
        out.push(row);
        if (!inTable) {
          inTable = true;
          const next = lines[i + 1] ?? "";
          if (!isAlignment(next)) {
            const align = "|" + Array(getColCount(row)).fill("---").join("|") + "|";
            out.push(align);
            alignmentInserted = true;
          }
        } else if (!alignmentInserted) {
          const next = lines[i + 1] ?? "";
          if (isAlignment(next)) {
            const normalized = next.trim().startsWith("|") ? next.trim() : "|" + next.trim() + "|";
            out.push(normalized);
            alignmentInserted = true;
            i++;
          }
        }
        continue;
      }

      if (inTable) {
        out.push("");
        inTable = false;
        alignmentInserted = false;
      }

      out.push(line);
    }

    s = out.join("\n");

    // Ensure section headers break out of tables
    s = s.replace(/(^|\n)\s*(Insight|Tip|Advice)\b\s*(\*\*)?\s*:?/gi, "\n\n**$2**: ");

    // Format numeric tokens with locale grouping
    const isRu = String(locale).toLowerCase().startsWith("ru");
    const sym = currencySymUtil(currency || "USD");
    const formatLine = (line: string) =>
      line.replace(/(\$)?(\d{1,3}(?:[\d\s,.]*\d)?(?:[.,]\d{2})?)/g, (m, dollar, num) => {
        const raw = num.replace(/\s+/g, "").replace(/,/g, "");
        const n = Number(raw.replace(",", "."));
        if (!Number.isFinite(n)) return m;
        const hasDecimals = /[.,]\d{2}$/.test(num);
        const fmt = new Intl.NumberFormat(isRu ? "ru-RU" : "en-US", {
          minimumFractionDigits: hasDecimals ? 2 : 0,
          maximumFractionDigits: hasDecimals ? 2 : 0,
        }).format(n);
        return dollar ? `${sym}${fmt}` : fmt;
      });
    s = s.split("\n").map(formatLine).join("\n");

    // Localize section headings when Russian locale
    if (isRu) {
      s = s.replace(/\*\*Insight\*\*\s*:/gi, "**Вывод**: ");
      s = s.replace(/\*\*Tip\*\*\s*:/gi, "**Совет**: ");
      s = s.replace(/\*\*Advice\*\*\s*:/gi, "**Совет**: ");
    }

    // Ensure bullet lists start on new lines
    s = s.replace(/([^\n])\s+([\-\*•]\s+)/g, "$1\n$2");

    // Strip stray bold markers and reapply only to keywords
    s = s.replace(/\*\*/g, "");
    const headings = [
      "Spending Analysis",
      "Weekly Summary",
      "Monthly Comparison",
      "This Week",
      "Last Week",
      "This Month",
      "Last Month",
    ];
    const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const h of headings) {
      const re = new RegExp(`(^|\\n)\\s*${esc(h)}(?!\\*\\*)`, "g");
      s = s.replace(re, `$1**${h}**`);
    }
    // Ensure newline after section headings
    s = s.replace(
      /(\*\*Spending Analysis\*\*|\*\*Weekly Summary\*\*|\*\*Monthly Comparison\*\*)\s*(?!\n)/g,
      "$1\n",
    );
    // Ensure labels start on new lines
    s = s.replace(
      /(\*\*This Week\*\*|\*\*Last Week\*\*|\*\*This Month\*\*|\*\*Last Month\*\*)(?!\n)/g,
      "$1\n",
    );
    // Normalize label punctuation
    s = s.replace(/Total spending\s*[:：]?\s*/gi, "Total spending: ");

    return s;
  };

  const nodeText = (node: any): string => {
    const arr = Children.toArray(node?.props?.children || []);
    return arr
      .map((c: any) =>
        typeof c === "string"
          ? c
          : typeof c?.props?.children === "string"
          ? c.props.children
          : Array.isArray(c?.props?.children)
          ? Children.toArray(c.props.children)
              .map((x: any) => (typeof x === "string" ? x : ""))
              .join("")
          : "",
      )
      .join("")
      .trim();
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
            className={`w-fit max-w-[85%] p-3 rounded-2xl shadow-sm text-[14px] sm:text-[15px] break-words whitespace-pre-wrap overflow-x-auto ${message.role === "user"
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
                      <p className="mb-3 whitespace-pre-wrap last:mb-0" {...props} />
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
                    table: ({ node, ...props }) => {
                      const kids = Children.toArray(props.children || []);
                      const theadNode: any = kids.find(
                        (k: any) => String(k?.type) === "thead",
                      );
                      const tbodyNode: any = kids.find(
                        (k: any) => String(k?.type) === "tbody",
                      );
                      const headerRow: any = Children.toArray(
                        theadNode?.props?.children || [],
                      )[0];
                      const headerCells: any[] = headerRow
                        ? Children.toArray(headerRow.props.children || [])
                        : [];
                      const headers = headerCells.map((c) => nodeText(c));
                      const rows: any[] = tbodyNode
                        ? Children.toArray(tbodyNode.props.children || [])
                        : [];
                      return (
                        <div className="my-4 w-full overflow-hidden rounded-md border border-border">
                          <div className="overflow-x-auto hidden sm:block">
                            <table className="w-full text-sm" {...props} />
                          </div>
                          <div className="sm:hidden space-y-2 p-2">
                            {rows.map((r, ri) => {
                              const cells = Children.toArray(r?.props?.children || []);
                              return (
                                <div key={ri} className="rounded-md border bg-background p-3">
                                  {cells.map((cell: any, ci: number) => (
                                    <div key={ci} className="flex justify-between py-0.5">
                                      <span className="text-xs text-muted-foreground">
                                        {headers[ci] || `Col ${ci + 1}`}
                                      </span>
                                      <span className="text-sm">
                                        {nodeText(cell)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    },
                    thead: ({ node, ...props }) => (
                      <thead className="bg-muted/80 font-medium" {...props} />
                    ),
                    tbody: ({ node, ...props }) => (
                      <tbody className="divide-y divide-border bg-background/50" {...props} />
                    ),
                    tr: ({ node, ...props }) => {
                      const cells = Children.toArray(props.children || []);
                      const firstCell = cells[0] as any;
                      const txt = nodeText(firstCell);
                      const isDiff = /^(Difference|Разница)$/i.test(txt) || /Difference|Разница/i.test(txt);
                      const cls = isDiff
                        ? "transition-colors bg-amber-50 dark:bg-amber-900/30"
                        : "transition-colors hover:bg-muted/50";
                      return <tr className={cls} {...props} />;
                    },
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="my-3 p-3 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded-r-md">
                        <div className="flex items-start gap-2">
                          <span aria-hidden>💡</span>
                          <div>{props.children}</div>
                        </div>
                      </blockquote>
                    ),
                    th: ({ node, ...props }) => (
                      <th className="px-4 py-2 align-middle font-medium text-muted-foreground text-right first:text-left [&:has([role=checkbox])]:pr-0" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="px-4 py-2 align-middle text-right first:text-left [&:has([role=checkbox])]:pr-0" {...props} />
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
