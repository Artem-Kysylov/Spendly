'use client'

// Imports 
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient' 
import { UserAuth } from '../../context/AuthContext'
import { Pencil } from 'lucide-react'

// Import types
import { Transaction } from '../../types/types'

// Component: TransactionsCounters
const TransactionsCounters = ({ 
  onIconClick, 
  refreshTrigger 
}: { 
  onIconClick: () => void
  refreshTrigger?: number 
}) => {
    const { session } = UserAuth()
    const [totalExpenses, setTotalExpenses] = useState(0)
    const [totalIncome, setTotalIncome] = useState(0)
    const [budget, setBudget] = useState(0)

    const fetchBudget = async () => {
        if (!session?.user?.id) return

        const { data, error } = await supabase
            .from('main_budget')
            .select('amount')
            .eq('user_id', session.user.id)
            .maybeSingle()

        if (error) {
            console.error('Error fetching budget:', error)
            return
        }

        setBudget(data?.amount ?? 0)
    }

    const fetchTransactions = async () => {
        if (!session?.user?.id) return

        const { data, error } = await supabase
            .from('transactions')
            .select('type, amount')
            .eq('user_id', session.user.id) as { data: Transaction[] | null, error: any }

        if (error) {
            console.error('Error fetching transactions:', error)
            return
        }
      
        const expensesTotal = data?.filter(t => t.type === 'expense').reduce((total, t) => total + t.amount, 0) || 0
        const incomeTotal = data?.filter(t => t.type === 'income').reduce((total, t) => total + t.amount, 0) || 0

        setTotalExpenses(expensesTotal)
        setTotalIncome(incomeTotal)
    }

    useEffect(() => {
        fetchBudget()
        fetchTransactions()
    }, [session?.user?.id, refreshTrigger]) 
    
    return (
        <div className="flex flex-col md:flex-row justify-between gap-5">
            <div className="flex flex-col items-center justify-center gap-2 w-full h-[10vh] rounded-lg bg-white border relative">
                <div className="absolute top-5 right-5 cursor-pointer" onClick={onIconClick}>
                    <Pencil className="text-primary text-[20px] duration-300 hover:opacity-50"/>
                </div>
                <h3 className="text-6 text-primary text-center">Total Budget</h3>
                <span className="text-[25px] font-semibold text-primary text-center">${budget}</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 w-full h-[10vh] rounded-lg bg-white border">
                <h3 className="text-6 text-error text-center">Total Expenses</h3>
                <span className="text-[25px] font-semibold text-error text-center">${totalExpenses}</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 w-full h-[10vh] rounded-lg bg-white border">
                <h3 className="text-6 text-success text-center">Total Income</h3>
                <span className="text-[25px] font-semibold text-success text-center">${totalIncome}</span>
            </div>
        </div>
    )
}

export default TransactionsCounters