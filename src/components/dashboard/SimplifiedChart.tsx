'use client'

import { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { useLineChartData } from '@/hooks/useChartData'
import { ChartFilters } from '@/types/types'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/chartUtils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SimplifiedChart() {
    const t = useTranslations('charts')

    const filters: ChartFilters = useMemo(() => {
        const now = new Date()
        // Default to current month for dashboard overview
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        return {
            period: 'Month',
            startDate,
            endDate: now,
            dataType: 'Expenses',
            selectedMonth: now.getMonth() + 1,
            selectedYear: now.getFullYear()
        }
    }, [])

    const { data, isLoading } = useLineChartData(filters)

    if (isLoading) {
        return (
            <Card className="w-full">
                <CardHeader className="px-5 pt-5 pb-3 sm:px-6">
                    <CardTitle>{t('titles.analytics')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full animate-pulse bg-muted/20 rounded-lg" />
                </CardContent>
            </Card>
        )
    }

    // Calculate total for the header
    const total = data.reduce((sum, item) => sum + item.amount, 0)

    return (
        <Card className="w-full">
            <CardHeader className="px-5 pt-5 pb-3 sm:px-6">
                <CardTitle>{t('titles.analytics')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                    {t('labels.expenses')} • {formatCurrency(total)}
                </p>
            </CardHeader>
            <CardContent className="p-0">
                <div className="h-[200px] w-full px-5 pb-5">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-background border border-border rounded-lg shadow-lg p-2 text-xs">
                                                <span className="font-medium">
                                                    {formatCurrency(payload[0].value as number)}
                                                </span>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Line
                                type="natural"
                                dataKey="amount"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
