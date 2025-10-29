import { useEffect, useRef, useState } from 'react'

import Button from '../ui-elements/Button'
import TextInput from '../ui-elements/TextInput'
import RadioButton from '../ui-elements/RadioButton'
import CustomDatePicker from '../ui-elements/CustomDatePicker'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EditTransactionModalProps } from '../../types/types'
import { useTranslations } from 'next-intl'

const EditTransactionModal = ({ title, onClose, onSubmit, isLoading = false, initialData, allowTypeChange = true }: EditTransactionModalProps) => {
    const [localTitle, setLocalTitle] = useState(initialData.title || '')
    const [amount, setAmount] = useState(initialData.amount?.toString() || '')
    const [type, setType] = useState<'expense' | 'income'>(initialData.type || 'expense')
    const [selectedDate, setSelectedDate] = useState<Date>(initialData.created_at ? new Date(initialData.created_at) : new Date())
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus()
    }, [])

    const tCommon = useTranslations('common')
    const tModals = useTranslations('modals')

    const handleAmountInput = (e: React.FormEvent<HTMLInputElement>) => {
        const value = e.currentTarget.value
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setAmount(value)
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
                            placeholder={tModals('transaction.placeholder.title')}
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            disabled={isLoading}
                        />
                        <TextInput
                            type="number"
                            placeholder={tModals('transaction.placeholder.amountUSD')}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onInput={handleAmountInput}
                            disabled={isLoading}
                        />
                        
                        {/* Date Picker */}
                        <CustomDatePicker
                            selectedDate={selectedDate}
                            onDateSelect={setSelectedDate}
                            label={tModals('transaction.date.label')}
                            placeholder={tModals('transaction.date.placeholder')}
                        />

                        {allowTypeChange && (
                            <div className="flex gap-4">
                                <RadioButton
                                    title={tModals('transaction.type.expense')}
                                    value="expense"
                                    currentValue={type}
                                    variant="expense"
                                    onChange={(e) => setType(e.target.value as 'expense' | 'income')}
                                />
                                <RadioButton
                                    title={tModals('transaction.type.income')}
                                    value="income"
                                    currentValue={type}
                                    variant="income"
                                    onChange={(e) => setType(e.target.value as 'expense' | 'income')}
                                />
                            </div>
                        )}
                        <DialogFooter className="justify-center sm:justify-center gap-4">
                            <Button
                                text={tCommon('cancel')}
                                variant="ghost"
                                className="text-primary"
                                onClick={handleCancel}
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                text={tCommon('save')}
                                variant="primary"
                                disabled={isLoading || !localTitle.trim() || !amount}
                                isLoading={isLoading}
                            />
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default EditTransactionModal
