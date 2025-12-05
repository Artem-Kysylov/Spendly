// TypeScript контракт для унифицированного JSON-ответа (V1)
export interface SpendlyAssistantResponseV1 {
  intent:
    | "summary"
    | "add_transaction"
    | "advice"
    | "comparison"
    | "budget_plan"
    | "unknown";
  period?: "thisWeek" | "lastWeek" | "month" | "custom" | "unknown";
  currency: "USD" | "EUR" | "RUB" | "GBP" | "JPY" | string;
  totals?: {
    expenses?: number;
    incomes?: number;
    savings?: number;
  };
  breakdown?: Array<{ budget: string; amount: number }>;
  topExpenses?: Array<{
    date: string;
    amount: number;
    budget: string;
    title: string;
  }>;
  advice?: Array<{ title: string; text: string }>;
  budgetPlan?: Array<{ budget: string; planned: number; actual?: number }>;
  comparison?: {
    periodA?: string;
    periodB?: string;
    delta?: number;
    details?: Array<{ budget: string; delta: number }>;
  };
  text?: string; // Человеческий краткий вывод для UI
  meta?: {
    promptVersion: string;
    locale?: string;
    tokensApprox?: number;
  };
}

// JSON Schema (для возможной валидации в будущем)
export const SpendlyAssistantResponseV1Schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://spendly.app/schemas/assistant-response.v1.json",
  type: "object",
  properties: {
    intent: { type: "string" },
    period: { type: "string" },
    currency: { type: "string" },
    totals: {
      type: "object",
      properties: {
        expenses: { type: "number" },
        incomes: { type: "number" },
        savings: { type: "number" },
      },
      additionalProperties: false,
    },
    breakdown: {
      type: "array",
      items: {
        type: "object",
        properties: {
          budget: { type: "string" },
          amount: { type: "number" },
        },
        required: ["budget", "amount"],
        additionalProperties: false,
      },
    },
    topExpenses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          amount: { type: "number" },
          budget: { type: "string" },
          title: { type: "string" },
        },
        required: ["date", "amount", "budget", "title"],
        additionalProperties: false,
      },
    },
    advice: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          text: { type: "string" },
        },
        required: ["title", "text"],
        additionalProperties: false,
      },
    },
    budgetPlan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          budget: { type: "string" },
          planned: { type: "number" },
          actual: { type: "number" },
        },
        required: ["budget", "planned"],
        additionalProperties: false,
      },
    },
    comparison: {
      type: "object",
      properties: {
        periodA: { type: "string" },
        periodB: { type: "string" },
        delta: { type: "number" },
        details: {
          type: "array",
          items: {
            type: "object",
            properties: {
              budget: { type: "string" },
              delta: { type: "number" },
            },
            required: ["budget", "delta"],
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
    text: { type: "string" },
    meta: {
      type: "object",
      properties: {
        promptVersion: { type: "string" },
        locale: { type: "string" },
        tokensApprox: { type: "number" },
      },
      required: ["promptVersion"],
      additionalProperties: true,
    },
  },
  required: ["intent", "currency", "meta"],
  additionalProperties: true,
} as const;
