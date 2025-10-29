'use client'
import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { UserAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import CreateMainBudget from '@/components/budgets/CreateMainBudget'
import ToastMessage from '@/components/ui-elements/ToastMessage'
import { ToastMessageProps } from '@/types/types'
import type { UserLocaleSettings } from '@/types/locale'
import { useTranslations } from 'next-intl'

export default function AddNewBudgetClient() {
  const { session } = UserAuth()
  const router = useRouter()
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)
  const tBudgets = useTranslations('budgets')

  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleCreateBudget = async (budget: string, locale?: UserLocaleSettings) => {
    try {
      if (!session?.user?.id) throw new Error('User not authenticated')

      if (locale) {
        const { data: { session: current } } = await supabase.auth.getSession()
        const token = current?.access_token
        if (!token) throw new Error('No auth token')
        const resp = await fetch('/api/user/locale', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            country: locale.country,
            currency: locale.currency,
            locale: locale.locale
          })
        })
        if (!resp.ok) {
          const err = await resp.json()
          console.error('Error saving user locale settings:', err)
          throw new Error(err.error || 'Failed to save locale settings')
        }
      }

      const { data, error } = await supabase
        .from('main_budget')
        .upsert(
          [{ user_id: session.user.id, amount: Number(budget) }],
          { onConflict: 'user_id' }
        )
        .select()

      if (error) throw error

      handleToastMessage(tBudgets('list.toast.createSuccess'), 'success')
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (error: any) {
      console.error('Error creating budget:', error)
      handleToastMessage(tBudgets('list.toast.failedCreate'), 'error')
    }
  }

  return (
    <div className='flex flex-col items-center justify-center h-screen'>
      {toastMessage && <ToastMessage text={toastMessage.text} type={toastMessage.type} />}
      <CreateMainBudget onSubmit={handleCreateBudget} />
    </div>
  )
}