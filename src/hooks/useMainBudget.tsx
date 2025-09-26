'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { UserAuth } from '../context/AuthContext'

interface MainBudget {
  amount: number
  user_id: string
}

export const useMainBudget = () => {
  const { session } = UserAuth()
  const [mainBudget, setMainBudget] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMainBudget = async () => {
    if (!session?.user?.id) return

    try {
      setIsLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('main_budget')
        .select('amount')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching main budget:', error)
        setError(error.message)
        return
      }

      setMainBudget(data?.amount ?? 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch main budget'
      console.error('Error:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMainBudget()
  }, [session?.user?.id])

  return { 
    mainBudget, 
    isLoading, 
    error, 
    refetch: fetchMainBudget 
  }
}