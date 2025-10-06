// Imports 
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Plus } from 'lucide-react'

// Import components 
import Button from '../ui-elements/Button'

// Component: Form
function Form() {
  const { session } = UserAuth()
  const { toast } = useToast()

  // State 
  const [title, setTitle] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Handlers 
  const handleToastMessage = (text: string, type: 'success' | 'error') => {
    toast({
      variant: type === 'success' ? 'success' : 'destructive',
      description: text,
      duration: 3000,
    })
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
      <form onSubmit={handleSubmit} className='w-full md:w-[50vw] rounded-lg border border-border p-5 flex flex-col gap-5'>
        <input 
          type="text" 
          placeholder="Transaction Name" 
          className="w-full px-4 py-3 rounded-lg border border-primary bg-background focus:border-primary focus:outline-none text-base" 
          value={title}
          required
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          onInput={handleInput}
        />
        <input 
          type="number" 
          placeholder="Amount(USD)" 
          className="w-full px-4 py-3 rounded-lg border border-primary bg-background focus:border-primary focus:outline-none text-base" 
          value={amount}
          required
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount((e.target.value))}
        />
        <div className="flex gap-4 w-full">
          <label className={`cursor-pointer p-7 flex-1 rounded-lg border text-center font-medium transition-all
            ${type === "expense" ? "bg-error text-error-foreground border-error" : "bg-background text-foreground border-border"}`}
          >
            <input
              type="radio"
              name="type"
              value="expense"
              className="hidden"
              checked={type === "expense"}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setType(e.target.value as 'expense' | 'income')}
            />
            Expense
          </label>
          <label className={`cursor-pointer p-7 flex-1 rounded-lg border text-center font-medium transition-all
            ${type === "income" ? "bg-success text-success-foreground border-success" : "bg-background text-foreground border-border"}`}
          >
            <input
              type="radio"
              name="type"
              value="income"
              className="hidden"
              checked={type === "income"}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setType(e.target.value as 'expense' | 'income')}
            />
            Income
          </label>
        </div>
        <Button 
          text={isLoading ? 'Adding...' : 'Add Transaction'} 
          variant="primary" 
          type="submit"
          disabled={isLoading}
          icon={!isLoading ? <Plus size={16} className="text-primary-foreground" /> : undefined}
        />
      </form>
    </div>
  )
}

export default Form