"use client";

// Imports
import React, { forwardRef } from "react";
import { formatCurrency } from "@/lib/chartUtils";
import { ChartDescription } from "./ChartDescription";
import Image from "next/image";

// Import types
import { ChartFilters } from "@/types/types";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { buildBarChartPrompt } from "@/lib/ai/promptBuilders";
import {
  getLocalePreference,
  sanitizeTip,
  makeContextKey,
  getCachedTip,
  setCachedTip,
} from "@/lib/ai/tipUtils";

// Import chart components
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomTooltip } from "./CustomTooltip";
import { useTranslations } from "next-intl";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeCornerPanel from "../free/UpgradeCornerPanel";
import ProLockLabel from "../free/ProLockLabel";

// Types
interface ExpensesBarData {
  period: string; // "Week 1", "Week 2" или "Jan", "Feb"
  amount: number; // Сумма трат за период
  fill: string; // Цвет столбца
}

interface ExpensesBarChartProps {
  data: ExpensesBarData[];
  filters: ChartFilters;
  title?: string;
  description?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  height?: number;
  currency?: string;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
  layout?: "horizontal" | "vertical";
}

// Компонент ExpensesBarChart
const ExpensesBarChartComponent = forwardRef<
  HTMLDivElement,
  ExpensesBarChartProps
>(
  (
    {
      data,
      filters,
      title,
      description,
      showGrid = true,
      showTooltip = true,
      height = 240,
      currency = "USD",
      isLoading = false,
      error = null,
      emptyMessage = "No expenses data available",
      className = "",
      layout = "horizontal",
    },
    ref,
  ) => {
    const {
      text: tip,
      loading: tipLoading,
      error: tipError,
      isRateLimited,
      fetchSuggestion,
      abort,
    } = useAISuggestions();
    const { subscriptionPlan } = useSubscription();
    const isPro = subscriptionPlan === "pro";

    const [displayTip, setDisplayTip] = React.useState<string>("");
    const [cooldownUntil, setCooldownUntil] = React.useState<number>(0);
    const lastKeyRef = React.useRef<string | null>(null);

    // Один бесплатный превью для Free, затем блокируем кнопку и показываем CTA
    const [previewUsed, setPreviewUsed] = React.useState<boolean>(() => {
      if (typeof window === "undefined") return false;
      try {
        return (
          window.localStorage.getItem("spendly:ai_preview_expenses_used") ===
          "1"
        );
      } catch {
        return false;
      }
    });
    const [showUpgrade, setShowUpgrade] = React.useState<boolean>(false);

    const canShowUpgradePopup = () => {
      try {
        const count = parseInt(
          window.localStorage.getItem("spendly:upgrade_popup_count") || "0",
          10,
        );
        return count < 3;
      } catch {
        return true;
      }
    };

    const markUpgradePopupShown = () => {
      try {
        const count = parseInt(
          window.localStorage.getItem("spendly:upgrade_popup_count") || "0",
          10,
        );
        window.localStorage.setItem(
          "spendly:upgrade_popup_count",
          String(count + 1),
        );
      } catch {
        /* no-op */
      }
    };

    // Refresh AI tip based on chart data
    const refreshTip = () => {
      const now = Date.now();
      if (now < cooldownUntil) return;
      setCooldownUntil(now + 4000); // anti-spam: 4 seconds

      // Edge case: no data at all
      if (!data || data.length === 0) {
        setDisplayTip("Недостаточно данных для анализа, попробуйте позже.");
        return;
      }

      // Если Free и превью уже использовано — блокируем
      if (!isPro && previewUsed) {
        return;
      }

      const locale = getLocalePreference();
      const prompt = buildBarChartPrompt({
        data,
        filters,
        currency,
        locale,
      });

      const key = makeContextKey(prompt);
      lastKeyRef.current = key;

      // Cache: if there is a fresh tip — show immediately and skip API call
      const cached = getCachedTip(key, 120000);
      if (cached) {
        setDisplayTip(sanitizeTip(cached));
        return;
      }

      fetchSuggestion(prompt);
    };

    // Effect to handle tip updates
    React.useEffect(() => {
      if (tip && lastKeyRef.current) {
        const sanitized = sanitizeTip(tip);
        setDisplayTip(sanitized);
        setCachedTip(lastKeyRef.current, tip);

        // Отмечаем использование бесплатного превью для Free
        if (!isPro && !previewUsed) {
          setPreviewUsed(true);
          try {
            window.localStorage.setItem(
              "spendly:ai_preview_expenses_used",
              "1",
            );
          } catch {
            /* no-op */
          }
          if (canShowUpgradePopup()) {
            setShowUpgrade(true);
            markUpgradePopupShown();
          }
        }
      }
    }, [tip]);

    const tCharts = useTranslations("charts");
    const resolvedTitle = title || tCharts("transactionsBar.title");
    const resolvedEmpty = emptyMessage || tCharts("states.noExpensesData");

    if (isLoading) {
      return (
        <Card className={className} ref={ref}>
          <CardHeader>
            <CardTitle>{resolvedTitle}</CardTitle>
            {description && <ChartDescription>{description}</ChartDescription>}
          </CardHeader>
          <CardContent>
            <div className="h-[240px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card className={className} ref={ref}>
          <CardHeader>
            <CardTitle>{title || "Expenses Chart"}</CardTitle>
            {description && <ChartDescription>{description}</ChartDescription>}
          </CardHeader>
          <CardContent>
            <div className="h-[240px] flex items-center justify-center">
              <p className="text-red-500">{error}</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!data || data.length === 0) {
      return (
        <Card className={className} ref={ref}>
          <CardHeader>
            <CardTitle>{resolvedTitle}</CardTitle>
            {description && <ChartDescription>{description}</ChartDescription>}
          </CardHeader>
          <CardContent>
            <div className="h-[240px] flex items-center justify-center">
              <p className="text-muted-foreground">{resolvedEmpty}</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={className} ref={ref}>
        <CardContent className="p-0 pr-2 pt-6">
          {showUpgrade && <UpgradeCornerPanel />}
          <div style={{ width: "100%", height }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={data}
                layout={layout}
                margin={{
                  top: 20,
                  right: 8,
                  left: 0,
                  bottom: 5,
                }}
              >
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(128, 128, 128, 0.1)"
                    horizontal={layout === "horizontal"}
                    vertical={layout === "vertical"}
                  />
                )}
                {layout === "horizontal" ? (
                  <>
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      type="category"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => formatCurrency(value, currency)}
                      type="number"
                      tickMargin={4}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => formatCurrency(value, currency)}
                      tickMargin={4}
                    />
                    <YAxis
                      dataKey="period"
                      type="category"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={88}
                    />
                  </>
                )}
                {showTooltip && (
                  <Tooltip
                    content={<CustomTooltip currency={currency} />}
                    cursor={{ fill: "transparent" }}
                  />
                )}
                <Bar
                  dataKey="amount"
                  fill="#8884d8"
                  radius={layout === "horizontal" ? [4, 4, 0, 0] : [0, 4, 4, 0]}
                  barSize={32}
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  },
);

ExpensesBarChartComponent.displayName = "ExpensesBarChart";
export const ExpensesBarChart = ExpensesBarChartComponent;
export type { ExpensesBarData, ExpensesBarChartProps };
