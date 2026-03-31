import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseAmountInput(input: string): number {
  const raw = String(input || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\d.,-]/g, "");

  if (!raw) return Number.NaN;

  const onlyCommaThousands = /^-?\d{1,3}(,\d{3})+$/;
  const onlyDotThousands = /^-?\d{1,3}(\.\d{3})+$/;
  if (onlyCommaThousands.test(raw)) {
    const n = parseFloat(raw.replace(/,/g, ""));
    return Number.isFinite(n) ? n : Number.NaN;
  }
  if (onlyDotThousands.test(raw)) {
    const n = parseFloat(raw.replace(/\./g, ""));
    return Number.isFinite(n) ? n : Number.NaN;
  }

  const lastDot = raw.lastIndexOf(".");
  const lastComma = raw.lastIndexOf(",");

  const hasDot = lastDot !== -1;
  const hasComma = lastComma !== -1;

  let normalized: string;
  if (hasDot || hasComma) {
    // If there is only one separator and it's exactly like 1,234 (or 1.234), treat it as thousands separator.
    if (hasComma && !hasDot && raw.indexOf(",") === raw.lastIndexOf(",")) {
      const m = raw.match(/^-?\d{1,3},\d{3}$/);
      if (m) {
        const n = parseFloat(raw.replace(/,/g, ""));
        return Number.isFinite(n) ? n : Number.NaN;
      }
    }
    if (hasDot && !hasComma && raw.indexOf(".") === raw.lastIndexOf(".")) {
      const m = raw.match(/^-?\d{1,3}\.\d{3}$/);
      if (m) {
        const n = parseFloat(raw.replace(/\./g, ""));
        return Number.isFinite(n) ? n : Number.NaN;
      }
    }

    const decimalSep = !hasComma
      ? "."
      : !hasDot
        ? ","
        : lastDot > lastComma
          ? "."
          : ",";

    const parts = raw.split(decimalSep);
    const intPart = parts.slice(0, -1).join("").replace(/[.,]/g, "");
    const fracPart = parts[parts.length - 1].replace(/[.,]/g, "");
    normalized = `${intPart}.${fracPart}`;
  } else {
    normalized = raw;
  }

  if (
    !normalized ||
    normalized === "-" ||
    normalized === "." ||
    normalized === "-."
  ) {
    return Number.NaN;
  }

  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function isValidAmountInput(input: string): boolean {
  const s = String(input || "").trim();
  if (!s) return false;
  const n = parseAmountInput(s);
  return Number.isFinite(n) && n > 0;
}

export function normalizeBudgetName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD") // Unicode decomposition
    .replace(/[\u0300-\u036f]/g, "") // Strip diacritics
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // Сохраняем любые буквы/цифры/пробелы/дефисы
    .replace(/\s+/g, " ") // Collapse spaces
    .trim();
}

const GENERIC_BUDGET_ALIASES: Record<string, string[]> = {
  food: ["food", "groceries", "grocery", "restaurant", "restaurants", "cafe", "cafes", "coffee", "pizza", "еда", "продукты", "продукти", "кафе", "рестораны", "ресторан", "їжа", "харчі"],
  transport: ["transport", "taxi", "uber", "bolt", "metro", "bus", "fuel", "gas", "транспорт", "такси", "таксі", "метро", "автобус", "бензин", "паливо"],
  shopping: ["shopping", "shop", "store", "clothes", "shoes", "покупки", "магазин", "одежда", "одяг", "взуття", "шопинг", "шопінг"],
  entertainment: ["entertainment", "movie", "cinema", "concert", "theater", "театр", "кино", "кіно", "концерт", "игры", "ігри"],
  unbudgeted: ["unbudgeted", "other", "misc", "прочее", "інше"],
};

function getBudgetMatchTerms(input: string): string[] {
  const normalized = normalizeBudgetName(input);
  if (!normalized) return [];

  const aliases = GENERIC_BUDGET_ALIASES[normalized] || [];
  return Array.from(new Set([normalized, ...aliases.map(normalizeBudgetName)])).filter(Boolean);
}

export function findMatchingBudget<T extends { name: string; type?: string }>(
  budgets: T[],
  categoryOrBudgetName: string,
): T | undefined {
  const normalizedTarget = normalizeBudgetName(categoryOrBudgetName);
  const matchTerms = getBudgetMatchTerms(categoryOrBudgetName);
  const expenseBudgets = budgets.filter((budget) => budget.type !== "income");

  let bestMatch: T | undefined;
  let bestScore = -1;

  for (const budget of expenseBudgets) {
    const normalizedBudget = normalizeBudgetName(budget.name);
    if (!normalizedBudget) continue;

    let score = 0;

    if (normalizedTarget && normalizedBudget === normalizedTarget) {
      score = 100;
    } else if (
      normalizedTarget &&
      (normalizedBudget.includes(normalizedTarget) || normalizedTarget.includes(normalizedBudget))
    ) {
      score = 80;
    } else {
      for (const term of matchTerms) {
        if (!term) continue;
        if (normalizedBudget === term) {
          score = Math.max(score, 70);
        } else if (normalizedBudget.includes(term) || term.includes(normalizedBudget)) {
          score = Math.max(score, 60);
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = budget;
    }
  }

  return bestScore > 0 ? bestMatch : undefined;
}
