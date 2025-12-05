"use client";

import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { useLineChartData } from "@/hooks/useChartData";
import { ChartFilters } from "@/types/types";
import { useTranslations } from "next-intl";
import { formatCurrency, generateDateRange } from "@/lib/chartUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SimplifiedChart() {
  const t = useTranslations("charts");

  const filters: ChartFilters = useMemo(() => {
    const now = new Date();
    // Default to current month for dashboard overview
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      period: "Month",
      startDate,
      endDate: now,
      dataType: "Expenses",
      selectedMonth: now.getMonth() + 1,
      selectedYear: now.getFullYear(),
    };
  }, []);

  const { data, isLoading } = useLineChartData(filters);

  // Заполняем пропущенные дни нулями, чтобы линия была непрерывной
  const filledData = useMemo(() => {
    const range: Date[] = generateDateRange(filters.startDate, filters.endDate);
    const byDate = new Map((data ?? []).map((d) => [d.date, d.amount ?? 0]));
    return range.map((d) => {
      const key = d.toISOString().split("T")[0];
      return { date: key, amount: byDate.get(key) ?? 0 };
    });
  }, [data, filters.startDate, filters.endDate]);

  const total = Array.isArray(data)
    ? data.reduce(
        (sum, item: { amount?: number }) => sum + (item?.amount ?? 0),
        0,
      )
    : 0;

  if (isLoading) {
    return (
      <Card className="w-full overflow-hidden">
        <CardHeader className="px-5 pt-5 pb-3 sm:px-6">
          <CardTitle>{t("titles.analytics")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full animate-pulse bg-muted/20 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Пустое состояние: когда данных нет
  if (!data || data.length === 0) {
    return (
      <Card className="w-full overflow-hidden">
        <CardHeader className="px-5 pt-5 pb-3 sm:px-6">
          <CardTitle>{t("titles.analytics")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("labels.expenses")} • {formatCurrency(0)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full flex items-center justify-center">
            <span className="text-muted-foreground">
              {t("states.noExpensesData")}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-3 sm:px-6">
        <CardTitle>{t("titles.analytics")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("labels.expenses")} • {formatCurrency(total)}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[200px] w-full px-5 pb-5 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filledData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border border-border rounded-lg shadow-lg p-2 text-xs">
                        <span className="font-medium">
                          {formatCurrency(payload[0].value as number)}
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
