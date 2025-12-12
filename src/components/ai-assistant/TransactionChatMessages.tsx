
import { Message } from "@/hooks/useTransactionChat";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useEffect, useRef } from "react";
import { TransactionProposalCard } from "./TransactionProposalCard";
import { Loader2 } from "lucide-react";

interface TransactionChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  budgets: any[];
  onTransactionSuccess: () => void;
  onTransactionError: (error: string) => void;
}

// Minimal cleaner to fix "AI laziness" with newlines
const cleanContent = (text: string) => {
  if (!text) return "";
  let cleaned = text;

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

  // 5. Specific fix for "Insight" label merging with previous text
  // Step 1: Normalize all "Insight" variations to "💡 Insight"
  // First, strip existing bold chars from Insight/Совет to clean slate
  cleaned = cleaned.replace(/\*\*(Insight|Совет)\*\*/g, '$1');

  // Now replace "Insight" keywords with bold version
  cleaned = cleaned.replace(/(Insight[-:]|###\s*Insight|Совет[-:]|###\s*Совет)/g, '$1');

  // Normalize simple "Insight" or "Совет" to not have punctuation if it was stripped above?
  cleaned = cleaned.replace(/(Insight|Совет)[-:]/g, '$1');
  cleaned = cleaned.replace(/###\s*(Insight|Совет)/g, '$1');

  // Step 2: Ensure double newline BEFORE Insight
  cleaned = cleaned.replace(/([^\n])(Insight|Совет)/g, '$1\n\n$2');

  // Step 3: Add emoji and BOLD to "Insight" or "Совет"
  cleaned = cleaned.replace(/^(Insight|Совет)/gm, '**💡 $1**');
  cleaned = cleaned.replace(/\n(Insight|Совет)/g, '\n**💡 $1**');

  // Step 4: Ensure space AFTER Insight
  cleaned = cleaned.replace(/(\*\*💡 (Insight|Совет)\*\*)(?=[^\s])/g, '$1 ');

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

        // Handle normal text content
        const content = message.content;

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

                const proposal = toolInvocation.args as any;

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
