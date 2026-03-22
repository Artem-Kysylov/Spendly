import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { Transaction } from "@/types/types";
import { getWeekStartDay } from "@/lib/getWeekStartDay";

interface UseInsightHeuristicsProps {
  budget: number;
  totalExpenses: number;
  transactions: Transaction[];
}

export type InsightType = "alert" | "praise" | "savings" | "default";

export interface InsightResult {
  type: InsightType;
  message: string;
}

export function useInsightHeuristics({
  budget,
  totalExpenses,
  transactions,
}: UseInsightHeuristicsProps): InsightResult {
  const t = useTranslations("dashboard.insights");
  const locale = useLocale();

  return useMemo(() => {
    // 1. Critical: Budget > 90% spent
    if (budget > 0 && totalExpenses / budget > 0.9) {
      return { type: "alert", message: t("critical") };
    }

    // 2. Positive: Weekly expenses < last week
    const now = new Date();
    const weekStartDay = getWeekStartDay(locale); // 0 for Sunday, 1 for Monday
    const dayOfWeek = now.getDay();
    
    // Calculate days from week start
    let daysFromWeekStart: number;
    if (weekStartDay === 0) {
      // Week starts on Sunday
      daysFromWeekStart = dayOfWeek;
    } else {
      // Week starts on Monday
      daysFromWeekStart = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    }
    
    const startOfThisWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysFromWeekStart,
    );
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(
      startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000,
    );
    const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1);

    const thisWeekExpenses = transactions
      .filter(
        (t) =>
          t.type === "expense" && new Date(t.created_at) >= startOfThisWeek,
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const lastWeekExpenses = transactions
      .filter((t) => {
        const d = new Date(t.created_at);
        return (
          t.type === "expense" && d >= startOfLastWeek && d <= endOfLastWeek
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Only show praise if we have data for last week and this week is actually lower
    // Also check that we're at least 2 days into the week to avoid false positives
    const daysIntoWeek = Math.floor((now.getTime() - startOfThisWeek.getTime()) / (1000 * 60 * 60 * 24));
    if (lastWeekExpenses > 0 && thisWeekExpenses < lastWeekExpenses && daysIntoWeek >= 2) {
      return { type: "praise", message: t("positive") };
    }

    // 3. Quiet Day: No transactions today
    const todayTransactions = transactions.filter((t) => {
      const d = new Date(t.created_at);
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });

    if (todayTransactions.length === 0) {
      return { type: "savings", message: t("quietDay") };
    }

    // 4. Default
    return { type: "default", message: t("default") };
  }, [budget, totalExpenses, transactions, t, locale]);
}
