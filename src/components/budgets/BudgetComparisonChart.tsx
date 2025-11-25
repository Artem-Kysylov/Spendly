'use client'

import React from 'react'
import { BarChart } from '@/components/charts/BarChart'
import { useTranslations } from 'next-intl'
import type { BarChartData } from '@/types/types'

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

  return (
    <BarChart
      data={data}
      title={tCharts('titles.comparisonBar')}
      description={description}
      showGrid
      showTooltip
      height={280}
      currency={currency}
      isLoading={isLoading}
      error={error}
      className={className}
      onBarHover={onBarHover}
      onBarLeave={onBarLeave}
    />
  )
}