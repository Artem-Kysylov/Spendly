import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'

// Import components 
import Button from '../ui-elements/Button'
import TextInput from '../ui-elements/TextInput'
import RadioButton from '../ui-elements/RadioButton'

// Import types
import { TransactionModalProps } from '../../types/types'

// Component: TransactionModal
const TransactionModal = ({ title, onClose, onSubmit }: TransactionModalProps) => {
  const { session } = UserAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)

  // State 
  const [transactionTitle, setTransactionTitle] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.showModal()
    }
    return () => {
      if (dialogRef.current) {
        dialogRef.current.close()
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!session?.user) return onSubmit('Please login to add a transaction', 'error')    

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: session.user.id,
          title: transactionTitle,
          amount: Number(amount),
          type,
          created_at: new Date().toISOString()
        })
        .select()

      if (error) {
        console.error('Error inserting transaction:', error)
        onSubmit('Failed to add transaction. Please try again.', 'error')
      } else {
        console.log('Transaction added successfully:', data)
        setTransactionTitle('')
        setAmount('')
        setType('expense')
        onClose()
        onSubmit('Transaction added successfully!', 'success')
      }
    } catch (error) {
      console.error('Error:', error)
      onSubmit('An unexpected error occurred. Please try again.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, '')
  }

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4 text-center">{title}</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextInput
            type="text"
            placeholder="Transaction Name"
            value={transactionTitle}
            onChange={(e) => setTransactionTitle(e.target.value)}
            onInput={handleInput}
          />
          <TextInput
            type="number"
            placeholder="Amount(USD)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="flex gap-4">
            <RadioButton
              title="Expense"
              value="expense"
              currentValue={type}
              variant="expense"
              onChange={(e) => setType(e.target.value as 'expense' | 'income')}
            />
            <RadioButton
              title="Income"
              value="income"
              currentValue={type}
              variant="income"
              onChange={(e) => setType(e.target.value as 'expense' | 'income')}
            />
          </div>
          <div className="modal-action justify-center gap-4">
            <Button
              text="Cancel"
              variant="ghost"
              className="text-primary"
              onClick={onClose}
            />
            <Button
              type="submit"
              text="Submit"
              variant="default"
              disabled={isLoading}
              isLoading={isLoading}
            />
          </div>
        </form>
      </div>
    </dialog>
  )
}

export default TransactionModal