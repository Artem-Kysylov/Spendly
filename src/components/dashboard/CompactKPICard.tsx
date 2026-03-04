import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/chartUtils";
import TrendArrow from "@/components/ui-elements/TrendArrow";
import BudgetProgressBar from "@/components/ui-elements/BudgetProgressBar";
import { useMainBudget } from "@/hooks/useMainBudget";
import { getFinancialMonthFullRange, getFinancialMonthStart } from "@/lib/dateUtils";

interface CompactKPICardProps {
  budget: number;
  totalExpenses: number;
  expensesTrend: number;
  onBudgetClick: () => void;
  currency?: string;
}

export default function CompactKPICard({
  budget,
  totalExpenses,
  expensesTrend,
  onBudgetClick,
  currency,
}: CompactKPICardProps) {
  const tDashboard = useTranslations("dashboard");
  const tBudgets = useTranslations("budgets");

  const { availableToSpend, budgetResetDay, carryover, incomeConfirmed } =
    useMainBudget();

  const effectiveBudget =
    Number.isFinite(availableToSpend) && availableToSpend !== 0
      ? availableToSpend
      : budget;

  const { safeToSpend, daysLeft, pacePercent } = useMemo(() => {
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
    const safeToSpend = remaining / daysLeft;
    const totalMs = Math.max(1, end.getTime() - start.getTime());
    const elapsedMs = Math.min(
      totalMs,
      Math.max(0, today.getTime() - start.getTime()),
    );
    const pacePercent = (elapsedMs / totalMs) * 100;
    return { safeToSpend, daysLeft, pacePercent };
  }, [budgetResetDay, effectiveBudget, totalExpenses]);

  const remainingBudget = effectiveBudget - totalExpenses;
  const isOverBudget = remainingBudget < 0;

  const displayBudget =
    Number.isFinite(budget) && budget > 0 ? budget : effectiveBudget;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 w-full min-w-0">
      {/* Card 1: Total Budget */}
      <div className="bg-card border border-border rounded-xl p-3 md:p-4 flex flex-col justify-between h-[110px] md:h-[140px] relative group">
        <button
          type="button"
          className="absolute top-3 right-3 cursor-pointer opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onBudgetClick}
          aria-label={tBudgets("actions.edit") ?? "Edit budget"}
        >
          <Pencil className="text-muted-foreground w-4 h-4 hover:text-primary" />
        </button>

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
            totalAmount={effectiveBudget}
            type="expense"
            currency={currency}
            className="h-2"
            calmOverBudget
            baseAmount={carryover !== 0 && budget > 0 ? budget : undefined}
            rolloverAmount={carryover !== 0 && budget > 0 ? carryover : undefined}
            pacePercent={pacePercent}
            showLabels={false}
          />
          <div className="flex justify-between text-[11px] md:text-xs text-muted-foreground">
            <span>
              {formatCurrency(totalExpenses, currency)} {tBudgets("labels.spent")}
            </span>
            <span>
              {formatCurrency(remainingBudget, currency)} {tBudgets("labels.left")}
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Total Expenses */}
      <div className="bg-card border border-border rounded-xl p-3 md:p-4 flex flex-col justify-between h-[110px] md:h-[140px]">
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
      <div className="bg-card border border-border rounded-xl p-3 md:p-4 flex flex-col justify-between h-[110px] md:h-[140px]">
        <div>
          <h3 className="text-[13px] md:text-sm font-medium text-muted-foreground">
            {tDashboard("counters.dailySafeToSpend")}
          </h3>
          <div className="mt-2">
            <span
              className={`text-xl md:text-2xl font-bold ${safeToSpend < 0 ? "text-red-500" : "text-foreground"}`}
            >
              {formatCurrency(safeToSpend, currency)}
            </span>
          </div>
        </div>
        <div className="text-[11px] md:text-xs text-muted-foreground">
          {tDashboard("counters.daysLeftInMonth", { days: daysLeft })}
        </div>
      </div>
    </div>
  );
}
