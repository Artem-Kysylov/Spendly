// Компонент AIInsights
import React from "react";
import { Brain, Lightbulb, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { formatCurrency } from "../../lib/chartUtils";

interface AIInsightsProps {
  totalExpenses: number;
  totalIncome: number;
  budget: number;
  netBalance: number;
  expensesTrend: number;
  incomeTrend: number;
  className?: string;
}

const AIInsights = ({
  totalExpenses,
  totalIncome,
  budget,
  netBalance,
  expensesTrend,
  incomeTrend,
  className,
}: AIInsightsProps) => {
  const tAssistant = useTranslations("assistant");

  const generateInsights = () => {
    const insights = [];

    if (budget > 0) {
      const budgetUsage = (totalExpenses / budget) * 100;
      if (budgetUsage > 100) {
        insights.push({
          type: "warning" as const,
          icon: AlertTriangle,
          title: tAssistant("insights.messages.budgetExceeded.title"),
          message: tAssistant("insights.messages.budgetExceeded.message", {
            over: formatCurrency(totalExpenses - budget),
          }),
        });
      } else if (budgetUsage > 80) {
        insights.push({
          type: "warning" as const,
          icon: AlertTriangle,
          title: tAssistant("insights.messages.budgetAlert.title"),
          message: tAssistant("insights.messages.budgetAlert.message", {
            usedPercent: budgetUsage.toFixed(1),
          }),
        });
      }
    }

    if (expensesTrend > 20) {
      insights.push({
        type: "warning" as const,
        icon: TrendingUp,
        title: tAssistant("insights.messages.risingExpenses.title"),
        message: tAssistant("insights.messages.risingExpenses.message", {
          trend: expensesTrend.toFixed(1),
        }),
      });
    }

    if (incomeTrend > 10) {
      insights.push({
        type: "positive" as const,
        icon: TrendingUp,
        title: tAssistant("insights.messages.incomeGrowth.title"),
        message: tAssistant("insights.messages.incomeGrowth.message", {
          trend: incomeTrend.toFixed(1),
        }),
      });
    }

    if (netBalance < 0) {
      insights.push({
        type: "warning" as const,
        icon: AlertTriangle,
        title: tAssistant("insights.messages.negativeCashFlow.title"),
        message: tAssistant("insights.messages.negativeCashFlow.message"),
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: "positive" as const,
        icon: Lightbulb,
        title: tAssistant("insights.messages.financialHealth.title"),
        message: tAssistant("insights.messages.financialHealth.message"),
      });
    }

    return insights.slice(0, 2);
  };

  const insights = generateInsights();

  if (insights.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="text-sm font-medium text-black dark:text-white">
          {tAssistant("insights.title")}
        </h3>
        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
          {tAssistant("insights.beta")}
        </span>
      </div>

      {insights.map((insight, index) => {
        const Icon = insight.icon;
        return (
          <div
            key={index}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border",
              insight.type === "warning"
                ? "bg-yellow-50 border-yellow-200"
                : "bg-green-50 border-green-200",
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4 mt-0.5 flex-shrink-0",
                insight.type === "warning"
                  ? "text-yellow-600"
                  : "text-green-600",
              )}
            />
            <div className="flex-1 min-w-0">
              <h4
                className={cn(
                  "text-sm font-medium",
                  insight.type === "warning"
                    ? "text-yellow-800"
                    : "text-green-800",
                )}
              >
                {insight.title}
              </h4>
              <p
                className={cn(
                  "text-xs mt-1",
                  insight.type === "warning"
                    ? "text-yellow-700"
                    : "text-green-700",
                )}
              >
                {insight.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AIInsights;
