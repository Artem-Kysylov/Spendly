import { useState, useEffect, useRef } from 'react'
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'

// Import components 
import Button from '../ui-elements/Button'
import TextInput from '../ui-elements/TextInput'
import RadioButton from '../ui-elements/RadioButton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// Import types
import { TransactionModalProps, BudgetFolderItemProps } from '../../types/types'

// Component: TransactionModal
const TransactionModal = ({ title, onClose, onSubmit }: TransactionModalProps) => {
  const { session } = UserAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)

  // State 
  const [transactionTitle, setTransactionTitle] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('uncategorized')
  const [budgetFolders, setBudgetFolders] = useState<BudgetFolderItemProps[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isBudgetsLoading, setIsBudgetsLoading] = useState<boolean>(false)
  const [isTypeDisabled, setIsTypeDisabled] = useState<boolean>(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

  // Fetch budget folders
  const fetchBudgetFolders = async () => {
    if (!session?.user?.id) return

    try {
      setIsBudgetsLoading(true)
      const { data, error } = await supabase
        .from('budget_folders')
        .select('id, emoji, name, amount, type')
        .eq('user_id', session.user.id)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching budget folders:', error)
        return
      }

      if (data) {
        setBudgetFolders(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsBudgetsLoading(false)
    }
  }

  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.showModal()
    }
    
    // Fetch budget folders when modal opens
    fetchBudgetFolders()
    
    return () => {
      if (dialogRef.current) {
        dialogRef.current.close()
      }
    }
  }, [session?.user?.id])

  // Filter budgets based on search query
  const filteredBudgets = budgetFolders.filter(budget =>
    budget.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Check if we need to show search (more than 5 budgets)
  const showSearch = budgetFolders.length > 5

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
          budget_folder_id: selectedBudgetId === 'uncategorized' ? null : selectedBudgetId,
          created_at: selectedDate.toISOString()
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
        setSelectedBudgetId('uncategorized')
        setSelectedDate(new Date()) 
        setIsTypeDisabled(false) 
        setIsDatePickerOpen(false) 
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

  // Handler for budget selection change
  const handleBudgetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const budgetId = e.target.value
    setSelectedBudgetId(budgetId)
    
    if (budgetId === 'uncategorized') {
      // Enable radio buttons for uncategorized
      setIsTypeDisabled(false)
    } else {
      // Find selected budget and set type automatically
      const selectedBudget = budgetFolders.find(budget => budget.id === budgetId)
      if (selectedBudget) {
        setType(selectedBudget.type)
        setIsTypeDisabled(true)
      }
    }
  }

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setIsDatePickerOpen(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-[30px]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            
            {/* Budget Category Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-secondary-black dark:text-white">
                Choose budget category
              </label>
              <div className="relative">
                <select 
                  value={selectedBudgetId} 
                  onChange={handleBudgetChange}
                  className="h-[50px] px-[20px] pr-[40px] w-full rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                >
                  <option value="uncategorized">📝 Unbudgeted</option>
                  {budgetFolders.map((budget) => (
                    <option key={budget.id} value={budget.id}>
                      {budget.emoji} {budget.name}
                    </option>
                  ))}
                </select>
                {/* Custom dropdown arrow */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-[20px] pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {showSearch && (
                <input
                  type="text"
                  placeholder="Search budget..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-[50px] px-[20px] w-full rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              )}
              
              {isBudgetsLoading && (
                <p className="text-sm text-gray-500">Loading budgets...</p>
              )}
              
              {searchQuery && filteredBudgets.length === 0 && !isBudgetsLoading && (
                <p className="text-sm text-gray-500">No results found</p>
              )}
            </div>

            <div className="flex gap-4">
              <RadioButton
                title="Expense"
                value="expense"
                currentValue={type}
                variant="expense"
                onChange={(e) => setType(e.target.value as 'expense' | 'income')}
                disabled={isTypeDisabled}
              />
              <RadioButton
                title="Income"
                value="income"
                currentValue={type}
                variant="income"
                onChange={(e) => setType(e.target.value as 'expense' | 'income')}
                disabled={isTypeDisabled}
              />
            </div>
            
            {/* Information text when disabled */}
            {isTypeDisabled && (
              <p className="text-xs text-gray-500 -mt-2">
                Transaction type is automatically set based on selected budget category
              </p>
            )}
            
            <DialogFooter className="justify-center sm:justify-center gap-4">
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
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TransactionModal