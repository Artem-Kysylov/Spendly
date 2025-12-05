import { SYSTEM_PROMPT } from "./system";
import { TASKS_PROMPT } from "./tasks";
import { EXAMPLES_PROMPT } from "./examples";

export const PROMPT_VERSION = "spendlyPal/0.1.0";

export function buildPromptSections(params: {
  locale?: string;
  currency?: string;
  context: string;
  user: string;
}): string {
  const locale = params.locale || "en-US";
  const currency = (params.currency || "USD").toUpperCase();
  return [
    `[SYSTEM]\n${SYSTEM_PROMPT}`,
    `[CONTEXT]\nCurrency: ${currency}\nLocale: ${locale}\n${params.context}`,
    `[TASKS]\n${TASKS_PROMPT}`,
    `[EXAMPLES]\n${EXAMPLES_PROMPT}`,
    `[QUERY]\nUser: ${params.user}`,
  ].join("\n\n");
}
