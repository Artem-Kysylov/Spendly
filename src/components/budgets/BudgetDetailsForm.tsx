import React, { useState } from 'react'
import { motion } from 'motion/react'

import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'
import TextInput from '../ui-elements/TextInput'
import Button from '../ui-elements/Button'
import CustomDatePicker from '../ui-elements/CustomDatePicker'


// Import types
import { BudgetDetailsFormProps } from '../../types/types'

const BudgetDetailsForm = ({ onSubmit, isSubmitting }: BudgetDetailsFormProps) => {
  const [transactionTitle, setTransactionTitle] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(transactionTitle, amount, selectedDate)
    // Очищаем форму только после успешного сабмита
    setTransactionTitle('')
    setAmount('')
    setSelectedDate(new Date())
  }

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z\s]/g, '')
  }

  return (
    <motion.div 
      className='w-full max-w-full rounded-lg border border-border bg-card p-[20px] min-h-[300px] flex flex-col'
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
    >
      <motion.h3 
        className='text-secondary-black dark:text-white text-[22px] sm:text-[24px] md:text-[25px] font-semibold text-center mb-[20px] break-words'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        Add new transaction📝
      </motion.h3>
      <motion.form 
        onSubmit={handleSubmit} 
        className='flex flex-col gap-[20px] flex-1 justify-center'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <TextInput
            type="text"
            placeholder="Transaction Name"
            value={transactionTitle}
            onChange={(e) => setTransactionTitle(e.target.value)}
            onInput={handleInput}
            disabled={isSubmitting}
          />    
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <TextInput
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isSubmitting}
          />
        </motion.div>
        
        {/* Date Picker */}
        <motion.div 
          className="flex flex-col gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <CustomDatePicker
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            label="Pick up the date"
            placeholder="Pick a date"
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <Button
            type="submit"
            variant="primary"
            text="Add new transaction"
            disabled={isSubmitting || !transactionTitle || !amount}
            isLoading={isSubmitting}
          />
        </motion.div>
      </motion.form>
    </motion.div>
  )
}

export default BudgetDetailsForm