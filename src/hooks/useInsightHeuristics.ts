import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Transaction } from '@/types/types'

interface UseInsightHeuristicsProps {
    budget: number
    totalExpenses: number
    transactions: Transaction[]
}

export type InsightType = 'alert' | 'praise' | 'savings' | 'default'

export interface InsightResult {
    type: InsightType
    message: string
}

export function useInsightHeuristics({
    budget,
    totalExpenses,
    transactions
}: UseInsightHeuristicsProps): InsightResult {
    const t = useTranslations('dashboard.insights')

    return useMemo(() => {
        // 1. Critical: Budget > 90% spent
        if (budget > 0 && totalExpenses / budget > 0.9) {
            return { type: 'alert', message: t('critical') }
        }

        // 2. Positive: Weekly expenses < last week
        const now = new Date()
        // Assuming week starts on Sunday (0). Adjust if needed based on locale, but simple heuristic is fine.
        const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        startOfThisWeek.setHours(0, 0, 0, 0)

        const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000)
        const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1)

        const thisWeekExpenses = transactions
            .filter(t => t.type === 'expense' && new Date(t.created_at) >= startOfThisWeek)
            .reduce((sum, t) => sum + t.amount, 0)

        const lastWeekExpenses = transactions
            .filter(t => {
                const d = new Date(t.created_at)
                return t.type === 'expense' && d >= startOfLastWeek && d <= endOfLastWeek
            })
            .reduce((sum, t) => sum + t.amount, 0)

        // Only show praise if we have data for last week and this week is actually lower
        // And maybe check if we are at least a few days into the week? 
        // Requirement says: "If weekly expenses < last week". 
        // If it's Monday morning, this will likely be true. 
        // I'll stick to simple logic for now as per requirements.
        if (lastWeekExpenses > 0 && thisWeekExpenses < lastWeekExpenses) {
            return { type: 'praise', message: t('positive') }
        }

        // 3. Quiet Day: No transactions today
        const todayTransactions = transactions.filter(t => {
            const d = new Date(t.created_at)
            return (
                d.getDate() === now.getDate() &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
            )
        })

        if (todayTransactions.length === 0) {
            return { type: 'savings', message: t('quietDay') }
        }

        // 4. Default
        return { type: 'default', message: t('default') }
    }, [budget, totalExpenses, transactions, t])
}
