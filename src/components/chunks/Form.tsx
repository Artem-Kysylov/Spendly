// Imports 
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'

// Import components 
import Button from '../ui-elements/Button'
import ToastMessage from '../ui-elements/ToastMessage'

// Import types
import { ToastMessageProps } from '../../types/types'

// Component: Form
const Form = () => {
  const { session } = UserAuth()

  // State 
  const [title, setTitle] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)

  
  // Handlers 
  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    console.log('Form: Setting toast message:', { text, type });
    setToastMessage({ text, type })
    
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!session?.user) return handleToastMessage('Please login to add a transaction', 'error')    

      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            user_id: session.user.id,
            title: title,
            amount: Number(amount),
            type,
            created_at: new Date().toISOString()
          })
          .select()
  
        if (error) {
          console.error('Error inserting transaction:', error)
          handleToastMessage('Failed to add transaction. Please try again.', 'error')
        } else {
          console.log('Transaction added successfully:', data)
          // Clear form
          setTitle('')
          setAmount('')
          setType('expense')
          handleToastMessage('Transaction added successfully!', 'success')
        }
      } catch (error) {
      console.error('Error:', error)
      handleToastMessage('An unexpected error occurred. Please try again.', 'error')
    } finally {
      setIsLoading(false)
    }
  }


  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, '');
  }

  return (
    <div className="relative">
      {toastMessage && (
        <ToastMessage text={toastMessage.text} type={toastMessage.type} />
      )}
      <form onSubmit={handleSubmit} className='w-full md:w-[50vw] rounded-lg light-grey border p-5 flex flex-col gap-5'>
        <input 
          type="text" 
          placeholder="Transaction Name" 
          className="w-full px-4 py-3 rounded-lg border border-primary focus:border-primary focus:outline-none text-base" 
          value={title}
          required
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          onInput={handleInput}
        />
        <input 
          type="number" 
          placeholder="Amount(USD)" 
          className="w-full px-4 py-3 rounded-lg border border-primary focus:border-primary focus:outline-none text-base" 
          value={amount}
          required
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount((e.target.value))}
        />
        <div className="flex gap-4 w-full">
          <label className={`cursor-pointer p-7 flex-1 rounded-lg border text-center font-medium transition-all
            ${type === "expense" ? "bg-error text-white border-error" : "light-grey text-secondary-black"}`}
          >
            <input
              type="radio"
              name="type"
              value="expense"
              className="hidden"
              checked={type === "expense"}
              onChange={(e) => setType(e.target.value as 'expense' | 'income')}
            />
            Expense
          </label>

          <label className={`cursor-pointer p-7 flex-1 rounded-lg border text-center font-medium transition-all
            ${type === "income" ? "bg-success text-white border-success" : "light-grey text-secondary-black"}`}
          >
            <input
              type="radio"
              name="type"
              value="income"
              className="hidden"
              checked={type === "income"}
              onChange={(e) => setType(e.target.value as 'expense' | 'income')}
            />
            Income
          </label>
        </div>
        <Button 
          type='submit'
          text='Add Transaction'
          disabled={isLoading}
          isLoading={isLoading}
        />
      </form>
    </div>
  )
}

export default Form