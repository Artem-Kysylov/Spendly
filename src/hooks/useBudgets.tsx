'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { UserAuth } from '../context/AuthContext'

interface Budget {
  id: string
  name: string
  emoji: string
  amount: number
  type: 'expense' | 'income'
}

export const useBudgets = () => {
  const { session } = UserAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchBudgets = async () => {
    if (!session?.user?.id) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('budget_folders')
        .select('id, emoji, name, amount, type')
        .eq('user_id', session.user.id)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching budget folders:', error)
        return
      }

      if (data) {
        setBudgets(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBudgets()
  }, [session?.user?.id])

  return { budgets, isLoading, refetch: fetchBudgets }
}