'use client'

// Imports 
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import Link from 'next/link'

// Import hooks 
import useModal from '@/hooks/useModal'

// Import components 
import NewBudget from '@/components/budgets/AddNewBudget'
import NewBudgetModal from '@/components/modals/BudgetModal'
import ToastMessage from '@/components/ui-elements/ToastMessage'
import BudgetFolderItem from '@/components/budgets/BudgetFolderItem'

// Import types
import { ToastMessageProps, BudgetFolderItemProps } from '@/types/types'

// Component: Budgets
const Budgets = () => {
  const { session } = UserAuth()
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)
  const [budgetFolders, setBudgetFolders] = useState<BudgetFolderItemProps[]>([])
  
  const { isModalOpen, openModal, closeModal } = useModal()

  const fetchBudgetFolders = async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from('budget_folders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching budget folders:', error)
        handleToastMessage('Failed to load budget folders', 'error')
        return
      }

      if (data) {
        setBudgetFolders(data)
      }
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage('An unexpected error occurred', 'error')
    }
  }

  useEffect(() => {
    fetchBudgetFolders()
  }, [session?.user?.id])

  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    setToastMessage({ text, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const handleBudgetSubmit = async (emoji: string, name: string, amount: number, type: 'expense' | 'income') => {
    try {
      const { error } = await supabase
        .from('budget_folders')
        .insert({
          user_id: session?.user?.id,
          emoji,
          name,
          amount,
          type
        })

      if (error) {
        handleToastMessage('Failed to create budget', 'error')
        return
      }

      handleToastMessage('Budget created successfully', 'success')
      closeModal()
      fetchBudgetFolders()
    } catch (error) {
      handleToastMessage('An unexpected error occurred', 'error')
    }
  }

  return (
    <div className='mt-[30px] px-5'>
      {toastMessage && (
        <ToastMessage text={toastMessage.text} type={toastMessage.type} />
      )}
      <div className='flex flex-col items-start gap-[15px] mb-[30px]'>
        <h1 className="text-[26px] sm:text-[32px] md:text-[35px] font-semibold text-secondary-black">
          Budgets💰
        </h1>
        <p>Let`s organize your budgets by folders</p>
      </div>
      <div className='flex items-center justify-start gap-[20px] flex-wrap'>
        <NewBudget onClick={openModal} />
        {budgetFolders.map((folder) => (
          <Link  
            href={`/budgets/${folder.id}`} 
            key={folder.id}
            className='block w-full sm:w-[335px] cursor-pointer'
          >
            <BudgetFolderItem 
              key={folder.id}
              id={folder.id}
              emoji={folder.emoji}
              name={folder.name}
              amount={folder.amount}
              type={folder.type}
            />
          </Link>
        ))}
      </div>

      {isModalOpen && (
        <NewBudgetModal
          title="Create a new budget💸"
          onClose={() => {
            closeModal()
          }}
          onSubmit={handleBudgetSubmit}
          handleToastMessage={handleToastMessage}
        />
      )}
    </div>
  )
}

export default Budgets