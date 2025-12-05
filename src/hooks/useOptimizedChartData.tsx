"use client";

import { useEffect } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { UserAuth } from "../context/AuthContext";
import {
  LineChartData,
  BarChartData,
  ChartFilters,
  UseChartDataReturn,
} from "@/types/types";
import {
  fetchTransactions,
  aggregateDataByPeriod,
  fetchPeriodStats,
  chartQueryKeys,
  TransactionData,
} from "@/lib/chartQueries";
import { defaultChartColors } from "@/lib/chartUtils";

// Оптимизированный хук для данных Line Chart с кэшированием
export const useOptimizedLineChartData = (
  filters: ChartFilters,
): UseChartDataReturn<LineChartData> => {
  const { session } = UserAuth();

  const {
    data: transactions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: chartQueryKeys.transactions(filters),
    queryFn: () => fetchTransactions(session!.user.id, filters),
    enabled: !!session?.user?.id,
    staleTime: 3 * 60 * 1000,
  });

  const { data: periodData = [] } = useQuery({
    queryKey: chartQueryKeys.aggregated(filters, filters.period),
    queryFn: () => aggregateDataByPeriod(transactions, filters.period),
    enabled: transactions.length > 0,
    staleTime: 3 * 60 * 1000,
  });

  // Преобразование в формат LineChartData (date + amount)
  const lineData: LineChartData[] = periodData
    .map((item) => {
      const dateObj = parsePeriodToDate(item.period, filters.period);
      const amount =
        filters.dataType === "Expenses"
          ? item.expenses
          : filters.dataType === "Income"
            ? item.income
            : item.total;

      return {
        date: dateObj.toISOString().split("T")[0],
        amount,
        formattedDate: formatPeriodLabel(dateObj, filters.period),
      };
    })
    .filter((d) => d.amount > 0);

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("budgetTransactionAdded", handler);
    return () => window.removeEventListener("budgetTransactionAdded", handler);
  }, [refetch]);

  return {
    data: lineData,
    isLoading,
    error: (error as Error)?.message || null,
    refetch,
  };
};

// Оптимизированный хук для данных Bar Chart с кэшированием
export const useOptimizedBarChartData = (
  filters: ChartFilters,
): UseChartDataReturn<BarChartData> => {
  const { session } = UserAuth();

  const {
    data: transactions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: chartQueryKeys.transactions(filters),
    queryFn: () => fetchTransactions(session!.user.id, filters),
    enabled: !!session?.user?.id,
    staleTime: 3 * 60 * 1000,
  });

  // Агрегация по категориям из transactions
  const categoryTotals = (transactions as TransactionData[]).reduce(
    (
      acc: Record<
        string,
        {
          expenses: number;
          income: number;
          emoji?: string;
          color_code?: string | null;
        }
      >,
      t,
    ) => {
      const folder = Array.isArray(t.budget_folders)
        ? t.budget_folders[0]
        : t.budget_folders;
      const emoji = folder?.emoji ?? "";
      const name = folder?.name ?? "Unbudgeted";
      const color_code = folder?.color_code ?? null;
      const categoryName = `${emoji} ${name}`.trim();

      if (!acc[categoryName]) {
        acc[categoryName] = { expenses: 0, income: 0, emoji, color_code };
      }
      if (t.type === "expense") {
        acc[categoryName].expenses += t.amount ?? 0;
      } else {
        acc[categoryName].income += t.amount ?? 0;
      }
      return acc;
    },
    {},
  );

  // Преобразование в формат BarChartData
  const colors = Object.values(defaultChartColors);
  const barData: BarChartData[] = Object.entries(categoryTotals)
    .map(([category, totals], index) => {
      const amount =
        filters.dataType === "Expenses" ? totals.expenses : totals.income;
      return {
        category,
        amount,
        fill: totals.color_code
          ? `#${totals.color_code}`
          : colors[index % colors.length],
        emoji: totals.emoji,
      };
    })
    .filter((item) => item.amount > 0);

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("budgetTransactionAdded", handler);
    return () => window.removeEventListener("budgetTransactionAdded", handler);
  }, [refetch]);

  return {
    data: barData,
    isLoading,
    error: (error as Error)?.message || null,
    refetch,
  };
};

// Оптимизированный хук для всех данных графиков
export const useOptimizedAllChartsData = (filters: ChartFilters) => {
  const { session } = UserAuth();

  const results = useQueries({
    queries: [
      {
        queryKey: chartQueryKeys.transactions(filters),
        queryFn: () => fetchTransactions(session!.user.id, filters),
        enabled: !!session?.user?.id,
        staleTime: 3 * 60 * 1000,
      },
      {
        queryKey: [...chartQueryKeys.all, "stats", filters],
        queryFn: () => fetchPeriodStats(session!.user.id, filters),
        enabled: !!session?.user?.id,
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const [transactionsQuery, statsQuery] = results;

  const lineChart = useOptimizedLineChartData(filters);
  const barChart = useOptimizedBarChartData(filters);

  return {
    lineChart,
    barChart,
    stats: statsQuery.data,
    isLoading: transactionsQuery.isLoading || statsQuery.isLoading,
    error: transactionsQuery.error || statsQuery.error,
    refetchAll: () => {
      transactionsQuery.refetch();
      statsQuery.refetch();
      lineChart.refetch();
      barChart.refetch();
    },
  };
};

// Вспомогательные функции для преобразования периодов к датам/лейблам
const parsePeriodToDate = (
  periodStr: string,
  periodType: ChartFilters["period"],
): Date => {
  if (periodType === "Month") {
    const [yearStr, monthStr] = periodStr.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    return new Date(year, month, 1);
  }
  // Week: periodStr уже ISO (начало недели)
  return new Date(periodStr);
};

const formatPeriodLabel = (
  date: Date,
  periodType: ChartFilters["period"],
): string => {
  if (periodType === "Month") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  // Week: показываем день/месяц
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatPeriodForDisplay = (
  period: string,
  periodType: ChartFilters["period"],
): string => {
  if (periodType === "Week") {
    return `Week ${period}`;
  }
  if (periodType === "Month") {
    return period;
  }
  return period;
};
