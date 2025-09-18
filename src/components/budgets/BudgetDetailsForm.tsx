import React, { useState } from 'react'

// Import components 
import TextInput from '../ui-elements/TextInput'
import Button from '../ui-elements/Button'

// Import types
import { BudgetDetailsFormProps } from '../../types/types'

const BudgetDetailsForm = ({ onSubmit, isSubmitting }: BudgetDetailsFormProps) => {
  const [transactionTitle, setTransactionTitle] = useState<string>('')
  const [amount, setAmount] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(transactionTitle, amount)
    // Очищаем форму только после успешного сабмита
    setTransactionTitle('')
    setAmount('')
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, '')
  }

  return (
    <div className='w-full rounded-lg border border-light-grey p-[20px] min-h-[300px] flex flex-col'>
      <h3 className='text-secondary-black text-[25px] font-semibold text-center mb-[20px]'>Add new transaction📝</h3>
      <form onSubmit={handleSubmit} className='flex flex-col gap-[20px] flex-1 justify-center'>
        <TextInput
          type="text"
          placeholder="Transaction Name"
          value={transactionTitle}
          onChange={(e) => setTransactionTitle(e.target.value)}
          onInput={handleInput}
          disabled={isSubmitting}
        />    
        <TextInput
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          variant="primary"
          text="Add new transaction"
          disabled={isSubmitting || !transactionTitle || !amount}
          isLoading={isSubmitting}
        />
      </form>
    </div>
  )
}

export default BudgetDetailsForm