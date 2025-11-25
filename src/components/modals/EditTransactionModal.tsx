import { useEffect, useRef, useState } from 'react'

import Button from '../ui-elements/Button'
import TextInput from '../ui-elements/TextInput'
import RadioButton from '../ui-elements/RadioButton'
import HybridDatePicker from '../ui-elements/HybridDatePicker'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X } from 'lucide-react'
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
    const tTransactions = useTranslations('transactions')

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
                    <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X size={22} /></DialogClose>
                </DialogHeader>
                <div className="mt-[30px]">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <Tabs value={type} onValueChange={(v) => { if (allowTypeChange) setType(v as 'expense' | 'income') }} className="mb-3 flex justify-center">
                          <TabsList className="mx-auto gap-2">
                            <TabsTrigger value="expense" disabled={!allowTypeChange} className="data-[state=active]:bg-error data-[state=active]:text-error-foreground">{tModals('transaction.type.expense')}</TabsTrigger>
                            <TabsTrigger value="income" disabled={!allowTypeChange} className="data-[state=active]:bg-success data-[state=active]:text-success-foreground">{tModals('transaction.type.income')}</TabsTrigger>
                          </TabsList>
                        </Tabs>
                        <TextInput
                            type="number"
                            placeholder={tTransactions('table.headers.amount')}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onInput={handleAmountInput}
                            disabled={isLoading}
                            inputMode="decimal"
                            autoFocus
                            className={`text-3xl font-medium ${type === 'expense' ? 'text-error' : 'text-success'}`}
                        />
                        <TextInput
                            type="text"
                            placeholder={tModals('transaction.placeholder.title')}
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            disabled={isLoading}
                        />

                        <HybridDatePicker
                            selectedDate={selectedDate}
                            onDateSelect={setSelectedDate}
                            label={tModals('transaction.date.label')}
                            placeholder={tModals('transaction.date.placeholder')}
                        />
                        {!allowTypeChange && (
                          <p className="text-xs text-gray-500 -mt-2">
                            {tModals('transaction.autoTypeInfo')}
                          </p>
                        )}
                        <div className="sticky bottom-0 mt-4">
                            <Button
                                type="submit"
                                text={tCommon('save')}
                                variant="default"
                                disabled={isLoading || !localTitle.trim() || !amount}
                                isLoading={isLoading}
                                className={`w-full ${type === 'expense' ? 'bg-error text-error-foreground' : 'bg-success text-success-foreground'}`}
                            />
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default EditTransactionModal