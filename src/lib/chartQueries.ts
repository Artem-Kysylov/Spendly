import { supabase } from "./supabaseClient";
import { ChartFilters, ChartPeriod } from "@/types/types";

// Типы данных для запросов
export interface TransactionData {
  id: string;
  amount: number;
  type: "expense" | "income";
  created_at: string;
  budget_folder_id: string | null;
  budget_folders?:
    | {
        id: string;
        name: string;
        emoji: string;
        color_code?: string | null;
      }
    | {
        id: string;
        name: string;
        emoji: string;
        color_code?: string | null;
      }[];
}

export interface AggregatedData {
  period: string;
  expenses: number;
  income: number;
  total: number;
}

// Ключи для кэширования запросов
export const chartQueryKeys = {
  all: ["charts"] as const,
  transactions: (filters: ChartFilters) =>
    [...chartQueryKeys.all, "transactions", filters] as const,
  aggregated: (filters: ChartFilters, period: ChartPeriod) =>
    [...chartQueryKeys.all, "aggregated", filters, period] as const,
};

// Основной запрос для получения транзакций
export const fetchTransactions = async (
  userId: string,
  filters: ChartFilters,
): Promise<TransactionData[]> => {
  let query = supabase
    .from("transactions")
    .select(`
      id,
      amount,
      type,
      created_at,
      budget_folder_id,
      budget_folders (
        id,
        name,
        emoji,
        color_code
      )
    `)
    .eq("user_id", userId)
    .gte("created_at", filters.startDate.toISOString())
    .lte("created_at", filters.endDate.toISOString())
    .order("created_at", { ascending: true });

  // Фильтрация по типу данных
  if (filters.dataType === "Expenses") {
    query = query.eq("type", "expense");
  } else if (filters.dataType === "Income") {
    query = query.eq("type", "income");
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching transactions:", error);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return data || [];
};

// Агрегация данных по периодам
export const aggregateDataByPeriod = (
  transactions: TransactionData[],
  period: ChartPeriod,
): AggregatedData[] => {
  const grouped = transactions.reduce(
    (acc, transaction) => {
      let periodKey: string;

      const date = new Date(transaction.created_at);

      if (period === "Week") {
        // Группировка по неделям
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay()); // Начало недели (воскресенье)
        periodKey = startOfWeek.toISOString().split("T")[0];
      } else if (period === "Month") {
        // Группировка по месяцам
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        // По умолчанию группировка по дням
        periodKey = transaction.created_at.split("T")[0];
      }

      if (!acc[periodKey]) {
        acc[periodKey] = { expenses: 0, income: 0 };
      }

      if (transaction.type === "expense") {
        acc[periodKey].expenses += transaction.amount;
      } else {
        acc[periodKey].income += transaction.amount;
      }

      return acc;
    },
    {} as Record<string, { expenses: number; income: number }>,
  );

  return Object.entries(grouped)
    .map(([period, totals]) => ({
      period,
      expenses: totals.expenses,
      income: totals.income,
      total: totals.expenses + totals.income,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
};

// Получение статистики за период
export const fetchPeriodStats = async (
  userId: string,
  filters: ChartFilters,
): Promise<{
  totalExpenses: number;
  totalIncome: number;
  transactionCount: number;
  categoriesCount: number;
}> => {
  const transactions = await fetchTransactions(userId, filters);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const uniqueCategories = new Set(
    transactions.map((t) => t.budget_folder_id).filter(Boolean),
  );

  return {
    totalExpenses,
    totalIncome,
    transactionCount: transactions.length,
    categoriesCount: uniqueCategories.size,
  };
};

// Предзагрузка данных для графиков
export const prefetchChartData = async (
  userId: string,
  filters: ChartFilters,
): Promise<void> => {
  await fetchTransactions(userId, filters);
};
