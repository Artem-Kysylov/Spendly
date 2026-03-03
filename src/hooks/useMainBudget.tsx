"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { UserAuth } from "../context/AuthContext";
import {
  formatDateOnly,
  getFinancialMonthStart,
  getPreviousFinancialMonthFullRange,
} from "@/lib/dateUtils";

interface MainBudget {
  amount: number;
  user_id: string;
}

interface ProfileBudgetSettings {
  budget_reset_day: number | null;
  enable_income_confirmation: boolean | null;
}

interface MainBudgetState {
  cycle_start_date: string;
  carryover: number;
  last_base_budget: number;
  income_confirmed: boolean;
  snooze_until: string | null;
}

interface TransactionAmount {
  amount: number;
}

export const useMainBudget = () => {
  const { session } = UserAuth();
  const [mainBudget, setMainBudget] = useState<number>(0);
  const [availableToSpend, setAvailableToSpend] = useState<number>(0);
  const [budgetResetDay, setBudgetResetDay] = useState<number>(1);
  const [carryover, setCarryover] = useState<number>(0);
  const [needsIncomeConfirmation, setNeedsIncomeConfirmation] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMainBudget = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const userId = session.user.id;

      // Fetch main budget and profile settings in parallel
      const [budgetResult, profileResult] = await Promise.all([
        supabase
          .from("main_budget")
          .select("amount")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("budget_reset_day, enable_income_confirmation")
          .eq("id", userId)
          .maybeSingle(),
      ]);

      if (budgetResult.error) {
        console.error("Error fetching main budget:", budgetResult.error);
        setError(budgetResult.error.message);
        return;
      }

      if (profileResult.error) {
        console.error("Error fetching profile:", profileResult.error);
      }

      const baseBudget = budgetResult.data?.amount ?? 0;
      setMainBudget(baseBudget);

      const profileData = profileResult.data as ProfileBudgetSettings | null;
      const resetDayRaw = profileData?.budget_reset_day;
      const resetDay =
        typeof resetDayRaw === "number" && Number.isFinite(resetDayRaw)
          ? Math.min(31, Math.max(1, Math.floor(resetDayRaw)))
          : 1;
      setBudgetResetDay(resetDay);

      const enableConfirmation = profileData?.enable_income_confirmation ?? false;

      // Calculate current cycle start date
      const now = new Date();
      const currentCycleStart = getFinancialMonthStart(resetDay, now);
      const currentCycleStartISO = formatDateOnly(currentCycleStart);

      // Fetch or create budget state
      const { data: stateData, error: stateError } = await supabase
        .from("main_budget_state")
        .select("cycle_start_date, carryover, last_base_budget, income_confirmed, snooze_until")
        .eq("user_id", userId)
        .maybeSingle();

      if (stateError && stateError.code !== "PGRST116") {
        console.error("Error fetching budget state:", stateError);
      }

      const state = stateData as MainBudgetState | null;
      const storedCycleStart = state?.cycle_start_date;
      const storedCarryover = Number(state?.carryover ?? 0);
      const storedLastBase = Number(state?.last_base_budget ?? baseBudget);
      const incomeConfirmed = state?.income_confirmed ?? false;
      const snoozeUntil = state?.snooze_until;

      // Check if we crossed into a new cycle
      if (storedCycleStart !== currentCycleStartISO) {
        // New cycle detected - calculate carryover from previous cycle
        const prevRange = getPreviousFinancialMonthFullRange(resetDay, now);
        
        const { data: prevExpenses, error: prevError } = await supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("type", "expense")
          .gte("created_at", prevRange.start.toISOString())
          .lte("created_at", prevRange.end.toISOString());

        if (prevError) {
          console.error("Error fetching previous cycle expenses:", prevError);
        }

        const spentPrev = (prevExpenses || []).reduce(
          (sum: number, t: TransactionAmount) => sum + Number(t.amount || 0),
          0,
        );

        // Carryover = last cycle's base budget - spent in last cycle
        const computedCarryover = storedLastBase - spentPrev;

        // Upsert new cycle state
        const { error: upsertError } = await supabase
          .from("main_budget_state")
          .upsert(
            {
              user_id: userId,
              cycle_start_date: currentCycleStartISO,
              carryover: computedCarryover,
              last_base_budget: baseBudget,
              income_confirmed: false,
              snooze_until: null,
            },
            { onConflict: "user_id" },
          );

        if (upsertError) {
          console.error("Error upserting budget state:", upsertError);
        }

        setCarryover(computedCarryover);
        setAvailableToSpend(baseBudget + computedCarryover);

        // Check if income confirmation is needed
        const isSnoozed = snoozeUntil && new Date(snoozeUntil) > now;
        setNeedsIncomeConfirmation(enableConfirmation && !isSnoozed);
      } else {
        // Same cycle - use stored carryover
        setCarryover(storedCarryover);
        setAvailableToSpend(baseBudget + storedCarryover);

        // Check if income confirmation is needed
        const isSnoozed = snoozeUntil && new Date(snoozeUntil) > now;
        setNeedsIncomeConfirmation(
          enableConfirmation && !incomeConfirmed && !isSnoozed,
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch main budget";
      console.error("Error:", err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMainBudget();
  }, [session?.user?.id]);

  return {
    mainBudget,
    availableToSpend,
    budgetResetDay,
    carryover,
    needsIncomeConfirmation,
    isLoading,
    error,
    refetch: fetchMainBudget,
  };
};
