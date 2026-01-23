"use client";

// File: BarChart.tsx (BarChart component)
import React, { useState, forwardRef } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, defaultChartColors } from "@/lib/chartUtils";
import { CustomTooltip } from "./CustomTooltip";
import { BarChartProps } from "@/types/types";
import { ChartDescription } from "./ChartDescription";
import { useTranslations } from "next-intl";
import useDeviceType from "@/hooks/useDeviceType";

// BarChartComponent component (forwardRef)
const BarChartComponent = forwardRef<HTMLDivElement, BarChartProps>(
  (
    {
      data,
      title = "Expenses by category",
      description,
      showGrid = true,
      showTooltip = true,
      showLegend = true,
      height = 300,
      currency = "USD",
      isLoading = false,
      error = null,
      barColor = "hsl(var(--primary))",
      orientation = "vertical",
      className = "",
      onBarHover,
      onBarLeave,
    },
    ref,
  ) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const tCharts = useTranslations("charts");
    const resolvedTitle = title ?? tCharts("bar.titleByCategory");
    const { isMobile } = useDeviceType();

    // Разделяем первое «слово»-эмодзи и текст
    const splitEmojiLabel = (value: string) => {
      const parts = value.trim().split(" ");
      if (parts.length > 1 && !/^[\p{L}\p{N}]+$/u.test(parts[0])) {
        return { emoji: parts[0], label: parts.slice(1).join(" ") };
      }
      return { emoji: "", label: value.trim() };
    };

    // Кастомный тик для мобильной оси категорий: оставляем 10px
    const renderMobileCategoryTick = (props: any) => {
      const { x, y, payload } = props;
      const { emoji, label } = splitEmojiLabel(payload.value);
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize={10}
          >
            {emoji && (
              <tspan x={0} dy={10}>
                {emoji}
              </tspan>
            )}
            <tspan x={0} dy={emoji ? 16 : 0}>
              {label}
            </tspan>
          </text>
        </g>
      );
    };

    // Кастомный рендер тика: мобайл — столбик (эмодзи сверху), десктоп — в ряд
    const CategoryTick = (props: any) => {
      const { x, y, payload } = props;
      const { emoji, label } = splitEmojiLabel(payload.value);
      if (isMobile) {
        return (
          <g transform={`translate(${x},${y})`}>
            <text
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
              fontSize={10}
            >
              {emoji && (
                <tspan x={0} dy={-6}>
                  {emoji}
                </tspan>
              )}
              <tspan x={0} dy={emoji ? 12 : 0}>
                {label}
              </tspan>
            </text>
          </g>
        );
      }
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize={12}
          >
            {emoji ? `${emoji} ${label}` : label}
          </text>
        </g>
      );
    };

    if (isLoading) {
      return (
        <Card className="w-full flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {resolvedTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1" style={{ minHeight: height }}>
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card className="w-full flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1" style={{ minHeight: height }}>
            <div className="flex items-center justify-center h-full">
              <div className="text-destructive">Error: {error}</div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!data || data.length === 0) {
      return (
        <Card className="w-full flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1" style={{ minHeight: height }}>
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">
                {tCharts("states.noData")}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Generate colors for bars
    const colors = Object.values(defaultChartColors);

    // Normalize data and add colors
    const normalizedData = data.map((item, index) => ({
      ...item,
      fill: item.fill || colors[index % colors.length],
      opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.6,
    }));

    const formatYAxisLabel = (value: number) => {
      return formatCurrency(value, currency, true);
    };

    const formatXAxisLabel = (value: string) => {
      return value.trim();
    };

    return (
      <Card className={className} ref={ref}>
        <CardHeader className="px-5 pt-5 pb-3 sm:px-6">
          <CardTitle>{resolvedTitle}</CardTitle>
          {description && <ChartDescription>{description}</ChartDescription>}
        </CardHeader>
        <CardContent className="p-0">
          <div style={{ width: "100%", height, paddingRight: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={data}
                layout={
                  orientation === "horizontal" ? "vertical" : "horizontal"
                }
                barCategoryGap="25%"
                margin={{
                  top: 28,
                  right: 0,
                  left:
                    orientation === "horizontal" ? (isMobile ? 12 : 110) : 8, // меньше слева на мобилке
                  bottom: isMobile ? 12 : 5,
                }}
              >
                {showGrid && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(128, 128, 128, 0.1)"
                    horizontal={orientation === "horizontal"}
                    vertical={orientation === "vertical"}
                  />
                )}
                {orientation === "horizontal" ? (
                  <>
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatYAxisLabel}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatXAxisLabel}
                      width={isMobile ? 90 : 120} // компактнее на мобилке
                      tickMargin={6}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey="category"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={isMobile ? 10 : 12}
                      tickLine={false}
                      axisLine={false}
                      tick={isMobile ? renderMobileCategoryTick : undefined}
                      tickFormatter={!isMobile ? formatXAxisLabel : undefined}
                      height={isMobile ? 58 : 28}
                      tickMargin={isMobile ? 10 : 4}
                      interval={0}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatYAxisLabel}
                    />
                  </>
                )}

                {showTooltip && (
                  <Tooltip
                    content={<CustomTooltip currency={currency} />}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                  />
                )}

                <Bar
                  dataKey="amount"
                  maxBarSize={48}
                  radius={[4, 4, 0, 0]}
                  animationDuration={1400}
                >
                  {normalizedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      opacity={entry.opacity}
                      onMouseEnter={() => {
                        setHoveredIndex(index);
                        onBarHover?.(index, data[index]);
                      }}
                      onMouseLeave={() => {
                        setHoveredIndex(null);
                        onBarLeave?.();
                      }}
                    />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  },
);
BarChartComponent.displayName = "BarChart";
export const BarChart = BarChartComponent;
