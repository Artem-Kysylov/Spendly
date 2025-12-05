"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { UserAuth } from "../context/AuthContext";
import {
  Transaction,
  ChartFilters,
  ChartPeriod,
  ChartDataType,
} from "@/types/types";
import type { ExpensesBarData } from "@/components/charts/TransactionsBarChart";

export interface UseTransactionsDataReturn {
  // Основные данные
  allTransactions: Transaction[];
  filteredTransactions: Transaction[];
  chartData: ExpensesBarData[];

  // Состояния загрузки
  isLoading: boolean;
  isChartLoading: boolean;
  error: string | null;

  // Функции управления
  refetch: () => Promise<void>;
  updateFilters: (newFilters: Partial<ChartFilters>) => void;

  // Текущие фильтры
  filters: ChartFilters;
}

// Хук для управления данными транзакций с фильтрацией
export const useTransactionsData = (
  initialFilters?: Partial<ChartFilters>,
): UseTransactionsDataReturn => {
  const { session } = UserAuth();

  // Состояния
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Фильтры с значениями по умолчанию
  const [filters, setFilters] = useState<ChartFilters>({
    period: "Week" as ChartPeriod,
    startDate: new Date(),
    endDate: new Date(),
    dataType: "Expenses" as ChartDataType,
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    ...initialFilters,
  });

  // Функция для получения всех транзакций
  const fetchTransactions = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select(`
          *,
          budget_folders (
            emoji,
            name
          )
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Error fetching transactions:", fetchError);
        setError("Failed to fetch transactions");
        return;
      }

      // Трансформируем данные для включения информации о категориях
      const transformedData =
        data?.map((transaction) => ({
          ...transaction,
          category_emoji: transaction.budget_folders?.emoji || null,
          category_name: transaction.budget_folders?.name || null,
        })) || [];

      setAllTransactions(transformedData);
    } catch (err) {
      console.error("Error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Функция для обновления фильтров
  const updateFilters = useCallback((newFilters: Partial<ChartFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Мемоизированные фильтрованные транзакции
  const filteredTransactions = useMemo(() => {
    if (!allTransactions.length) return [];

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    // Определяем диапазон дат на основе фильтра периода
    if (filters.period === "Week") {
      // Текущая неделя (понедельник - воскресенье)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

      startDate = new Date(today);
      startDate.setDate(today.getDate() + mondayOffset);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Выбранный месяц (по умолчанию текущий)
      const year = filters.selectedYear ?? now.getFullYear();
      const month = filters.selectedMonth ?? now.getMonth();
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    }

    // хелпер для отфильтровки по диапазону и типу
    const filterByRangeAndType = (rangeStart: Date, rangeEnd: Date) => {
      return allTransactions.filter((transaction) => {
        const transactionDate = new Date(transaction.created_at);
        const isInDateRange =
          transactionDate >= rangeStart && transactionDate <= rangeEnd;
        const isCorrectType =
          filters.dataType === "Expenses"
            ? transaction.type === "expense"
            : transaction.type === "income";
        return isInDateRange && isCorrectType;
      });
    };

    let result = filterByRangeAndType(startDate, endDate);

    // Фолбэк: если выбран "Month" и текущий месяц пуст — показать предыдущий месяц
    if (filters.period === "Month" && result.length === 0) {
      const baseYear = startDate.getFullYear();
      const baseMonth = startDate.getMonth();
      const prevMonth = (baseMonth + 11) % 12;
      const prevYear = baseMonth === 0 ? baseYear - 1 : baseYear;
      const prevStart = new Date(prevYear, prevMonth, 1);
      const prevEnd = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999);
      result = filterByRangeAndType(prevStart, prevEnd);
    }

    return result;
  }, [allTransactions, filters]);

  // Мемоизированные данные для чарта
  const chartData = useMemo(() => {
    if (!allTransactions.length) return [];

    setIsChartLoading(true);

    const now = new Date();
    const data: ExpensesBarData[] = [];

    if (filters.period === "Week") {
      // Генерируем данные по неделям (последние 4 недели)
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date();
        const dayOfWeek = weekStart.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        weekStart.setDate(weekStart.getDate() + mondayOffset - i * 7);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekTransactions = allTransactions.filter((transaction) => {
          const transactionDate = new Date(transaction.created_at);
          const isInWeek =
            transactionDate >= weekStart && transactionDate <= weekEnd;
          const isCorrectType =
            filters.dataType === "Expenses"
              ? transaction.type === "expense"
              : transaction.type === "income";

          return isInWeek && isCorrectType;
        });

        const totalAmount = weekTransactions.reduce(
          (sum, t) => sum + t.amount,
          0,
        );

        data.push({
          period: i === 0 ? "This Week" : `${i + 1} weeks ago`,
          amount: totalAmount,
          fill: "hsl(var(--primary))",
        });
      }
    } else {
      // Генерируем данные по месяцам (последние 4 месяца)
      for (let i = 3; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(
          now.getFullYear(),
          now.getMonth() - i + 1,
          0,
          23,
          59,
          59,
          999,
        );

        const monthTransactions = allTransactions.filter((transaction) => {
          const transactionDate = new Date(transaction.created_at);
          const isInMonth =
            transactionDate >= monthStart && transactionDate <= monthEnd;
          const isCorrectType =
            filters.dataType === "Expenses"
              ? transaction.type === "expense"
              : transaction.type === "income";

          return isInMonth && isCorrectType;
        });

        const totalAmount = monthTransactions.reduce(
          (sum, t) => sum + t.amount,
          0,
        );

        data.push({
          period:
            i === 0
              ? "This Month"
              : monthStart.toLocaleDateString("en-US", { month: "short" }),
          amount: totalAmount,
          fill: "hsl(var(--primary))",
        });
      }
    }

    // Имитируем небольшую задержку для плавности UX
    setTimeout(() => setIsChartLoading(false), 100);

    return data;
  }, [allTransactions, filters]);

  // Эффект для первоначальной загрузки данных
  useEffect(() => {
    if (session?.user?.id) {
      fetchTransactions();
    }
  }, [session?.user?.id, fetchTransactions]);

  useEffect(() => {
    const handler = () => fetchTransactions();
    window.addEventListener("budgetTransactionAdded", handler);
    return () => window.removeEventListener("budgetTransactionAdded", handler);
  }, [fetchTransactions]);

  return {
    allTransactions,
    filteredTransactions,
    chartData,
    isLoading,
    isChartLoading,
    error,
    refetch: fetchTransactions,
    updateFilters,
    filters,
  };
};

// Дополнительный хук для статистики транзакций
export const useTransactionsStats = (transactions: Transaction[]) => {
  return useMemo(() => {
    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const transactionCount = transactions.length;

    const averageExpense =
      totalExpenses > 0
        ? totalExpenses /
          transactions.filter((t) => t.type === "expense").length
        : 0;

    const averageIncome =
      totalIncome > 0
        ? totalIncome / transactions.filter((t) => t.type === "income").length
        : 0;

    return {
      totalExpenses,
      totalIncome,
      transactionCount,
      averageExpense,
      averageIncome,
      netAmount: totalIncome - totalExpenses,
    };
  }, [transactions]);
};
