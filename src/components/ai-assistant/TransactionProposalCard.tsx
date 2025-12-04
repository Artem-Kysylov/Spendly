'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Check, Edit2, Loader2 } from 'lucide-react'
import { saveProposedTransaction } from '@/app/[locale]/actions/transaction'
import { UserAuth } from '@/context/AuthContext'

interface Budget {
    id: string
    name: string
    emoji?: string
    type: 'expense' | 'income'
}

interface ProposedTransaction {
    title: string
    amount: number
    type: 'expense' | 'income'
    category_name: string
    date: string
}

interface TransactionProposalCardProps {
    proposal: ProposedTransaction
    budgets: Budget[]
    onSuccess?: () => void
    onError?: (error: string) => void
}

export function TransactionProposalCard({
    proposal,
    budgets,
    onSuccess,
    onError,
}: TransactionProposalCardProps) {
    const { session } = UserAuth()
    const userId = session?.user?.id

    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    // Form state
    const [title, setTitle] = useState(proposal.title)
    const [amount, setAmount] = useState(proposal.amount.toString())
    const [selectedBudgetId, setSelectedBudgetId] = useState<string>('')
    const [date, setDate] = useState(proposal.date)

    // Smart mapping: Find budget by category_name (case-insensitive)
    const mappedBudget = useMemo(() => {
        const categoryLower = proposal.category_name.toLowerCase()
        return budgets.find(
            (b) => b.name.toLowerCase() === categoryLower || b.name.toLowerCase().includes(categoryLower)
        )
    }, [proposal.category_name, budgets])

    useEffect(() => {
        if (mappedBudget) {
            setSelectedBudgetId(mappedBudget.id)
        } else if (budgets.length > 0) {
            // Default to first budget if no match found
            setSelectedBudgetId(budgets[0].id)
        }
    }, [mappedBudget, budgets])

    const selectedBudget = budgets.find((b) => b.id === selectedBudgetId)

    const handleConfirm = async () => {
        if (!userId || !selectedBudgetId) {
            onError?.('Missing user or budget information')
            return
        }

        setIsSaving(true)

        try {
            const result = await saveProposedTransaction({
                user_id: userId,
                title,
                amount: parseFloat(amount),
                type: proposal.type,
                budget_folder_id: selectedBudgetId,
                created_at: date,
            })

            if (result.success) {
                setIsSuccess(true)
                onSuccess?.()

                // Auto-dismiss after 3 seconds
                setTimeout(() => {
                    setIsSuccess(false)
                }, 3000)
            } else {
                onError?.(result.error || 'Failed to save transaction')
            }
        } catch (error) {
            onError?.('An unexpected error occurred')
        } finally {
            setIsSaving(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value)
    }

    const formatDate = (isoDate: string) => {
        return new Date(isoDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    // Success state
    if (isSuccess) {
        return (
            <Card className="border-green-500 bg-green-50 dark:bg-green-950">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Transaction saved successfully!</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                    <span>Proposed Transaction</span>
                    {!isEditing && (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit2 className="w-4 h-4" />
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {isEditing ? (
                    // Edit Mode
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Transaction title"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="budget">Budget</Label>
                            <Select value={selectedBudgetId} onValueChange={setSelectedBudgetId}>
                                <SelectTrigger id="budget">
                                    <SelectValue placeholder="Select budget" />
                                </SelectTrigger>
                                <SelectContent>
                                    {budgets.map((budget) => (
                                        <SelectItem key={budget.id} value={budget.id}>
                                            <span className="flex items-center gap-2">
                                                <span>{budget.emoji || '📁'}</span>
                                                <span>{budget.name}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </>
                ) : (
                    // View Mode
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Amount</span>
                            <span
                                className={`text-lg font-semibold ${proposal.type === 'expense'
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-green-600 dark:text-green-400'
                                    }`}
                            >
                                {proposal.type === 'expense' ? '-' : '+'}
                                {formatCurrency(parseFloat(amount))}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Title</span>
                            <span className="font-medium">{title}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Budget</span>
                            <span className="flex items-center gap-1">
                                <span>{selectedBudget?.emoji || '📁'}</span>
                                <span className="font-medium">{selectedBudget?.name || 'Unknown'}</span>
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Date</span>
                            <span className="font-medium">{formatDate(date)}</span>
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex gap-2">
                {isEditing ? (
                    <>
                        <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleConfirm} disabled={isSaving} className="flex-1">
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save'
                            )}
                        </Button>
                    </>
                ) : (
                    <Button onClick={handleConfirm} disabled={isSaving} className="w-full">
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Confirming...
                            </>
                        ) : (
                            'Confirm'
                        )}
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
