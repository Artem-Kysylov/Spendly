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
  onSuggestionClick?: (text: string) => void;
}

// Minimal cleaner to fix "AI laziness" with newlines
const cleanContent = (text: string) => {
  if (!text) return "";
  let cleaned = text;

  cleaned = cleaned.replace(/\|\|/g, "|\n|");

  cleaned = cleaned.replace(/^([^|\n]+)(\|.*\|)/gm, "$1\n\n$2");

  cleaned = cleaned.replace(/(\|\s*[^\n]+\s*)\|(\s*\|[-:]+)/g, "$1\n$2");

  cleaned = cleaned.replace(/([^\n])(#{1,3})/g, "$1\n\n$2");

  const lines = cleaned.split("\n");
  let inCode = false;
  const out: string[] = [];

  const insightTerms = "Insight|Совет|Порада|सुझाव|Wawasan|インサイト|인사이트";
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

    l = l.replace(/: (?=\p{L})/gu, ":\n");
    l = l.replace(/:(?=\p{L})/gu, ":\n");

    l = l.replace(/([^\n])-\s/g, "$1\n- ");

    l = l.replace(
      /([^\n])((?:This|Last)\s(?:Week|Month)[-:])/g,
      "$1\n\n$2",
    );

    l = l.replace(/([.!?])\s+(?=\p{L})/gu, "$1\n");

    l = l.replace(insightPattern, "$1**💡 $2** ");

    l = l.replace(/(\*\*[^*]+\*\*)(?=[^\s\n.,:;!?])/g, "$1 ");

    const stars = (l.match(/\*\*/g) || []).length;
    if (stars % 2 === 1) l = `${l}**`;

    out.push(l);
  }

  cleaned = out.join("\n");

  return cleaned;
};

export const ChatMessages = ({
  messages,
  isTyping,
  onSuggestionClick,
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
              .map((q) => q.replace(/^\[(.*)\]$/, '$1').trim())
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
                  {cleanContent(content)}
                </ReactMarkdown>
              </div>
            </div>

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
