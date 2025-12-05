// импорт и заголовок файла
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

// Import types
import {
  ChartFilters as ChartFiltersType,
  ChartPeriod,
} from "../../types/types";

// Import components
import { TransactionsFilter } from "../ui-elements";
import { useTranslations } from "next-intl";

interface ChartFiltersProps {
  filters: ChartFiltersType;
  onFiltersChange: (filters: ChartFiltersType) => void;
  isLoading?: boolean;
}

export const ChartFilters: React.FC<ChartFiltersProps> = ({
  filters,
  onFiltersChange,
  isLoading = false,
}) => {
  const tCharts = useTranslations("charts");
  const handlePeriodChange = (period: ChartPeriod) => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (period) {
      case "Week":
        // последние 7 дней
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7,
        );
        endDate = now;
        break;
      case "Month":
        // текущий месяц
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      default:
        // защита от некорректных значений
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        period = "Month";
    }

    onFiltersChange({
      ...filters,
      period,
      startDate,
      endDate,
    });
  };

  const handleMonthYearChange = (type: "month" | "year", value: string) => {
    const updates: Partial<ChartFiltersType> = {};

    if (type === "month") {
      updates.selectedMonth = parseInt(value);
    } else {
      updates.selectedYear = parseInt(value);
    }

    onFiltersChange({ ...filters, ...updates });
  };

  // Список месяцев
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2024, i, 1), "LLLL", { locale: enUS }),
  }));

  // Список лет (последние 5 + текущий + следующий)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 7 }, (_, i) => {
    const year = currentYear - 5 + i;
    return {
      value: year.toString(),
      label: year.toString(),
    };
  });

  return (
    <Card className="w-full border-0 shadow-none rounded-none bg-transparent">
      <CardContent className="p-0">
        <div className="space-y-4">
          <h2 className="text-[25px] font-semibold">
            {tCharts("titles.analytics")}
          </h2>

          <div className="flex items-start flex-wrap gap-6">
            <TransactionsFilter
              transactionType={filters.dataType}
              onTransactionTypeChange={(type) =>
                onFiltersChange({ ...filters, dataType: type })
              }
              datePeriod={filters.period}
              onDatePeriodChange={(p) => handlePeriodChange(p)}
            />
          </div>

          {/* Loading status */}
          <div className="flex items-center justify-end">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {tCharts("states.loading")}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
