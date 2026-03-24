"use client";

import { Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { motion } from "motion/react";
import type { BudgetInsightCardProps } from "@/types/types";
import { formatCurrency } from "@/lib/chartUtils";

export default function SpendlyPalInsightCard({
  insight,
  currency,
  onDismiss,
}: BudgetInsightCardProps) {
  const tBudgets = useTranslations("budgets");
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await onDismiss(insight.id);
    } catch (error) {
      console.error("Failed to dismiss insight:", error);
      setIsDismissing(false);
    }
  };

  const formattedAmount = formatCurrency(insight.amount_saved, currency);
  const message = tBudgets("spendlyPal.savingsMessage", {
    amount: formattedAmount,
    budgetName: insight.budget_name || "Budget",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-lg border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            {insight.budget_emoji && (
              <span className="mr-1">{insight.budget_emoji}</span>
            )}
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          disabled={isDismissing}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-200 hover:text-foreground disabled:opacity-50 dark:hover:bg-zinc-800"
          aria-label={tBudgets("spendlyPal.dismiss")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
