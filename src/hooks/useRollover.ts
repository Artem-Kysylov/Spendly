"use client";

import { useCallback } from "react";
import { BudgetRolloverSettings, MonthlyBudgetCategory } from "@/types/types";
import {
  applyToNextMonth,
  shouldApplyRollover,
  previousMonthKey,
  currentMonthKey,
} from "@/lib/budgetRollover";

type ApplyArgs = {
  prev: Pick<MonthlyBudgetCategory, "allocated" | "spent">;
  baseAllocatedNext: number;
  settings: BudgetRolloverSettings;
};

export const useRollover = () => {
  const applyOnMonthOpen = useCallback((args: ApplyArgs) => {
    const targetMonth = currentMonthKey();
    const sourceMonth = previousMonthKey();
    if (!shouldApplyRollover(null, sourceMonth, targetMonth)) {
      return { allocatedNext: args.baseAllocatedNext, rolloverFromPrev: 0 };
    }
    return applyToNextMonth({
      baseAllocatedNext: args.baseAllocatedNext,
      previous: { allocated: args.prev.allocated, spent: args.prev.spent },
      settings: args.settings,
    });
  }, []);

  return { applyOnMonthOpen };
};
