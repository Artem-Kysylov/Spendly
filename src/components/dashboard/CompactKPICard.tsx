import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Pencil, RotateCw } from "lucide-react";
import { formatCurrency } from "@/lib/chartUtils";
import TrendArrow from "@/components/ui-elements/TrendArrow";
import BudgetProgressBar from "@/components/ui-elements/BudgetProgressBar";
import { useMainBudget } from "@/hooks/useMainBudget";
import { useRecurringReserved } from "@/hooks/useRecurringReserved";
import { getFinancialMonthFullRange, getFinancialMonthStart } from "@/lib/dateUtils";

interface CompactKPICardProps {
  budget: number;
  totalExpenses: number;
  expensesTrend: number;
  onBudgetClick: () => void;
  showRenewalButton?: boolean;
  onRenewClick?: () => void;
  currency?: string;
}

export default function CompactKPICard({
  budget,
  totalExpenses,
  expensesTrend,
  onBudgetClick,
  showRenewalButton = false,
  onRenewClick,
  currency,
}: CompactKPICardProps) {
  const tDashboard = useTranslations("dashboard");
  const tBudgets = useTranslations("budgets");

  const {
    availableToSpend,
    budgetResetDay,
    carryover,
    incomeConfirmed,
    isLoading: isMainBudgetLoading,
  } = useMainBudget();

  const { upcomingRecurringSum } = useRecurringReserved();

  // When income is not confirmed, use base budget for daily safe-to-spend calculation
  // to avoid negative values from carryover affecting the calculation
  const effectiveBudget =
    incomeConfirmed && Number.isFinite(availableToSpend) && availableToSpend !== 0
      ? availableToSpend
      : budget;

  const { safeToSpend, daysLeft, pacePercent, safeSpendBalance } = useMemo(() => {
    const today = new Date();
    const resetDay = budgetResetDay || 1;
    const start = getFinancialMonthStart(resetDay, today);
    const { end } = getFinancialMonthFullRange(resetDay, today);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math.max(
      1,
      Math.ceil((end.getTime() - today.getTime()) / msPerDay),
    );
    const remaining = effectiveBudget - totalExpenses;
    const safeSpendBalance = remaining - upcomingRecurringSum;
    const safeToSpend = safeSpendBalance / daysLeft;
    const totalMs = Math.max(1, end.getTime() - start.getTime());
    const elapsedMs = Math.min(
      totalMs,
      Math.max(0, today.getTime() - start.getTime()),
    );
    const pacePercent = (elapsedMs / totalMs) * 100;
    return { safeToSpend, daysLeft, pacePercent, safeSpendBalance };
  }, [budgetResetDay, effectiveBudget, totalExpenses, upcomingRecurringSum]);

  const displayBudget =
    Number.isFinite(budget) && budget > 0 ? budget : effectiveBudget;

  const totalBudgetForProgress = incomeConfirmed ? effectiveBudget : displayBudget;
  const remainingBudget = totalBudgetForProgress - totalExpenses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 w-full min-w-0">
      {/* Card 1: Total Budget */}
      <div className="bg-card border border-border rounded-xl p-3 md:p-4 flex flex-col justify-between h-[120px] md:h-[150px] relative group">
        <div className="absolute top-3 right-3 flex items-center gap-2 md:gap-2">
          {showRenewalButton && onRenewClick && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground opacity-100 transition-colors hover:text-primary mr-5 md:mr-0"
              onClick={onRenewClick}
              aria-label={tDashboard("budgetRenewal.renewButtonLabel") ?? "Renew budget"}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{tDashboard("budgetRenewal.renewBadge")}</span>
            </button>
          )}
          <button
            type="button"
            className="cursor-pointer opacity-100 transition-opacity"
            onClick={onBudgetClick}
            aria-label={tBudgets("actions.edit") ?? "Edit budget"}
          >
            <Pencil className="text-muted-foreground w-4 h-4 hover:text-primary" />
          </button>
        </div>

        <div>
          <h3 className="text-[13px] md:text-sm font-medium text-muted-foreground">
            {tDashboard("counters.totalBudget")}
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl md:text-2xl font-bold text-foreground">
              {formatCurrency(displayBudget, currency)}
            </span>
            {carryover !== 0 && budget > 0 && (
              <span className="text-[11px] md:text-xs text-muted-foreground">
                {tDashboard("incomeConfirmation.rolloverBreakdown", {
                  amount: formatCurrency(carryover, currency),
                })}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <BudgetProgressBar
            spentAmount={totalExpenses}
            totalAmount={totalBudgetForProgress}
            type="expense"
            currency={currency}
            className="h-2"
            calmOverBudget={!isMainBudgetLoading}
            baseAmount={incomeConfirmed && carryover !== 0 && budget > 0 ? budget : undefined}
            rolloverAmount={incomeConfirmed && carryover !== 0 && budget > 0 ? carryover : undefined}
            pacePercent={isMainBudgetLoading ? undefined : pacePercent}
            reservedAmount={upcomingRecurringSum}
            showLabels={false}
          />
          <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
            <span>
              {formatCurrency(totalExpenses, currency)} {tBudgets("labels.spent")}
            </span>
            <div className="flex flex-col items-end">
              <span>
                {upcomingRecurringSum > 0 
                  ? `${formatCurrency(remainingBudget, currency)} ${tBudgets("labels.left")} (${formatCurrency(Math.max(0, safeSpendBalance), currency)} ${tDashboard("counters.safeToSpend")})`
                  : `${formatCurrency(remainingBudget, currency)} ${tBudgets("labels.left")}`
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Total Expenses */}
      <div className="bg-card border border-border rounded-xl p-3 md:p-4 flex flex-col justify-between h-[120px] md:h-[150px]">
        <div>
          <h3 className="text-[13px] md:text-sm font-medium text-muted-foreground">
            {tDashboard("counters.totalExpenses")}
          </h3>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold text-foreground">
              {formatCurrency(totalExpenses, currency)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TrendArrow trend={expensesTrend} variant="expense" />
        </div>
      </div>

      {/* Card 3: Daily Safe-to-Spend */}
      <div className="bg-card border border-border rounded-xl p-3 md:p-4 flex flex-col justify-between h-[120px] md:h-[150px]">
        <div>
          <h3 className="text-[13px] md:text-sm font-medium text-muted-foreground">
            {tDashboard("counters.dailySafeToSpend")}
          </h3>
          <div className="mt-2">
            <span
              className={`text-xl md:text-2xl font-bold ${safeSpendBalance <= 0 ? "text-orange-500" : "text-foreground"}`}
            >
              {formatCurrency(Math.max(0, safeToSpend), currency)}
            </span>
          </div>
        </div>
        <div className="text-[10px] md:text-xs text-muted-foreground">
          {tDashboard("counters.daysLeftInMonth", { days: daysLeft })}
        </div>
      </div>
    </div>
  );
}
