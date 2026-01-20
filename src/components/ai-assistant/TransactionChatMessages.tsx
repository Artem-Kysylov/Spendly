
import { Message } from "@/hooks/useTransactionChat";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useEffect, useRef } from "react";
import { TransactionProposalCard } from "./TransactionProposalCard";
import { Loader2 } from "lucide-react";

function normalizeProposedTransaction(input: any): any {
  if (!input) return null;
  if (Array.isArray(input)) return input[0] ?? null;
  if (Array.isArray(input.transactions)) return input.transactions[0] ?? null;
  if (input.transaction) return input.transaction;
  return input;
}

interface TransactionChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  budgets: any[];
  onTransactionSuccess: () => void;
  onTransactionError: (error: string) => void;
  onSuggestionClick?: (text: string) => void;
}

// Minimal cleaner to fix "AI laziness" with newlines
const cleanContent = (text: string) => {
  if (!text) return "";
  let cleaned = text;

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

  // 7. Fix "Period" or "This Week" merging
  cleaned = cleaned.replace(/([^\n])((?:This|Last)\s(?:Week|Month)[-:])/g, '$1\n\n$2');

  return cleaned;
};

export const TransactionChatMessages = ({
  messages,
  isLoading,
  budgets,
  onTransactionSuccess,
  onTransactionError,
  onSuggestionClick,
}: TransactionChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message) => {
        const isUser = message.role === "user";

        const rawContent = message.content;
        let content = rawContent;
        let suggestions: string[] = [];

        if (!isUser && rawContent) {
          const [main, followUpsRaw] = rawContent.split("### 🔮 Next Steps");
          content = main.trimEnd();
          if (followUpsRaw) {
            suggestions = followUpsRaw
              .split("\n")
              .filter((line) => line.trim().startsWith("-"))
              .map((line) => line.replace(/^-\s*/, "").trim())
              .filter((line) => line.length > 0);
          }
        }

        return (
          <div
            key={message.id}
            className={cn(
              "flex flex-col max-w-[90%] md:max-w-xl",
              isUser ? "self-end items-end" : "self-start items-start"
            )}
          >
            {/* Render Text Bubble if there is content */}
            {content && (
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 shadow-sm w-full mb-2",
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
                      // Add clear borders to cells to distinguish from plain text
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
                    {cleanContent(content)}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {!isUser && suggestions.length > 0 && onSuggestionClick && (
              <div className="mt-1 flex flex-wrap gap-5 md:gap-2">
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

            {/* Render Tool Invocations (Transaction Cards) */}
            {message.toolInvocations?.map((toolInvocation) => {
              if (toolInvocation.toolName === 'propose_transaction') {
                const { result } = toolInvocation;
                // Since 'args' is the proposal, we can use it directly even if result is pending
                // But usually we wait for result or use optimistic args. 
                // The proposal card expects a specific shape.
                // Assuming toolInvocation.args matches ProposedTransaction shape partially or fully.

                // If the tool has a result, it means it was executed? 
                // Actually propose_transaction usually returns the proposed transaction data confirming it was "proposed".
                // Or maybe the AI calls it to ASK user to confirm.

                // Let's assume toolInvocation.args contains the proposal details
                // formatted as: { title, amount, type, category_name, date }

                const proposal =
                  normalizeProposedTransaction(toolInvocation.args) ??
                  normalizeProposedTransaction(result);

                if (!proposal) return null;

                return (
                  <div key={toolInvocation.toolCallId} className="w-full mt-2">
                    <TransactionProposalCard
                      proposal={proposal}
                      budgets={budgets}
                      onSuccess={onTransactionSuccess}
                      onError={onTransactionError}
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      })}

      {isLoading && messages[messages.length - 1]?.role === "user" && (
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
