'use client'

import React from 'react'
import { BarChart } from '@/components/charts/BarChart'
import { useTranslations } from 'next-intl'
import type { BarChartData } from '@/types/types'
import useDeviceType from '@/hooks/useDeviceType'

type Props = {
  data: BarChartData[]
  currency?: string
  isLoading?: boolean
  error?: string | null
  className?: string
  description?: string
  onBarHover?: (index: number, item: BarChartData) => void
  onBarLeave?: () => void
}

export default function BudgetComparisonChart({
  data,
  currency = 'USD',
  isLoading = false,
  error = null,
  className = '',
  description,
  onBarHover,
  onBarLeave,
}: Props) {
  const tCharts = useTranslations('charts')
  const { isMobile } = useDeviceType()
  const orientation = isMobile ? 'horizontal' : 'vertical'
  const chartHeight = isMobile
    ? Math.max(280, Math.min(600, data.length * 40))  // как было для горизонтального
    : 360  // фиксированная высота для вертикального десктопа

  return (
    <BarChart
      data={data}
      title={tCharts('titles.comparisonBar')}
      description={description}
      showGrid
      showTooltip
      height={chartHeight}
      currency={currency}
      isLoading={isLoading}
      error={error}
      className={className}
      onBarHover={onBarHover}
      onBarLeave={onBarLeave}
      orientation={orientation}
    />
  )
}