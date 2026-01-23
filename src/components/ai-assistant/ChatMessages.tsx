import { ChatMessage } from "@/types/types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useEffect, useRef } from "react";
import { TransactionProposalCard } from "./TransactionProposalCard";
import { formatMoney } from "@/lib/format/money";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping?: boolean;
  currency?: string;
  onSuggestionClick?: (text: string) => void;
  pendingAction?: unknown;
  budgets?: any[];
}

function normalizeProposedTransactions(input: any): any[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  if (Array.isArray(input.transactions)) return input.transactions.filter(Boolean);
  if (input.transaction) return [input.transaction];
  return [input];
}

// Minimal cleaner to fix "AI laziness" with newlines
const cleanContent = (text: string) => {
  if (!text) return "";
  let cleaned = text;

  cleaned = cleaned.replace(/\\([*_])/g, "$1");

  cleaned = cleaned.replace(/\|\|/g, "|\n|");

  const insightTerms =
    "Insight|Tip|Advice|Совет|Порада|सुझाव|Wawasan|インサイト|인사이트";

  cleaned = cleaned.replace(
    new RegExp(
      `\\s*💡\\s*\\n\\s*(?:\\*\\*\\s*)?(${insightTerms})(?:\\s*\\*\\*)?\\s*[:\\-]?\\s*`,
      "gu",
    ),
    "\n\n$1 ",
  );

  cleaned = cleaned.replace(
    new RegExp(
      `\\s*💡\\s*(?:\\*\\*\\s*)?(${insightTerms})(?:\\s*\\*\\*)?\\s*[:\\-]?\\s*`,
      "gu",
    ),
    "\n\n$1 ",
  );

  cleaned = cleaned.replace(/^([^|\n]+)(\|.*\|)/gm, "$1\n\n$2");

  cleaned = cleaned.replace(/(\|\s*[^\n]+\s*)\|(\s*\|[-:]+)/g, "$1\n$2");

  cleaned = cleaned.replace(/([^\n])(#{1,3})/g, "$1\n\n$2");

  const lines = cleaned.split("\n");
  let inCode = false;
  const out: string[] = [];

  const insightPattern = new RegExp(
    `^(\\s*(?:-\\s*)?)(?:\\*\\*\\s*)?(?:💡\\s*)?(${insightTerms})(?:\\s*\\*\\*)?\\s*[:\\-]?\\s*`,
    "u",
  );

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```") ){
      inCode = !inCode;
      out.push(line);
      continue;
    }

    const isTableLine = !inCode && trimmed.startsWith("|") && trimmed.includes("|");
    if (isTableLine) {
      out.push(line);
      continue;
    }

    let l = line;

    l = l.replace(/\*\*\s+/g, "**");
    l = l.replace(/\s+\*\*/g, "**");

    l = l.replace(/([.:])\s*(\d+\.)/g, "$1\n\n$2");

    l = l.replace(/([\p{L}])\*\*/gu, "$1 **");

    l = l.replace(/([.:])\s*(\*\*)/g, "$1\n\n$2");

    l = l.replace(/([.!?])(?=\p{L})/gu, "$1\n\n");

    l = l.replace(/: (?=\p{L})/gu, ":\n");
    l = l.replace(/:(?=\p{L})/gu, ":\n");

    l = l.replace(/([^\n])-\s/g, "$1\n- ");

    l = l.replace(
      /([^\n])((?:This|Last)\s(?:Week|Month)[-:])/g,
      "$1\n\n$2",
    );

    l = l.replace(/([.!?])\s+(?=\p{L})/gu, "$1\n");

    l = l.replace(/([0-9])(?=\p{L})/gu, "$1 ");

    l = l.replace(insightPattern, "$1**💡 $2** ");

    l = l.replace(/(\*\*[^*]+\*\*)(?=[^\s\n.,:;!?])/g, "$1 ");

    const stars = (l.match(/\*\*/g) || []).length;
    if (stars % 2 === 1) l = l.replace(/\*\*/g, "");

    out.push(l);
  }

  cleaned = out.join("\n");

  return cleaned;
};

const sanitizeSuggestion = (input: string) => {
  let out = String(input || "").trim();
  out = out.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  out = out.replace(/^\[([\s\S]*)\]$/, "$1");
  out = out.replace(/\*\*/g, "");
  out = out.replace(/`/g, "");
  out = out.replace(/\s+/g, " ").trim();
  return out;
};

function normalizeCurrencyInText(input: string, currency?: string): string {
  if (!input) return "";
  if (!currency) return input;

  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";

  const parseLooseNumber = (raw: string): number | null => {
    const s = String(raw || "").trim().replace(/\s+/g, "");
    if (!s) return null;

    const hasDot = s.includes(".");
    const hasComma = s.includes(",");

    let normalized = s;
    if (hasComma && !hasDot) {
      normalized = normalized.replace(/,/g, ".");
    } else if (hasComma && hasDot) {
      normalized = normalized.replace(/,/g, "");
    }

    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  };

  const replace = (match: string, numRaw: string) => {
    const n = parseLooseNumber(numRaw);
    if (n === null) return match;
    return formatMoney(n, currency, locale);
  };

  let out = input;
  const currencyToken =
    "(?:\\b(?:USD|EUR|UAH|RUB|JPY|KRW|INR|IDR)\\b|\\$|€|₴|₽|¥|₩|₹|Rp)";
  const prefix = new RegExp(`${currencyToken}\\s*([0-9][0-9\\s.,]*)`, "giu");
  const suffix = new RegExp(`([0-9][0-9\\s.,]*)\\s*${currencyToken}`, "giu");

  out = out.replace(prefix, replace);
  out = out.replace(suffix, (m, num) => replace(m, num));
  return out;
}

export const ChatMessages = ({
  messages,
  isTyping,
  currency,
  onSuggestionClick,
  pendingAction,
  budgets,
}: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const rawContent = typeof message.content === "string" ? message.content : "";
        let content = rawContent;
        let suggestions: string[] = [];

        if (!isUser && rawContent) {
          const [main, followUpsRaw] = rawContent.split("### 🔮 Next Steps");
          content = main.trimEnd();
          if (followUpsRaw) {
            const text = followUpsRaw.replace(/\n+/g, ' ').trim();
            const matches = Array.from(text.matchAll(/-\s+([^\-]+?)(?=\s*-\s+|$)/g)).map((m) => m[1].trim());
            suggestions = matches
              .map((q) => sanitizeSuggestion(q))
              .filter((q) => q.length > 0);
          }
        }

        if (!content && !message.toolInvocations && suggestions.length === 0) return null;

        return (
          <div
            key={index}
            className={cn(
              "flex flex-col max-w-[85%] md:max-w-xl",
              isUser ? "self-end items-end" : "self-start items-start"
            )}
          >
            {content && (
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 shadow-sm w-full",
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50"
                )}
              >
                <div className={cn(
                  "prose prose-sm dark:prose-invert max-w-none leading-relaxed",
                  // Customizing prose specifics
                  "prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-bold",
                  "prose-p:my-2",
                  "prose-ul:my-2 prose-li:my-0",
                  "prose-table:my-2",
                  isUser && "prose-headings:text-primary-foreground prose-p:text-primary-foreground prose-li:text-primary-foreground prose-strong:text-primary-foreground"
                )}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      table: ({ node, ...props }) => (
                        <div className="my-4 w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse" {...props} />
                          </div>
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th className="px-4 py-2 text-left font-semibold bg-muted/50 border-b border-border" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="px-4 py-2 align-top border-b border-border" {...props} />
                      ),
                      a: ({ node, ...props }) => (
                        <a target="_blank" rel="noopener noreferrer" className="underline font-medium" {...props} />
                      ),
                    }}
                  >
                    {normalizeCurrencyInText(cleanContent(content), currency)}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {!isUser && suggestions.length > 0 && onSuggestionClick && (
              <div className="mt-2 flex flex-wrap gap-5 md:gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="inline-flex items-center justify-start rounded-full border bg-background hover:bg-muted text-sm px-4 py-2.5 md:text-xs md:px-3 md:py-1.5 text-left cursor-pointer transition-colors"
                    onClick={() => onSuggestionClick(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {message.toolInvocations?.map((toolInvocation) => {
              if (toolInvocation.toolName === "propose_transaction") {
                const proposals =
                  normalizeProposedTransactions(toolInvocation.args).length > 0
                    ? normalizeProposedTransactions(toolInvocation.args)
                    : normalizeProposedTransactions(toolInvocation.result);
                if (proposals.length === 0) return null;

                return (
                  <div key={toolInvocation.toolCallId} className="w-full mt-2">
                    {proposals.map((proposal, idx) => (
                      <div key={`${toolInvocation.toolCallId}-${idx}`} className={idx === 0 ? "" : "mt-2"}>
                        <TransactionProposalCard
                          proposal={proposal}
                          budgets={(budgets || []) as any}
                          autoDismissSuccess={false}
                          currency={currency}
                          onSuccess={() => {
                            window.dispatchEvent(new CustomEvent("transaction:created"));
                            window.dispatchEvent(new CustomEvent("budgetTransactionAdded"));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      })}

      {isTyping && (
        <div className="self-start flex items-center gap-2 p-4 bg-muted/50 rounded-2xl w-16">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        </div>
      )}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
};
