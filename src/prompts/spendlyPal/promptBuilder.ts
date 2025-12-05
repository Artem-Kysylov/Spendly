// Text-only prompt builder: formats strings using precomputed aggregates.
// No DB access, no heavy calculations.

import { PROMPT_VERSION } from "./promptVersion";
import {
  EN_EMPTY_THIS_WEEK,
  EN_EMPTY_LAST_WEEK,
  EN_EMPTY_THIS_MONTH,
  EN_EMPTY_LAST_MONTH,
} from "./canonicalPhrases";
import { sanitizeTitle } from "@/lib/ai/commands";
import type { AssistantTone } from "@/types/ai";

type Budget = {
  id: string;
  name: string;
  emoji?: string;
  type: "expense" | "income";
  amount?: number;
};
type Transaction = {
  title: string;
  amount: number;
  type: "expense" | "income";
  budget_folder_id: string | null;
  created_at: string;
};

export function currencySymbol(currency?: string): string {
  const c = (currency || "").toUpperCase();
  switch (c) {
    case "EUR":
      return "€";
    case "RUB":
      return "₽";
    case "GBP":
      return "£";
    case "JPY":
      return "¥";
    case "USD":
      return "$";
    default:
      return "$";
  }
}

export function buildRecurringSummary(args: {
  candidates: Array<{
    title_pattern: string;
    avg_amount: number;
    cadence: "weekly" | "monthly";
    next_due_date: string;
    count: number;
  }>;
  currency?: string;
}): string {
  const symbol = currencySymbol(args.currency);
  if (!args.candidates || args.candidates.length === 0) {
    return "RecurringCharges:\nnone";
  }
  const top = args.candidates
    .slice()
    .sort((a, b) => b.avg_amount - a.avg_amount)
    .slice(0, 7)
    .map((c) => {
      const cad = c.cadence === "weekly" ? "weekly" : "monthly";
      return `${cad}: ${c.title_pattern} ~ ${symbol}${Number(c.avg_amount).toFixed(2)} | next: ${c.next_due_date} | count: ${c.count}`;
    });
  return ["RecurringCharges:", ...top.map((x) => `• ${x}`)].join("\n");
}

export function buildInstructions(opts: {
  locale?: string;
  currency?: string;
  intent?:
    | "unknown"
    | "save_advice"
    | "analyze_spending"
    | "biggest_expenses"
    | "compare_months"
    | "create_budget_plan";
  promptVersion?: string;
  tone?: AssistantTone;
}): string {
  const locale = opts?.locale || "en-US";
  const currency = (opts?.currency || "USD").toUpperCase();
  const pv = opts?.promptVersion || PROMPT_VERSION;

  const isRu = locale.toLowerCase().startsWith("ru");
  const weeklyNone = isRu
    ? EN_EMPTY_THIS_WEEK /* en text used for instruction keys, content is plain text output */
    : EN_EMPTY_THIS_WEEK;
  const weeklyNoneLast = isRu ? EN_EMPTY_LAST_WEEK : EN_EMPTY_LAST_WEEK;
  const monthlyNone = isRu ? EN_EMPTY_THIS_MONTH : EN_EMPTY_THIS_MONTH;
  const monthlyNoneLast = isRu ? EN_EMPTY_LAST_MONTH : EN_EMPTY_LAST_MONTH;

  const intentExtra =
    opts.intent === "save_advice"
      ? isRu
        ? "Если просят советы по экономии — опирайся на агрегаты по бюджетам и укажи, где можно сократить траты. Будь краток."
        : "If asked for saving advice, use budget aggregates and point to where expenses can be reduced. Keep it concise."
      : opts.intent === "analyze_spending"
        ? isRu
          ? "Если просят анализ — кратко опиши паттерны расходов по бюджетам и топовым затратам."
          : "If asked for analysis, briefly describe spending patterns across budgets and top expenses."
        : opts.intent === "compare_months"
          ? isRu
            ? "Если просят сравнение месяцев — сравни итоги текущего и прошлого месяца и укажи разницу."
            : "If asked to compare months, compare totals for this and last month and state the difference."
          : opts.intent === "create_budget_plan"
            ? isRu
              ? "Если просят создать план бюджета — предложи распределение по 4–6 категориям на основе текущих трат (50/30/20 как ориентир). Укажи проценты и суммы, отметь риски (перерасход, подписки), добавь 1–2 шага: установить лимиты, цель сбережений."
              : "If asked to create a budget plan — propose allocations across 4–6 categories using current spending as context (50/30/20 as a baseline). Provide percentages and amounts, note risks (overspending, subscriptions), and add 1–2 actionable steps: set limits, define a savings goal."
            : "";

  const toneMapEn: Record<AssistantTone, string> = {
    neutral: "Use a neutral, straightforward tone.",
    friendly: "Use a friendly, encouraging tone.",
    formal: "Use a formal, professional tone.",
    playful: "Use a playful, upbeat tone.",
  };
  const toneMapRu: Record<AssistantTone, string> = {
    neutral: "Используй нейтральный, прямой тон.",
    friendly: "Используй дружелюбный, поддерживающий тон.",
    formal: "Используй формальный, профессиональный тон.",
    playful: "Используй игривый, позитивный тон.",
  };
  const toneDirective = opts.tone
    ? isRu
      ? toneMapRu[opts.tone]
      : toneMapEn[opts.tone]
    : "";

  return [
    "You are a helpful finance assistant.",
    toneDirective,
    "Respond in the user’s language.",
    "Format using Markdown. Separate sections with a blank line.",
    "Start sections with bold headings, e.g., **This Week**, **Budget breakdown**, **Transactions**, **Top expenses**, **Insight**.",
    'Lists: use hyphen bullets "- " with ONE item per line. Do NOT use "*" or "•".',
    'Transactions section: print each transaction on its own line as "- YYYY-MM-DD — Budget — Title — **$amount**".',
    "Use a simple Markdown table only for comparisons (e.g. months or budgets).",
    "Use only the data provided below. Do not invent transactions, merchants, categories, or amounts.",
    "Do not use JSON or code fences unless explicitly asked for code.",
    "When the request is weekly, summarize ThisWeek/LastWeek sections. When monthly, summarize ThisMonth/LastMonth.",
    `If the requested weekly period has "none", reply exactly: "${weeklyNone}" or "${weeklyNoneLast}".`,
    `If the requested monthly period has "none", reply exactly: "${monthlyNone}" or "${monthlyNoneLast}".`,
    "Include key numbers: totals, budget totals, and top expenses. Add one short insight if helpful.",
    isRu
      ? "Если показываешь подписки — кратко отметь оптимизацию."
      : "If recurring charges are listed — add brief optimization tips.",
    intentExtra,
    `Currency: ${currency}. PromptVersion: ${pv}.`,
  ].join(" ");
}

