"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  last_renewal_date: string | null;
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
  const [incomeConfirmed, setIncomeConfirmed] = useState<boolean>(false);
  const [lastRenewalDate, setLastRenewalDate] = useState<string | null>(null);
  const [renewalSnoozeUntil, setRenewalSnoozeUntil] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMainBudget = useCallback(async () => {
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
        .select("cycle_start_date, carryover, last_base_budget, income_confirmed, snooze_until, last_renewal_date")
        .eq("user_id", userId)
        .maybeSingle();

      if (stateError && stateError.code !== "PGRST116") {
        console.error("Error fetching budget state:", stateError);
      }

      const state = stateData as MainBudgetState | null;
      const storedCycleStart = state?.cycle_start_date;
      const storedCarryover = Number(state?.carryover ?? 0);
      const storedLastBase = Number(state?.last_base_budget ?? baseBudget);
      const storedIncomeConfirmed = state?.income_confirmed ?? false;
      const snoozeUntil = state?.snooze_until;
      const storedLastRenewalDate = state?.last_renewal_date ?? null;

      setLastRenewalDate(storedLastRenewalDate);
      setRenewalSnoozeUntil(snoozeUntil ?? null);

      if (!state) {
        const initialIncomeConfirmed = enableConfirmation ? false : true;
        const { error: initError } = await supabase
          .from("main_budget_state")
          .upsert(
            {
              user_id: userId,
              cycle_start_date: currentCycleStartISO,
              carryover: 0,
              last_base_budget: baseBudget,
              income_confirmed: initialIncomeConfirmed,
              snooze_until: null,
            },
            { onConflict: "user_id" },
          );

        if (initError) {
          console.error("Error initializing budget state:", initError);
        }

        setCarryover(0);
        setAvailableToSpend(enableConfirmation ? 0 : baseBudget);
        setIncomeConfirmed(initialIncomeConfirmed);

        const isSnoozed = false;
        setNeedsIncomeConfirmation(enableConfirmation && !initialIncomeConfirmed && !isSnoozed);
        return;
      }

      if (storedCycleStart) {
        const storedStartDate = new Date(`${storedCycleStart}T00:00:00`);
        if (Number.isFinite(storedStartDate.getTime())) {
          const probeDate = new Date(storedStartDate);
          probeDate.setDate(probeDate.getDate() + 1);

          const expectedStoredStart = getFinancialMonthStart(resetDay, probeDate);
          const expectedStoredStartISO = formatDateOnly(expectedStoredStart);

          if (expectedStoredStartISO !== storedCycleStart) {
            const nextIncomeConfirmed = enableConfirmation ? false : true;
            const { error: upsertError } = await supabase
              .from("main_budget_state")
              .upsert(
                {
                  user_id: userId,
                  cycle_start_date: currentCycleStartISO,
                  carryover: 0,
                  last_base_budget: baseBudget,
                  income_confirmed: nextIncomeConfirmed,
                  snooze_until: null,
                },
                { onConflict: "user_id" },
              );

            if (upsertError) {
              console.error(
                "Error resetting budget state after reset day redefinition:",
                upsertError,
              );
            }

            setCarryover(0);
            setAvailableToSpend(nextIncomeConfirmed ? baseBudget : 0);
            setIncomeConfirmed(nextIncomeConfirmed);

            const isSnoozed = false;
            setNeedsIncomeConfirmation(enableConfirmation && !nextIncomeConfirmed && !isSnoozed);
            return;
          }
        }
      }

      if (storedCycleStart === currentCycleStartISO && storedLastBase !== baseBudget) {
        const { error: upsertError } = await supabase
          .from("main_budget_state")
          .upsert(
            {
              user_id: userId,
              cycle_start_date: currentCycleStartISO,
              last_base_budget: baseBudget,
              carryover: storedCarryover,
              income_confirmed: storedIncomeConfirmed,
              snooze_until: snoozeUntil ?? null,
            },
            { onConflict: "user_id" },
          );

        if (upsertError) {
          console.error("Error resetting carryover after budget change:", upsertError);
        }

        const isSnoozed = !!(snoozeUntil && new Date(snoozeUntil) > now);
        const shouldConfirm = enableConfirmation && !storedIncomeConfirmed && !isSnoozed;

        setCarryover(storedCarryover);
        setIncomeConfirmed(storedIncomeConfirmed);
        setAvailableToSpend(
          storedIncomeConfirmed ? baseBudget + storedCarryover : storedCarryover,
        );
        setNeedsIncomeConfirmation(shouldConfirm);
        return;
      }

      const storedStartDate = storedCycleStart
        ? new Date(`${storedCycleStart}T00:00:00`)
        : null;
      const currentStartDate = new Date(`${currentCycleStartISO}T00:00:00`);

      if (
        storedStartDate &&
        Number.isFinite(storedStartDate.getTime()) &&
        currentStartDate.getTime() < storedStartDate.getTime()
      ) {
        const nextIncomeConfirmed = enableConfirmation ? false : true;
        const { error: upsertError } = await supabase
          .from("main_budget_state")
          .upsert(
            {
              user_id: userId,
              cycle_start_date: currentCycleStartISO,
              carryover: 0,
              last_base_budget: baseBudget,
              income_confirmed: nextIncomeConfirmed,
              snooze_until: null,
            },
            { onConflict: "user_id" },
          );

        if (upsertError) {
          console.error("Error resetting budget state after reset day change:", upsertError);
        }

        setCarryover(0);
        setAvailableToSpend(nextIncomeConfirmed ? baseBudget : 0);
        setIncomeConfirmed(nextIncomeConfirmed);

        const isSnoozed = false;
        setNeedsIncomeConfirmation(enableConfirmation && !nextIncomeConfirmed && !isSnoozed);
        return;
      }

      // Check if we crossed into a new cycle
      if (storedCycleStart !== currentCycleStartISO) {
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

        const computedCarryover = storedLastBase - spentPrev;
        const nextIncomeConfirmed = enableConfirmation ? false : true;

        // Upsert new cycle state
        const { error: upsertError } = await supabase
          .from("main_budget_state")
          .upsert(
            {
              user_id: userId,
              cycle_start_date: currentCycleStartISO,
              carryover: computedCarryover,
              last_base_budget: baseBudget,
              income_confirmed: nextIncomeConfirmed,
              snooze_until: null,
            },
            { onConflict: "user_id" },
          );

        if (upsertError) {
          console.error("Error upserting budget state:", upsertError);
        }

        setCarryover(computedCarryover);
        setIncomeConfirmed(nextIncomeConfirmed);

        const isSnoozed = false;
        const shouldConfirm = enableConfirmation && !nextIncomeConfirmed && !isSnoozed;
        setAvailableToSpend(
          nextIncomeConfirmed
            ? baseBudget + computedCarryover
            : computedCarryover,
        );
        setNeedsIncomeConfirmation(shouldConfirm);
      } else {
        const isSnoozed = !!(snoozeUntil && new Date(snoozeUntil) > now);
        const shouldConfirm = enableConfirmation && !storedIncomeConfirmed && !isSnoozed;

        setCarryover(storedCarryover);
        setIncomeConfirmed(storedIncomeConfirmed);
        setAvailableToSpend(
          storedIncomeConfirmed ? baseBudget + storedCarryover : storedCarryover,
        );
        setNeedsIncomeConfirmation(shouldConfirm);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch main budget";
      console.error("Error:", err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchMainBudget();
  }, [fetchMainBudget]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => fetchMainBudget();
    window.addEventListener("main_budget:updated", handler);
    return () => window.removeEventListener("main_budget:updated", handler);
  }, [fetchMainBudget]);

  const isNewCycle = useMemo(() => {
    if (!budgetResetDay) return false;
    const now = new Date();
    const currentCycleStart = getFinancialMonthStart(budgetResetDay, now);

    if (!lastRenewalDate) {
      return formatDateOnly(now) === formatDateOnly(currentCycleStart);
    }

    const lastRenewal = new Date(lastRenewalDate);
    return now >= currentCycleStart && lastRenewal < currentCycleStart;
  }, [lastRenewalDate, budgetResetDay]);

  const isRenewalSnoozed = useMemo(() => {
    if (!renewalSnoozeUntil) return false;
    const snoozeDate = new Date(renewalSnoozeUntil);
    return Number.isFinite(snoozeDate.getTime()) && snoozeDate > new Date();
  }, [renewalSnoozeUntil]);

  const showRenewalModal = useMemo(() => {
    return isNewCycle && !isRenewalSnoozed;
  }, [isNewCycle, isRenewalSnoozed]);

  const showRenewalButton = useMemo(() => {
    return isNewCycle && isRenewalSnoozed;
  }, [isNewCycle, isRenewalSnoozed]);

  return {
    mainBudget,
    availableToSpend,
    budgetResetDay,
    carryover,
    incomeConfirmed,
    needsIncomeConfirmation,
    isNewCycle,
    showRenewalModal,
    showRenewalButton,
    lastRenewalDate,
    isLoading,
    error,
    refetch: fetchMainBudget,
  };
};
