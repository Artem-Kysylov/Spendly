import React from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/chartUtils";
import useDeviceType from "@/hooks/useDeviceType";

interface BudgetProgressBarProps {
  spentAmount: number;
  totalAmount: number;
  type?: "expense" | "income";
  className?: string;
  spentLabel?: string;
  leftLabel?: string;
  currency?: string;
  accentColorHex?: string;
  compact?: boolean;
  showLabels?: boolean;
  calmOverBudget?: boolean;
  baseAmount?: number;
  rolloverAmount?: number;
  pacePercent?: number;
}

function BudgetProgressBar({
  spentAmount,
  totalAmount,
  type,
  className,
  spentLabel,
  leftLabel,
  currency = "USD",
  accentColorHex,
  compact = false,
  showLabels = true,
  calmOverBudget = false,
  baseAmount,
  rolloverAmount,
  pacePercent,
}: BudgetProgressBarProps) {
  const { isMobile } = useDeviceType();
  const budgetType: "expense" | "income" = type ?? "expense";
  
  const pace =
    typeof pacePercent === "number" && Number.isFinite(pacePercent)
      ? Math.max(0, Math.min(100, pacePercent))
      : null;

  const percentage = totalAmount > 0 ? (spentAmount / totalAmount) * 100 : 0;
  
  const displayPercentage = (() => {
    if (calmOverBudget && pace !== null && budgetType === "expense" && totalAmount > 0 && percentage < 100) {
      const expectedSpent = (pace / 100) * totalAmount;
      const spendingRatio = expectedSpent > 0 ? spentAmount / expectedSpent : 0;
      return spendingRatio * pace;
    }
    return percentage;
  })();

  const remainingAmount = Math.max(totalAmount - spentAmount, 0);
  const isOverBudget = budgetType === "expense" && totalAmount > 0 && spentAmount > totalAmount;

  const baseCap = Number.isFinite(baseAmount) ? Math.max(Number(baseAmount), 0) : 0;
  const rolloverCap = Number.isFinite(rolloverAmount)
    ? Math.max(Number(rolloverAmount), 0)
    : 0;

  const hasSegments =
    budgetType === "expense" &&
    totalAmount > 0 &&
    baseCap > 0 &&
    rolloverCap > 0 &&
    Math.abs(baseCap + rolloverCap - totalAmount) <= Math.max(1, totalAmount * 0.02);

  const basePct = hasSegments ? (baseCap / totalAmount) * 100 : 0;
  const rolloverPct = hasSegments ? (rolloverCap / totalAmount) * 100 : 0;

  const spentInBase = hasSegments ? Math.min(spentAmount, baseCap) : 0;
  const spentInRollover = hasSegments
    ? Math.min(Math.max(spentAmount - baseCap, 0), rolloverCap)
    : 0;

  const baseSpentPct = hasSegments ? (spentInBase / totalAmount) * 100 : 0;
  const rolloverSpentPct = hasSegments ? (spentInRollover / totalAmount) * 100 : 0;

  const displayBaseSpentPct = (() => {
    if (hasSegments && calmOverBudget && pace !== null && budgetType === "expense") {
      const ratio = displayPercentage / Math.max(percentage, 0.01);
      return Math.min(baseSpentPct * ratio, basePct);
    }
    return baseSpentPct;
  })();

  const displayRolloverSpentPct = (() => {
    if (hasSegments && calmOverBudget && pace !== null && budgetType === "expense") {
      const ratio = displayPercentage / Math.max(percentage, 0.01);
      return Math.max(0, Math.min(rolloverSpentPct * ratio, rolloverPct));
    }
    return rolloverSpentPct;
  })();

  const isColoredCard = Boolean(accentColorHex);

  const isPaceApplicable =
    pace !== null &&
    budgetType === "expense" &&
    totalAmount > 0 &&
    displayPercentage >= 0 &&
    displayPercentage < 100 &&
    pace > 0 &&
    pace < 100;
  const paceDelta = isPaceApplicable ? displayPercentage - pace : 0;

  const getProgressColor = () => {
    if (percentage >= 100) {
      return budgetType === "expense" ? "bg-red-500" : "bg-green-500";
    }

    if (budgetType === "expense") {
      if (percentage >= 90) return "bg-red-500";
      if (percentage >= 80) return "bg-amber-500";

      if (calmOverBudget && isPaceApplicable) {
        if (paceDelta > 20) return "bg-red-500";
        if (paceDelta > 10) return "bg-amber-500";
      }

      return "bg-primary";
    }

    if (calmOverBudget && isPaceApplicable) {
      // Show red if overpacing by more than 20%
      if (paceDelta > 20) {
        return "bg-red-500";
      }
      // Show amber if overpacing by more than 10%
      if (paceDelta > 10) {
        return "bg-amber-500";
      }
    }

    return isColoredCard ? "bg-primary" : "bg-primary";
  };

  const getBackgroundColor = () => {
    if (isColoredCard) return "bg-white";
    if (percentage >= 100) {
      return budgetType === "expense"
        ? "bg-red-100 dark:bg-red-900/20"
        : "bg-green-100 dark:bg-green-900/20";
    }
    return "bg-blue-100 dark:bg-primary/20";
  };

  const rolloverFillClass =
    percentage >= 100
      ? getProgressColor()
      : "bg-indigo-500/90 dark:bg-indigo-400/90";

  const labelColorClass = isColoredCard
    ? "text-black dark:text-black"
    : "text-gray-700 dark:text-white";
  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      {/* Компактный режим (мобилка): только трек */}
      {isMobile && compact ? (
        <div
          className={cn(
            "relative h-2.5 w-full overflow-hidden rounded-full transition-colors duration-300",
            getBackgroundColor(),
          )}
        >
          {hasSegments ? (
            <>
              <div className="absolute inset-0 flex">
                <div
                  className="h-full bg-blue-100 dark:bg-primary/20"
                  style={{ width: `${basePct}%` }}
                />
                <div
                  className="h-full bg-indigo-100 dark:bg-indigo-900/20"
                  style={{ width: `${rolloverPct}%` }}
                />
              </div>
              <div
                className={cn(
                  "absolute left-0 top-0 h-full transition-all duration-500 ease-in-out rounded-full",
                  getProgressColor(),
                )}
                style={{ width: `${Math.min(displayBaseSpentPct, 100)}%` }}
              />
              {displayRolloverSpentPct > 0 && (
                <div
                  className={cn(
                    "absolute top-0 h-full transition-all duration-500 ease-in-out",
                    rolloverFillClass,
                  )}
                  style={{ left: `${basePct}%`, width: `${displayRolloverSpentPct}%` }}
                />
              )}
              {isPaceApplicable && (
                <div
                  className="absolute top-0 z-20 h-full w-[2px] -translate-x-1/2 bg-foreground/25 dark:bg-white/25"
                  style={{ left: `${pace}%` }}
                />
              )}
              {isOverBudget && (
                <div className="absolute right-0 top-0 h-full w-1.5 bg-red-500/80" />
              )}
            </>
          ) : (
            <>
              <div
                className={cn(
                  "h-full transition-all duration-500 ease-in-out rounded-full",
                  getProgressColor(),
                )}
                style={{ width: `${Math.min(displayPercentage, 100)}%` }}
              />
              {isPaceApplicable && (
                <div
                  className="absolute top-0 z-20 h-full w-[2px] -translate-x-1/2 bg-foreground/25 dark:bg-white/25"
                  style={{ left: `${pace}%` }}
                />
              )}
              {isOverBudget && (
                <div className="absolute right-0 top-0 h-full w-1.5 bg-red-500/80" />
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {/* Стандартная верстка */}
          <div
            className={cn(
              "relative h-2.5 w-full overflow-hidden rounded-full transition-colors duration-300",
              getBackgroundColor(),
            )}
          >
            {hasSegments ? (
              <>
                <div className="absolute inset-0 flex">
                  <div
                    className="h-full bg-blue-100 dark:bg-primary/20"
                    style={{ width: `${basePct}%` }}
                  />
                  <div
                    className="h-full bg-indigo-100 dark:bg-indigo-900/20"
                    style={{ width: `${rolloverPct}%` }}
                  />
                </div>
                <div
                  className={cn(
                    "absolute left-0 top-0 h-full transition-all duration-500 ease-in-out rounded-full",
                    getProgressColor(),
                  )}
                  style={{ width: `${Math.min(displayBaseSpentPct, 100)}%` }}
                />
                {displayRolloverSpentPct > 0 && (
                  <div
                    className={cn(
                      "absolute top-0 h-full transition-all duration-500 ease-in-out",
                      rolloverFillClass,
                    )}
                    style={{ left: `${basePct}%`, width: `${displayRolloverSpentPct}%` }}
                  />
                )}
                {isPaceApplicable && (
                  <div
                    className="absolute top-0 z-20 h-full w-[2px] -translate-x-1/2 bg-foreground/25 dark:bg-white/25"
                    style={{ left: `${pace}%` }}
                  />
                )}
                {isOverBudget && !calmOverBudget && (
                  <div className="absolute right-0 top-0 h-full w-1.5 bg-red-500/80" />
                )}
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "h-full transition-all duration-500 ease-in-out rounded-full",
                    getProgressColor(),
                  )}
                  style={{ width: `${Math.min(displayPercentage, 100)}%` }}
                />
                {isPaceApplicable && (
                  <div
                    className="absolute top-0 z-20 h-full w-[2px] -translate-x-1/2 bg-foreground/25 dark:bg-white/25"
                    style={{ left: `${pace}%` }}
                  />
                )}
                {isOverBudget && !calmOverBudget && (
                  <div className="absolute right-0 top-0 h-full w-1.5 bg-red-500/80" />
                )}
              </>
            )}
          </div>
          {showLabels && (
            <div className={cn("grid grid-cols-2 text-xs", labelColorClass)}>
              <span className="font-medium text-left justify-self-start">
                {formatCurrency(spentAmount, currency)}{" "}
                {spentLabel ??
                  (budgetType === "income" ? "collected" : "spent")}
              </span>
              <span className="text-right justify-self-end">
                {formatCurrency(remainingAmount, currency)}{" "}
                {leftLabel ??
                  (budgetType === "income" ? "left to goal" : "left")}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BudgetProgressBar;
