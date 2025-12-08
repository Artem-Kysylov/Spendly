// Парсинг команды добавления транзакции и санитаризация названия

import { normalizeBudgetName } from "@/lib/utils";
import type { BudgetFolder } from "@/types/ai";

export const parseAddCommand = (text: string, budgets: Array<BudgetFolder>) => {
  const lower = text.toLowerCase();

  // Поддержка разных языков (add/ad/добав../дод../tambah/追加/추가/जोड़..) и budget/бюджет
  const addWords =
    "(add|ad|добав(?:ить|ь)?|додат(?:и|ь)?|додай|tambah(?:kan)?|追加|추가|जोड़(?:ें)?)";
  const toWords = "(?:to|into|в|у|ke|に|에)";
  const budgetWords = "(?:budget|бюджет)";

  const regex = new RegExp(
    `${addWords}\\s+(?:(?:"([^"]+)"|([\\p{L}0-9\\s\\-.,()#]+))\\s+)?(?:[$€₽₹₴]?\\s*)?(\\d+(?:[.,]\\d+)?)\\s+${toWords}\\s+([\\p{L}0-9\\s\\-]+)\\s+${budgetWords}`,
    "iu",
  );
  const match = lower.match(regex);
  if (!match) return null;

  // Правильные индексы групп:
  const rawTitle = (match[2] || match[3]) ? (match[2] || match[3]).trim() : "Transaction";
  const amount = Number((match[4] || "0").replace(",", "."));
  const rawBudgetName = (match[5] || "").trim();

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
  // Разрешаем Unicode буквы, цифры и базовую пунктуацию
  const cleaned = trimmed.replace(/[^\p{L}0-9\s\-.,()#]/gu, "");
  const MAX_LEN = 60;
  return cleaned.length > MAX_LEN ? cleaned.slice(0, MAX_LEN) : cleaned;
}