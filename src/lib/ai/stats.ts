// Чистые функции статистики/агрегатов без форматирования и без доступа к данным

import type { Transaction } from "@/types/ai";

export function getWeekRange(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const day = now.getDay() === 0 ? 7 : now.getDay(); // 1..7 (Пн..Вс)
  const start = new Date(now);
  start.setDate(now.getDate() - (day - 1));
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  return { start, end };
}

export function getLastWeekRange(weekStart: Date): { start: Date; end: Date } {
  const start = new Date(weekStart);
  start.setDate(weekStart.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function filterByDateRange(
  txs: Transaction[],
  start: Date,
  end: Date,
): Transaction[] {
  return (txs || []).filter((tx) => {
    const d = new Date(tx.created_at);
    return d >= start && d <= end;
  });
}

export function sumExpenses(txs: Transaction[]): number {
  return (txs || [])
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
}

export function budgetTotals(
  txs: Transaction[],
  budgetNameById: Map<string, string>,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const tx of txs || []) {
    if (tx.type !== "expense") continue;
    const budgetName = tx.budget_folder_id
      ? budgetNameById.get(tx.budget_folder_id) || "Unknown"
      : "Unassigned";
    totals.set(
      budgetName,
      (totals.get(budgetName) || 0) + (Number(tx.amount) || 0),
    );
  }
  return totals;
}

export function topExpenses(txs: Transaction[], limit = 3): Transaction[] {
  return (txs || [])
    .filter((tx) => tx.type === "expense")
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, limit);
}

export function getThisMonthRange(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = now;
  return { start, end };
}

export function getLastMonthRange(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function compareMonthTotals(
  thisMonthTxs: Transaction[],
  lastMonthTxs: Transaction[],
) {
  const totalThis = sumExpenses(thisMonthTxs);
  const totalLast = sumExpenses(lastMonthTxs);
  const diff = totalThis - totalLast;
  return { totalThis, totalLast, diff };
}
