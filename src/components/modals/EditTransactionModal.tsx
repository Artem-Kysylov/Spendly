import { useEffect, useRef, useState } from 'react'
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import Button from '../ui-elements/Button'
import TextInput from '../ui-elements/TextInput'
import RadioButton from '../ui-elements/RadioButton'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EditTransactionModalProps } from '../../types/types'

const EditTransactionModal = ({ title, onClose, onSubmit, isLoading = false, initialData, allowTypeChange = true }: EditTransactionModalProps) => {
    const [localTitle, setLocalTitle] = useState(initialData.title || '')
    const [amount, setAmount] = useState(initialData.amount?.toString() || '')
    const [type, setType] = useState<'expense' | 'income'>(initialData.type || 'expense')
    const [selectedDate, setSelectedDate] = useState<Date>(initialData.created_at ? new Date(initialData.created_at) : new Date())
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
    const [currentMonth, setCurrentMonth] = useState<Date>(initialData.created_at ? new Date(initialData.created_at) : new Date())
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus()
    }, [])

    const handleAmountInput = (e: React.FormEvent<HTMLInputElement>) => {
        const value = e.currentTarget.value
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setAmount(value)
        }
    }

    // Handle date selection
    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date)
            setIsDatePickerOpen(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!localTitle.trim() || !amount) return

        await onSubmit({
            id: initialData.id,
            title: localTitle.trim(),
            amount: parseFloat(amount),
            type: allowTypeChange ? type : initialData.type,
            budget_folder_id: initialData.budget_folder_id ?? null,
            created_at: selectedDate.toISOString(),
        })

        onClose()
    }

    const handleCancel = () => {
        setLocalTitle(initialData.title || '')
        setAmount(initialData.amount?.toString() || '')
        setType(initialData.type || 'expense')
        setSelectedDate(initialData.created_at ? new Date(initialData.created_at) : new Date())
        onClose()
    }

    return (
        <Dialog open={true} onOpenChange={(o) => { if (!o) onClose() }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-center">{title}</DialogTitle>
                </DialogHeader>
                <div className="mt-[30px]">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <TextInput
                            type="text"
                            placeholder="Transaction title"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            disabled={isLoading}
                        />
                        <TextInput
                            type="text"
                            placeholder="Amount (USD)"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onInput={handleAmountInput}
                            disabled={isLoading}
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
                                        disabled={isLoading}
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
                        
                        {allowTypeChange && (
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
                        )}
                        <DialogFooter className="justify-center sm:justify-center gap-4">
                            <Button
                                text="Cancel"
                                variant="ghost"
                                className="text-primary"
                                onClick={handleCancel}
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                text={isLoading ? 'Saving...' : 'Save'}
                                variant="primary"
                                disabled={isLoading || !localTitle.trim() || !amount}
                            />
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default EditTransactionModal