"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
  height?: number;
  showLegend?: boolean;
  type?: "pie" | "line" | "bar";
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  height = 300,
  showLegend = true,
  type = "line",
}) => {
  // Детерминированные паттерны высот (без случайностей)
  const lineHeights = [34, 58, 72, 46, 80, 38, 62];
  const barHeights = [55, 80, 35, 65, 45];

  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Основная область графика */}
          <div
            className="w-full flex items-center justify-center bg-muted/20 rounded-lg"
            style={{ height: `${height}px` }}
          >
            {type === "pie" && (
              <div className="relative">
                <Skeleton className="h-32 w-32 rounded-full" />
                <div className="absolute inset-4">
                  <Skeleton className="h-24 w-24 rounded-full" />
                </div>
              </div>
            )}

            {type === "line" && (
              <div className="w-full h-full p-4 space-y-2">
                <div className="flex justify-between items-end h-full">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="w-8"
                      style={{
                        height: `${lineHeights[i % lineHeights.length]}%`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-3 w-8" />
                  ))}
                </div>
              </div>
            )}

            {type === "bar" && (
              <div className="w-full h-full p-4 space-y-2">
                <div className="flex justify-between items-end h-full gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="flex-1"
                      style={{
                        height: `${barHeights[i % barHeights.length]}%`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-3 flex-1" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Легенда */}
          {showLegend && (
            <div className="flex flex-wrap gap-4 justify-center">
              {Array.from({ length: type === "pie" ? 4 : 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
