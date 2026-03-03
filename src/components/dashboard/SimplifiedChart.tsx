"use client";

import { useMemo } from "react";
import { LineChart, Line, Tooltip } from "recharts";
import { useLineChartData } from "@/hooks/useChartData";
import { ChartFilters } from "@/types/types";
import { useTranslations } from "next-intl";
import { formatCurrency, generateDateRange } from "@/lib/chartUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CustomDotProps = {
  cx?: number;
  cy?: number;
  payload?: unknown;
};

export default function SimplifiedChart() {
  const t = useTranslations("charts");

  const filters: ChartFilters = useMemo(() => {
    const now = new Date();
    // Show multiple months (last 90 days) so the line doesn't reset on month boundaries
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 89);
    return {
      period: "Day",
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

  const maxAmount = useMemo(() => {
    const max = filledData.reduce((m, item) => Math.max(m, item.amount ?? 0), 0);
    return Number.isFinite(max) ? max : 0;
  }, [filledData]);

  const chartWidth = useMemo(() => {
    // Allocate width per day to enable horizontal scrolling over multiple months
    const pxPerDay = 14;
    return Math.max(320, filledData.length * pxPerDay);
  }, [filledData.length]);

  const CustomDot = ({ cx, cy, payload }: CustomDotProps) => {
    const amount = Number((payload as { amount?: unknown } | null)?.amount ?? 0);
    const normalized = maxAmount > 0 ? Math.min(1, amount / maxAmount) : 0;
    const opacity = amount === 0 ? 0.08 : 0.25 + normalized * 0.75;
    const r = amount === 0 ? 2.5 : 2.5 + normalized * 1.8;

    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={`hsl(var(--primary) / ${opacity})`}
        stroke="none"
      />
    );
  };

  if (isLoading) {
    return (
      <Card className="w-full overflow-hidden">
        <CardHeader className="px-4 pt-5 pb-3 sm:px-5">
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
        <CardHeader className="px-4 pt-5 pb-3 sm:px-5">
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
      <CardHeader className="px-4 pt-5 pb-3 sm:px-5">
        <CardTitle>{t("titles.analytics")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("labels.expenses")} • {formatCurrency(total)}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative h-[200px] w-full px-4 pb-5 min-w-0">
          <div className="h-full w-full overflow-x-auto overflow-y-hidden">
            <div style={{ width: chartWidth, height: "100%" }}>
              <LineChart
                width={chartWidth}
                height={200}
                data={filledData}
                margin={{ top: 10, right: 8, left: 8, bottom: 0 }}
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
                  dot={<CustomDot />}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </div>
          </div>

          {/* Edge fade like a “mask” so the beginning/end look smooth while scrolling */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
        </div>
      </CardContent>
    </Card>
  );
}
