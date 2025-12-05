"use client";

import React, { useState, forwardRef } from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatChartDate } from "@/lib/chartUtils";
import { CustomTooltip } from "./CustomTooltip";
import { LineChartProps } from "@/types/types";
import { ChartDescription } from "./ChartDescription";
import { useTranslations, useLocale } from "next-intl";

const LineChartComponent = forwardRef<HTMLDivElement, LineChartProps>(
  (
    {
      data,
      title = "Expenses over time",
      description,
      showGrid = true,
      showTooltip = true,
      showLegend = true,
      height = 300,
      currency = "USD",
      isLoading = false,
      error = null,
      lineColor = "hsl(var(--primary))",
      strokeWidth = 2,
      xPeriod = "month",
      className = "",
    },
    ref,
  ) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const tCharts = useTranslations("charts");
    const resolvedTitle = title ?? tCharts("line.titleOverTime");
    const localeCode = useLocale();

    if (isLoading) {
      return (
        <Card ref={ref} className={`w-full ${className}`}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {resolvedTitle}
            </CardTitle>
            {description && <ChartDescription>{description}</ChartDescription>}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">
                {tCharts("states.loadingData")}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card ref={ref} className={`w-full ${className}`}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && <ChartDescription>{description}</ChartDescription>}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-destructive">
                Error loading chart: {error}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!data || data.length === 0) {
      return (
        <Card ref={ref} className={`w-full ${className}`}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && <ChartDescription>{description}</ChartDescription>}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">
                {tCharts("states.noData")}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Format data for chart
    const chartData = data.map((item, index) => ({
      ...item,
      formattedDate: formatChartDate(item.date, xPeriod, localeCode),
      opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.6,
    }));

    return (
      <Card ref={ref} className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {resolvedTitle}
          </CardTitle>
          {description && <ChartDescription>{description}</ChartDescription>}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={height}>
            <RechartsLineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              {showGrid && (
                <CartesianGrid
                  strokeDasharray="4 4"
                  horizontal={true}
                  vertical={true}
                  stroke="hsl(var(--muted-foreground))"
                  opacity={0.18}
                />
              )}
              <XAxis
                dataKey="formattedDate"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value, currency)}
              />
              {showTooltip && (
                <Tooltip
                  content={<CustomTooltip currency={currency} />}
                  cursor={{
                    stroke: lineColor,
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="amount"
                stroke={lineColor}
                strokeWidth={strokeWidth}
                dot={{
                  r: 4,
                  strokeWidth: 2,
                  fill: "hsl(var(--background))",
                }}
                activeDot={{
                  r: 6,
                  strokeWidth: 2,
                  fill: "hsl(var(--background))",
                }}
                animationDuration={1400}
                name="Amount"
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  },
);
LineChartComponent.displayName = "LineChart";
export const LineChart = LineChartComponent;
