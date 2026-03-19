"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserAuth } from "@/context/AuthContext";
import { useMainBudget } from "@/hooks/useMainBudget";
import { getFinancialMonthFullRange } from "@/lib/dateUtils";

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
      const today = now.getDate();

      // Get financial month boundaries
      const { start, end } = getFinancialMonthFullRange(budgetResetDay || 1, now);

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

      // Get last day of current month
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      for (const tx of transactions) {
        // Determine effective recurrence day (handle month-end edge cases)
        const effectiveDay = tx.recurrence_day > lastDayOfMonth 
          ? lastDayOfMonth 
          : tx.recurrence_day;

        // Only count if recurrence day is today or in the future this month
        if (effectiveDay < today) {
          continue;
        }

        // Check if this recurring transaction was already processed today
        // Look for a matching non-recurring transaction created in the last 2 hours
        const sinceIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        
        const { data: existing } = await supabase
          .from("transactions")
          .select("id")
          .eq("user_id", userId)
          .eq("is_recurring", false)
          .eq("title", tx.title)
          .eq("amount", tx.amount)
          .eq("type", tx.type)
          .gte("created_at", sinceIso)
          .limit(1);

        // If already processed, skip this recurring transaction
        if (existing && existing.length > 0) {
          continue;
        }

        // Add to reserved amount (only expenses reduce safe-to-spend)
        if (tx.type === "expense") {
          totalReserved += Math.abs(Number(tx.amount));
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
