
import { Message } from "@/hooks/useTransactionChat";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useEffect, useRef, useState } from "react";
import { TransactionProposalCard, type ProposedTransaction } from "./TransactionProposalCard";
import { BudgetProposalCard, type ProposedBudget } from "./BudgetProposalCard";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/format/money";

function normalizeProposedTransactions(input: any): any[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  if (Array.isArray(input.transactions)) return input.transactions.filter(Boolean);
  if (input.transaction) return [input.transaction];
  return [input];
}

function sanitizeSuggestion(input: string) {
  let out = String(input || "").trim();
  out = out.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  out = out.replace(/^\[([\s\S]*)\]$/, "$1");
  out = out.replace(/\*\*/g, "");
  out = out.replace(/`/g, "");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

function extractSuggestions(rawContent: string): { content: string; suggestions: string[] } {
  const sections = rawContent.split(/###\s*(?:🔮\s*)?(?:Next Steps|Следующие шаги|Наступні кроки|अगले कदम|Langkah berikutnya|次のステップ|다음 단계)/i);
  const content = (sections[0] || "").trimEnd();
  const followUpsRaw = sections[1];

  if (!followUpsRaw) {
    return { content, suggestions: [] };
  }

  const text = followUpsRaw.replace(/\n+/g, " ").trim();
  const matches = Array.from(text.matchAll(/-\s+([^\-]+?)(?=\s*-\s+|$)/g)).map((m) => m[1].trim());
  const suggestions = matches
    .map((q) => sanitizeSuggestion(q))
    .filter((q) => q.length > 0);

  return { content, suggestions };
}

interface TransactionChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  budgets: any[];
  onTransactionSuccess: () => void;
  onTransactionError: (error: string) => void;
  onSuggestionClick?: (text: string) => void;
  currency?: string;
}

const formatHumanDate = (isoDate: string): string => {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return isoDate;
  }
};

// Minimal cleaner to fix "AI laziness" with newlines
const cleanContent = (text: string) => {
  if (!text) return "";
  let cleaned = text;

  cleaned = cleaned.replace(/\\([*_])/g, "$1");

  cleaned = cleaned.replace(/\*\*\s*([^\n*][^\n]*?[^\s*])\s*\*\*/g, "**$1**");

  cleaned = cleaned.replace(
    /^(\s*(?:[-*]\s*)?)(\d{4}-\d{2}-\d{2})(\s+(?:—|-)\s+)/gm,
    (_m, prefix: string, iso: string, sep: string) =>
      `${prefix}${formatHumanDate(iso)}${sep}`,
  );

  const insightTerms =
    "Insight|Tip|Advice|Совет|Порада|सुझाव|Wawasan|インサイト|인사이트";

  // 1. CRITICAL: Aggressive fix for "AI laziness" where it puts double pipes instead of newline
  // Matches "||" anywhere and forces it to be "|\n|"
  cleaned = cleaned.replace(/\|\|/g, "|\n|");

  // 2. Ensure newline before Table Header starts
  // NEW SAFE REGEX: Only add newline if the line explicitly DOES NOT start with a pipe
  cleaned = cleaned.replace(/^([^|\n]+)(\|.*\|)/gm, '$1\n\n$2');

  // 2b. SEPARATE Header Row from Separator Row
  cleaned = cleaned.replace(/(\|\s*[^\n]+\s*)\|(\s*\|[-:]+)/g, '$1\n$2');

  // 3. Ensure double newline before Headers (###)
  cleaned = cleaned.replace(/([^\n])(#{1,3})/g, '$1\n\n$2');

  // 4. Ensure double newline before Lists
  cleaned = cleaned.replace(/([^\n])(\s)([\*\-])(?=\s)/g, '$1\n\n$3');

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

  // 5. Specific fix for "Insight" label merging with previous text
  // Step 1: Normalize all "Insight" variations to "💡 Insight" (or localized equivalent)
  // Terms: Insight, Совет (RU), Порада (UK), सुझाव (HI), Wawasan (ID), インサイト (JA), 인사이트 (KO)
  const insightRegex = new RegExp(`\\*\\*(${insightTerms})\\*\\*`, 'g');
  // const insightPunctuation = new RegExp(`(${insightTerms})[-:]|###\\s*(${insightTerms})`, 'g'); 
  const insightPrefix = new RegExp(`([^\\n])(${insightTerms})`, 'g');
  const insightStart = new RegExp(`^(${insightTerms})`, 'gm');
  const insightNewline = new RegExp(`\\n(${insightTerms})`, 'g');
  const insightSpace = new RegExp(`(\\*\\*💡 (${insightTerms})\\*\\*)(?=[^\\s])`, 'g');

  // First, strip existing bold chars from Insight terms to clean slate
  cleaned = cleaned.replace(insightRegex, '$1');

  // Now strip punctuation/headers
  cleaned = cleaned.replace(new RegExp(`(${insightTerms})[-:]`, 'g'), '$1');
  cleaned = cleaned.replace(new RegExp(`###\\s*(${insightTerms})`, 'g'), '$1');

  // Step 2: Ensure double newline BEFORE Insight
  cleaned = cleaned.replace(insightPrefix, '$1\n\n$2');

  // Step 3: Add emoji and BOLD to "Insight" or "Совет" etc
  cleaned = cleaned.replace(insightStart, '**💡 $1**');
  cleaned = cleaned.replace(insightNewline, '\n**💡 $1**');

  // Step 4: Ensure space AFTER Insight
  cleaned = cleaned.replace(insightSpace, '$1 ');

  // 6. Generic Fix: Ensure space after ANY bold text
  cleaned = cleaned.replace(/(\*\*[^*]+\*\*)(?=[^\s\n.,:;!?])/g, '$1 ');

  cleaned = cleaned.replace(/\*\*(?=\S)/g, " **");
  cleaned = cleaned.replace(/(?<=\S)\*\*/g, "** ");
  
  // Fix double spaces around bold text: ** text ** -> **text**
  cleaned = cleaned.replace(/\*\*\s+([^\s*]+?)\s+\*\*/g, "**$1**");

  // 7. Fix "Period" or "This Week" merging
  cleaned = cleaned.replace(/([^\n])((?:This|Last)\s(?:Week|Month)[-:])/g, '$1\n\n$2');

  cleaned = cleaned.replace(/\]\(\s*([^\)]+?)\s*\)/g, (_m, href: string) => {
    const normalizedHref = href.replace(/\s+/g, "");
    return `](${normalizedHref})`;
  });

  return cleaned;
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

