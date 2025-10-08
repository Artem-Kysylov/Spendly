import React, { useState } from 'react'
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Import components 
import TextInput from '../ui-elements/TextInput'
import Button from '../ui-elements/Button'

// Import types
import { BudgetDetailsFormProps } from '../../types/types'

const BudgetDetailsForm = ({ onSubmit, isSubmitting }: BudgetDetailsFormProps) => {
  const [transactionTitle, setTransactionTitle] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(transactionTitle, amount, selectedDate)
    // Очищаем форму только после успешного сабмита
    setTransactionTitle('')
    setAmount('')
    setSelectedDate(new Date())
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, '')
  }

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setIsDatePickerOpen(false)
    }
  }

  return (
    <div className='w-full rounded-lg border border-border bg-card p-[20px] min-h-[300px] flex flex-col'>
      <h3 className='text-secondary-black dark:text-white text-[25px] font-semibold text-center mb-[20px]'>Add new transaction📝</h3>
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
        
        {/* Date Picker */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-secondary-black dark:text-white">
            Pick up the date
          </label>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Pick a date"
                aria-expanded={isDatePickerOpen}
                aria-haspopup="dialog"
                disabled={isSubmitting}
                className={cn(
                  "h-[50px] px-[20px] w-full rounded-md border border-input bg-background text-sm ring-offset-background",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "flex items-center justify-between text-left font-normal",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <span>
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </span>
                <CalendarIcon className="h-4 w-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 border-0 shadow-lg" 
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200">
                {/* Кастомная навигация */}
                <div className="flex justify-between items-center mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      const newMonth = new Date(currentMonth)
                      newMonth.setMonth(newMonth.getMonth() - 1)
                      setCurrentMonth(newMonth)
                    }}
                    className="h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-gray-100 rounded transition-all duration-200 flex items-center justify-center"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-sm font-medium">
                    {format(currentMonth, "MMMM yyyy")}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newMonth = new Date(currentMonth)
                      newMonth.setMonth(newMonth.getMonth() + 1)
                      setCurrentMonth(newMonth)
                    }}
                    className="h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-gray-100 rounded transition-all duration-200 flex items-center justify-center"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  disabled={(date: Date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                  showOutsideDays={false}
                  className="w-full"
                  classNames={{
                    months: "flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4 w-full",
                    caption: "hidden", 
                    nav: "hidden", 
                    caption_label: "hidden",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex w-full",
                    head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem] text-center",
                    row: "flex w-full mt-2",
                    cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal hover:bg-gray-100 rounded transition-colors flex items-center justify-center border-0 outline-none focus:outline-none",
                    day_selected: "bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-700 focus:outline-none",
                    day_today: "bg-gray-100 text-gray-900 font-semibold",
                    day_outside: "text-gray-400 opacity-50",
                    day_disabled: "text-gray-300 opacity-50 cursor-not-allowed",
                    day_hidden: "invisible",
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
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