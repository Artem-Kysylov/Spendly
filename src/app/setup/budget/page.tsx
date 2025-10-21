'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import CreateMainBudget from '@/components/budgets/CreateMainBudget'
import ToastMessage from '@/components/ui-elements/ToastMessage'

export default function Page() {
  const { session, isReady } = UserAuth()
  const router = useRouter()
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (isReady && !session) {
      router.replace('/')
    }
  }, [isReady, session, router])

  const onSubmit = async (budget: string) => {
    if (!session?.user?.id) {
      setToast({ text: 'Please sign in to save a budget', type: 'error' })
      return
    }

    try {
      const amount = Number(budget)
      if (!amount || amount <= 0) {
        setToast({ text: 'Enter a valid budget amount', type: 'error' })
        return
      }

      const { error } = await supabase
        .from('main_budget')
        .upsert(
          {
            user_id: session.user.id,
            amount,
          },
          { onConflict: 'user_id' }
        )
        .select()

      if (error) {
        setToast({ text: 'Failed to save budget. Try again.', type: 'error' })
        return
      }

      setToast({ text: 'Budget saved successfully!', type: 'success' })
      // Переход к дашборду с пустым состоянием (по задумке он будет после онбординга)
      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving budget:', error)
      setToast({ text: 'An unexpected error occurred. Please try again.', type: 'error' })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {toast && <ToastMessage text={toast.text} type={toast.type} />}
      <CreateMainBudget onSubmit={onSubmit} />
    </div>
  )
}


