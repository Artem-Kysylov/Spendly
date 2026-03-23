"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserAuth } from "@/context/AuthContext";
import { useMainBudget } from "@/hooks/useMainBudget";
import { getFinancialMonthFullRange } from "@/lib/dateUtils";
import { getPaymentDateForMonth } from "@/lib/calculateRecurringDates";

interface RecurringTransaction {
  id: string;
  title: string;
  amount: number;
  type: "expense" | "income";
  recurrence_day: number;
}

export const useRecurringReserved = () => {
  const { session } = UserAuth();
  const { budgetResetDay } = useMainBudget();
  const [upcomingRecurringSum, setUpcomingRecurringSum] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateUpcomingRecurring = useCallback(async () => {
    if (!session?.user?.id) {
      setUpcomingRecurringSum(0);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const userId = session.user.id;
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      // Get financial month boundaries
      const { end } = getFinancialMonthFullRange(budgetResetDay || 1, now);

      // Fetch all active recurring transactions
      const { data: recurringTxs, error: recurringError } = await supabase
        .from("transactions")
        .select("id, title, amount, type, recurrence_day")
        .eq("user_id", userId)
        .eq("is_recurring", true);

      if (recurringError) {
        console.error("Error fetching recurring transactions:", recurringError);
        setError(recurringError.message);
        setUpcomingRecurringSum(0);
        return;
      }

      if (!recurringTxs || recurringTxs.length === 0) {
        setUpcomingRecurringSum(0);
        return;
      }

      const transactions = recurringTxs as RecurringTransaction[];
      let totalReserved = 0;

      for (const tx of transactions) {
        const cycleOccurrenceDates: Date[] = [];
        const startMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

        const currentMonthOccurrence = getPaymentDateForMonth(
          tx.recurrence_day,
          startMonth.getMonth(),
          startMonth.getFullYear(),
        );

        if (currentMonthOccurrence) {
          cycleOccurrenceDates.push(currentMonthOccurrence);
        }

        if (
          endMonth.getFullYear() !== startMonth.getFullYear() ||
          endMonth.getMonth() !== startMonth.getMonth()
        ) {
          const endMonthOccurrence = getPaymentDateForMonth(
            tx.recurrence_day,
            endMonth.getMonth(),
            endMonth.getFullYear(),
          );

          if (endMonthOccurrence) {
            cycleOccurrenceDates.push(endMonthOccurrence);
          }
        }

        for (const occurrenceDate of cycleOccurrenceDates) {
          const occurrenceStart = new Date(occurrenceDate);
          occurrenceStart.setHours(0, 0, 0, 0);

          if (occurrenceStart < todayStart || occurrenceStart > end) {
            continue;
          }

          // If today's recurring payment has already been materialized into a regular transaction,
          // don't reserve it again.
          if (occurrenceStart.getTime() === todayStart.getTime()) {
            const nextDayStart = new Date(todayStart);
            nextDayStart.setDate(nextDayStart.getDate() + 1);

            const { data: existing } = await supabase
              .from("transactions")
              .select("id")
              .eq("user_id", userId)
              .eq("is_recurring", false)
              .eq("title", tx.title)
              .eq("amount", tx.amount)
              .eq("type", tx.type)
              .gte("created_at", todayStart.toISOString())
              .lt("created_at", nextDayStart.toISOString())
              .limit(1);

            if (existing && existing.length > 0) {
              continue;
            }
          }

          if (tx.type === "expense") {
            totalReserved += Math.abs(Number(tx.amount));
          }
        }
      }

      setUpcomingRecurringSum(totalReserved);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to calculate recurring reserved";
      console.error("Error calculating recurring reserved:", err);
      setError(errorMessage);
      setUpcomingRecurringSum(0);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, budgetResetDay]);

  useEffect(() => {
    calculateUpcomingRecurring();
  }, [calculateUpcomingRecurring]);

  // Listen for transaction updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => calculateUpcomingRecurring();
    window.addEventListener("main_budget:updated", handler);
    return () => window.removeEventListener("main_budget:updated", handler);
  }, [calculateUpcomingRecurring]);

  return {
    upcomingRecurringSum,
    isLoading,
    error,
    refetch: calculateUpcomingRecurring,
  };
};