function formatTxLines(
  txs: Transaction[],
  symbol: string,
  budgetNameById: Map<string, string>,
): string {
  return txs
    .slice(0, 50)
    .map((tx) => {
      const d = new Date(tx.created_at);
      const dateStr = d.toISOString().slice(0, 10);
      const budgetNameRaw = tx.budget_folder_id
        ? budgetNameById.get(tx.budget_folder_id) || "Unknown"
        : "Unassigned";
      const budgetName = sanitizeTitle(budgetNameRaw);
      const amt = Number(tx.amount) || 0;
      const safeTitle = sanitizeTitle(tx.title || "Transaction");
      return `${dateStr} | ${tx.type} | ${symbol}${amt.toFixed(2)} | budget: ${budgetName} | title: ${safeTitle}`;
    })
    .join("\n");
}

function formatBudgetTotalsLines(
  budgetTotals: Map<string, number>,
  symbol: string,
): string {
  return Array.from(budgetTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, total]) => `${name}: ${symbol}${total.toFixed(2)}`)
    .join("\n");
}

function formatTopExpensesLines(
  txs: Transaction[],
  symbol: string,
  budgetNameById: Map<string, string>,
): string {
  return txs
    .slice(0, 3)
    .map((tx) => {
      const d = new Date(tx.created_at).toISOString().slice(0, 10);
      const budgetNameRaw = tx.budget_folder_id
        ? budgetNameById.get(tx.budget_folder_id) || "Unknown"
        : "Unassigned";
      const budgetName = sanitizeTitle(budgetNameRaw);
      const safeTitle = sanitizeTitle(tx.title || "Transaction");
      return `${d} | ${symbol}${Number(tx.amount).toFixed(2)} | ${budgetName} | ${safeTitle}`;
    })
    .join("\n");
}

export function buildWeeklySections(args: {
  weekStartISO: string;
  weekEndISO: string;
  lastWeekStartISO: string;
  lastWeekEndISO: string;
  thisWeekTotal: number;
  lastWeekTotal: number;
  budgetTotalsThisWeek: Map<string, number>;
  budgetTotalsLastWeek: Map<string, number>;
  txsThisWeek: Transaction[];
  txsLastWeek: Transaction[];
  topThisWeek: Transaction[];
  topLastWeek: Transaction[];
  currency?: string;
  budgetNameById: Map<string, string>;
}): string {
  const symbol = currencySymbol(args.currency);
  const budgetTotalsThisWeekLines =
    formatBudgetTotalsLines(args.budgetTotalsThisWeek, symbol) || "none";
  const budgetTotalsLastWeekLines =
    formatBudgetTotalsLines(args.budgetTotalsLastWeek, symbol) || "none";
  const txThisWeekLines =
    formatTxLines(args.txsThisWeek, symbol, args.budgetNameById) || "none";
  const txLastWeekLines =
    formatTxLines(args.txsLastWeek, symbol, args.budgetNameById) || "none";
  const topThisWeekLines =
    formatTopExpensesLines(args.topThisWeek, symbol, args.budgetNameById) ||
    "none";
  const topLastWeekLines =
    formatTopExpensesLines(args.topLastWeek, symbol, args.budgetNameById) ||
    "none";

  return [
    `ThisWeekStart: ${args.weekStartISO}; ThisWeekEnd: ${args.weekEndISO}.`,
    `TotalThisWeek: ${symbol}${args.thisWeekTotal.toFixed(2)}.`,
    `BudgetTotalsThisWeek:\n${budgetTotalsThisWeekLines}`,
    `TransactionsThisWeek:\n${txThisWeekLines}`,
    `TopExpensesThisWeek:\n${topThisWeekLines}`,
    `LastWeekStart: ${args.lastWeekStartISO}; LastWeekEnd: ${args.lastWeekEndISO}.`,
    `TotalLastWeek: ${symbol}${args.lastWeekTotal.toFixed(2)}.`,
    `BudgetTotalsLastWeek:\n${budgetTotalsLastWeekLines}`,
    `TransactionsLastWeek:\n${txLastWeekLines}`,
    `TopExpensesLastWeek:\n${topLastWeekLines}`,
  ].join("\n");
}

