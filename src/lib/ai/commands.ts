// Парсинг команды добавления транзакции и санитаризация названия

import { normalizeBudgetName } from "@/lib/utils";
import type { BudgetFolder } from "@/types/ai";

export const parseAddCommand = (text: string, budgets: Array<BudgetFolder>) => {
  const lower = text.toLowerCase();

  // Поддержка валютных символов и запятой как десятичного разделителя
  const regex =
    /add\s+(?:(?:([a-z0-9\s-]+)\s+))?(?:[$€₽]?\s*)?(\d+(?:[.,]\d+)?)\s+(?:to|into)\s+([a-z0-9\s-]+)\s+budget/i;
  const match = lower.match(regex);
  if (!match) return null;

  const rawTitle = match[1] ? match[1].trim() : "Transaction";
  const amount = Number((match[2] || "0").replace(",", "."));
  const rawBudgetName = (match[3] || "").trim();

  if (!isFinite(amount) || amount <= 0) return null;

  const normalized = normalizeBudgetName(rawBudgetName);
  const found = budgets.find((b) => normalizeBudgetName(b.name) === normalized);

  const budget_folder_id = found ? found.id : null;
  const budget_name = found ? found.name : rawBudgetName;

  const safeTitle = sanitizeTitle(rawTitle);

  return {
    title: safeTitle,
    amount,
    budget_folder_id,
    budget_name,
  };
};

export function sanitizeTitle(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  const cleaned = trimmed.replace(/[^a-z0-9\s\-.,()#]/gi, "");
  const MAX_LEN = 60;
  return cleaned.length > MAX_LEN ? cleaned.slice(0, MAX_LEN) : cleaned;
}