export const TransactionChatMessages = ({
  messages,
  isLoading,
  budgets,
  onTransactionSuccess,
  onTransactionError,
  onSuggestionClick,
  currency,
}: TransactionChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [clickedMessageIndices, setClickedMessageIndices] = useState<Set<number>>(new Set());

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSuggestionClick = (suggestion: string, messageIndex: number) => {
    setClickedMessageIndices(prev => new Set(prev).add(messageIndex));
    onSuggestionClick?.(suggestion);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message, index) => {
        const isUser = message.role === "user";

        const rawContent = message.content;
        let content = rawContent;
        let suggestions: string[] = [];

        if (!isUser && rawContent) {
          ({ content, suggestions } = extractSuggestions(rawContent));
        }

        return (
          <div
            key={index}
            className={cn(
              "flex w-full flex-col",
              isUser ? "items-end" : "items-start"
            )}
          >
            {content && (
              <div
                className={cn(
                  isUser ? "max-w-[85%] md:max-w-xl" : "w-full md:max-w-xl"
                )}
              >
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
                        )
                      }}
                    >
                      {normalizeCurrencyInText(cleanContent(content), currency)}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Render Tool Invocations (Transaction Cards) */}
            {message.toolInvocations?.map((toolInvocation) => {
              if (toolInvocation.toolName === 'propose_transaction') {
                const { result, args } = toolInvocation;
                
                // Extract transactions from either result or args
                let proposalData = null;
                if (result && typeof result === 'object' && 'transactions' in result && Array.isArray((result as any).transactions)) {
                  proposalData = (result as any).transactions;
                } else if (args && typeof args === 'object' && 'transactions' in args && Array.isArray((args as any).transactions)) {
                  proposalData = (args as any).transactions;
                } else if (args && typeof args === 'object' && !('transactions' in args) && 'title' in args) {
                  // Single transaction case
                  proposalData = [args as ProposedTransaction];
                }

                if (!proposalData || !Array.isArray(proposalData)) return null;

                return (
                  <div key={toolInvocation.toolCallId} className="w-full mt-2">
                    {proposalData.map((proposal: ProposedTransaction, idx: number) => (
                      <TransactionProposalCard
                        key={`${toolInvocation.toolCallId}-${idx}`}
                        proposal={proposal}
                        budgets={budgets || []}
                        autoDismissSuccess={false}
                        currency={currency}
                        onSuccess={() => {
                          // Optional: Handle success
                        }}
                      />
                    ))}
                  </div>
                );
              }

              if (toolInvocation.toolName === "propose_budget") {
                const candidate =
                  toolInvocation?.args && typeof toolInvocation.args === "object"
                    ? toolInvocation.args
                    : toolInvocation?.result && typeof toolInvocation.result === "object"
                      ? toolInvocation.result
                      : null;

                if (!candidate) return null;

                return (
                  <div key={toolInvocation.toolCallId} className="w-full mt-2">
                    <BudgetProposalCard
                      proposal={candidate as ProposedBudget}
                    />
                  </div>
                );
              }

              return null;
            })}

            {!isUser && suggestions.length > 0 && onSuggestionClick && !clickedMessageIndices.has(index) && (
              <div className="mt-2 flex w-full justify-end">
                <div className="flex max-w-[85%] flex-wrap justify-end gap-3 md:max-w-xl md:gap-2">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="inline-flex items-center justify-start rounded-full border bg-background hover:bg-muted text-sm px-4 py-2.5 md:text-xs md:px-3 md:py-1.5 text-left cursor-pointer transition-colors"
                      onClick={() => handleSuggestionClick(s, index)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {isLoading && (
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