export function buildMonthlySections(args: {
  thisMonthStartISO: string;
  thisMonthEndISO: string;
  lastMonthStartISO: string;
  lastMonthEndISO: string;
  totalThisMonth: number;
  totalLastMonth: number;
  diff: number;
  budgetTotalsThisMonth: Map<string, number>;
  budgetTotalsLastMonth: Map<string, number>;
  topThisMonth: Transaction[];
  topLastMonth: Transaction[];
  currency?: string;
  budgetNameById: Map<string, string>;
}): string {
  const symbol = currencySymbol(args.currency);
  const budgetTotalsThisMonthLines =
    formatBudgetTotalsLines(args.budgetTotalsThisMonth, symbol) || "none";
  const budgetTotalsLastMonthLines =
    formatBudgetTotalsLines(args.budgetTotalsLastMonth, symbol) || "none";
  const topThisMonthLines =
    formatTopExpensesLines(args.topThisMonth, symbol, args.budgetNameById) ||
    "none";
  const topLastMonthLines =
    formatTopExpensesLines(args.topLastMonth, symbol, args.budgetNameById) ||
    "none";

  return [
    `ThisMonthStart: ${args.thisMonthStartISO}; ThisMonthEnd: ${args.thisMonthEndISO}.`,
    `TotalThisMonth: ${symbol}${args.totalThisMonth.toFixed(2)}.`,
    `BudgetTotalsThisMonth:\n${budgetTotalsThisMonthLines}`,
    `TopExpensesThisMonth:\n${topThisMonthLines}`,
    `LastMonthStart: ${args.lastMonthStartISO}; LastMonthEnd: ${args.lastMonthEndISO}.`,
    `TotalLastMonth: ${symbol}${args.totalLastMonth.toFixed(2)}.`,
    `BudgetTotalsLastMonth:\n${budgetTotalsLastMonthLines}`,
    `TopExpensesLastMonth:\n${topLastMonthLines}`,
    `CompareMonths: ThisMonth=${symbol}${args.totalThisMonth.toFixed(2)} vs LastMonth=${symbol}${args.totalLastMonth.toFixed(2)}; Diff=${symbol}${args.diff.toFixed(2)}.`,
  ].join("\n");
}

export function buildPrompt(params: {
  budgets: Budget[];
  budgetsSummary?: string;
  instructions: string;
  weeklySection: string;
  monthlySection: string;
  userMessage: string;
  maxChars?: number;
  // Новое: секция подписок (необязательно)
  recurringSection?: string;
}): string {
  const budgetsSummary =
    params.budgetsSummary ??
    (params.budgets || [])
      .map((b) => `${sanitizeTitle(b.name)} (${b.type})`)
      .slice(0, 15)
      .join(", ");

  const full = [
    params.instructions,
    `Known budgets: ${budgetsSummary || "none"}.`,
    params.weeklySection,
    params.monthlySection,
    params.recurringSection ? params.recurringSection : "",
    `User: ${params.userMessage}`,
  ].join("\n");

  if (params.maxChars && full.length > params.maxChars) {
    // Compact variant
    const compact = [
      params.instructions,
      `Known budgets: ${budgetsSummary || "none"}.`,
      // Keep most useful lines in short output
      ...params.weeklySection
        .split("\n")
        .filter(
          (line) =>
            line.startsWith("TotalThisWeek:") ||
            line.startsWith("BudgetTotalsThisWeek:") ||
            line.startsWith("TopExpensesThisWeek:"),
        ),
      ...params.monthlySection
        .split("\n")
        .filter(
          (line) =>
            line.startsWith("TotalThisMonth:") ||
            line.startsWith("BudgetTotalsThisMonth:") ||
            line.startsWith("TopExpensesThisMonth:"),
        ),
      // Also include last period totals to aid LLM
      ...params.weeklySection
        .split("\n")
        .filter(
          (line) =>
            line.startsWith("TotalLastWeek:") ||
            line.startsWith("BudgetTotalsLastWeek:"),
        ),
      ...params.monthlySection
        .split("\n")
        .filter(
          (line) =>
            line.startsWith("TotalLastMonth:") ||
            line.startsWith("BudgetTotalsLastMonth:"),
        ),
      ...params.monthlySection
        .split("\n")
        .filter((line) => line.startsWith("CompareMonths:")),
      `User: ${params.userMessage}`,
    ].join("\n");
    return compact;
  }
  return full;
}
