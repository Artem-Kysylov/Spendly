"use client";

import { useTranslations } from "next-intl";
import type React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChartPeriod } from "@/types/types";

export interface TransactionsFilterProps {
  transactionType: "Expenses" | "Income";
  onTransactionTypeChange: (type: "Expenses" | "Income") => void;
  datePeriod: ChartPeriod;
  onDatePeriodChange: (period: ChartPeriod) => void;
  className?: string;
}

const TransactionsFilter: React.FC<TransactionsFilterProps> = ({
  transactionType,
  onTransactionTypeChange,
  datePeriod,
  onDatePeriodChange,
  className = "",
}) => {
  const tTransactions = useTranslations("transactions");
  const tCharts = useTranslations("charts");
  const _tModals = useTranslations("modals");
  const tFilters = useTranslations("filters");
  return (
    <div
      className={`flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 ${className}`}
    >
      {/* Type Selector */}
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <span className="text-sm font-medium text-secondary-black dark:text-white">
          {tTransactions("table.headers.type")}
        </span>
        <div className="relative">
          <Select
            value={transactionType}
            onValueChange={(v) =>
              onTransactionTypeChange(v as "Expenses" | "Income")
            }
          >
            <SelectTrigger className="w-full sm:min-w-[140px] bg-white dark:bg-background text-black dark:text-white pl-4 pr-[40px] h-[50px] rounded-md appearance-none border border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Expenses">
                {tCharts("labels.expenses")}
              </SelectItem>
              <SelectItem value="Income">{tCharts("labels.income")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Period Selector */}
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <span className="text-sm font-medium text-secondary-black dark:text-white">
          {tTransactions("table.headers.date")}
        </span>
        <div className="relative">
          <Select
            value={datePeriod}
            onValueChange={(v) => onDatePeriodChange(v as ChartPeriod)}
          >
            <SelectTrigger className="w-full sm:min-w-[140px] bg-white dark:bg-background text-black dark:text-white pl-4 pr-[40px] h-[50px] rounded-md appearance-none border border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Week">{tFilters("options.week")}</SelectItem>
              <SelectItem value="Month">{tFilters("options.month")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default TransactionsFilter;
