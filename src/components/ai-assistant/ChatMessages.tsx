import { ChatMessage } from "@/types/types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useEffect, useRef } from "react";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping?: boolean;
  currency?: string;
}

// Minimal cleaner to fix "AI laziness" with newlines
const cleanContent = (text: string) => {
  if (!text) return "";
  let cleaned = text;

  // 1. CRITICAL: Aggressive fix for "AI laziness" where it puts double pipes instead of newline
  // Matches "||" anywhere and forces it to be "|\n|"
  cleaned = cleaned.replace(/\|\|/g, "|\n|");

  // 2. Ensure newline before Table Header starts
  // OLD DESTRUCTIVE REGEX: cleaned = cleaned.replace(/([^\n])\|(?=.*\|)/g, '$1\n\n|');
  // NEW SAFE REGEX: Only add newline if the line explicitly DOES NOT start with a pipe using multiline start anchor
  // Look for: Start of line -> (optional whitespace) -> Content that is NOT a pipe -> Pipe
  // We want to turn "Some text | Header |" into "Some text\n\n| Header |"
  // But leave "| Cell | Cell |" alone.
  cleaned = cleaned.replace(/^([^|\n]+)(\|.*\|)/gm, '$1\n\n$2');

  // 2b. SEPARATE Header Row from Separator Row
  // Match: "| Header | Header |\n|---|---|" or similar attached lines
  // Fix: Find "|...|...|" followed immediately by "|...|" or "|---|"
  cleaned = cleaned.replace(/(\|\s*[^\n]+\s*)\|(\s*\|[-:]+)/g, '$1\n$2');

  // 3. Ensure double newline before Headers (###)
  cleaned = cleaned.replace(/([^\n])(#{1,3})/g, '$1\n\n$2');

  // 4. Ensure double newline before Lists
  cleaned = cleaned.replace(/([^\n])(\s)([\*\-])(?=\s)/g, '$1\n\n$3');

  // 5. Specific fix for "Insight" label merging with previous text
  // Step 1: Normalize all "Insight" variations to "💡 Insight"
  cleaned = cleaned.replace(/\*\*(Insight)\*\*/g, '$1');
  cleaned = cleaned.replace(/(Insight[-:]|###\s*Insight)/g, 'Insight');

  // Step 2: Ensure double newline BEFORE Insight
  cleaned = cleaned.replace(/([^\n])(Insight)/g, '$1\n\n$2');

  // Step 3: Add emoji and BOLD to "Insight"
  cleaned = cleaned.replace(/^Insight/gm, '**💡 Insight**');
  cleaned = cleaned.replace(/\nInsight/g, '\n**💡 Insight**');

  // Step 4: Ensure space AFTER Insight
  cleaned = cleaned.replace(/(\*\*💡 Insight\*\*)(?=[^\s])/g, '$1 ');

  // 6. Generic Fix: Ensure space after ANY bold text if followed by non-space/non-newline
  // This addresses "Insight**Text" issues generally
  cleaned = cleaned.replace(/(\*\*[^*]+\*\*)(?=[^\s\n.,:;!?])/g, '$1 ');

  // 7. Fix "Period" or "This Week" merging
  cleaned = cleaned.replace(/([^\n])((?:This|Last)\s(?:Week|Month)[-:])/g, '$1\n\n$2');

  return cleaned;
};

export const ChatMessages = ({
  messages,
  isTyping,
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
        // Attempt to get content from message.content which might be string or parts
        // Assuming string for now based on prompt context, but handling potential object if needed
        const content = typeof message.content === 'string' ? message.content : '';

        if (!content && !message.toolInvocations) return null;

        return (
          <div
            key={index}
            className={cn(
              "flex flex-col max-w-[85%] md:max-w-xl",
              isUser ? "self-end items-end" : "self-start items-start"
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
                    // Add clear borders to cells to distinguish from plain text
                    th: ({ node, ...props }) => (
                      <th className="px-4 py-2 text-left font-semibold bg-muted/50 border-b border-border" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="px-4 py-2 align-top border-b border-border" {...props} />
                    ),
                    // Adding key logic for links if needed, but prose handles most
                    a: ({ node, ...props }) => (
                      <a target="_blank" rel="noopener noreferrer" className="underline font-medium" {...props} />
                    )
                  }}
                >
                  {cleanContent(content)}
                </ReactMarkdown>
              </div>
            </div>
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
