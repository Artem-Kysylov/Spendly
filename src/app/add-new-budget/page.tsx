'use client';
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'

// Import components    
import CreateMainBudget from '../../components/budgets/CreateMainBudget'
import ToastMessage from '../../components/ui-elements/ToastMessage'

// Import types
import { ToastMessageProps } from '../../types/types'

const AddNewBudget = () => {
  const { session } = UserAuth()
  const router = useRouter()
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)

  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    setToastMessage({ text, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const handleCreateBudget = async (budget: string) => {
    try {
      if (!session?.user?.id) {
        throw new Error('User not authenticated')
      }

      // Create new budget
      const { error } = await supabase
        .from('budgets')
        .insert([
          {
            user_id: session.user.id,
            amount: Number(budget)
          }
        ])

      if (error) {
        throw error
      }

      handleToastMessage('Budget successfully created!', 'success')
      // Redirect to Dashboard after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (error: any) {
      console.error('Error creating budget:', error)
      handleToastMessage(error.message || 'Error creating budget', 'error')
    }
  }

  return (
    <div className='flex flex-col items-center justify-center h-screen'>
      {toastMessage && (
        <ToastMessage text={toastMessage.text} type={toastMessage.type} />
      )}
      <CreateMainBudget onSubmit={handleCreateBudget} />
    </div>
  )
}

export default AddNewBudget