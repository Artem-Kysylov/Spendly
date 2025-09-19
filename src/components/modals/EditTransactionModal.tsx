import { useEffect, useRef, useState } from 'react'
import Button from '../ui-elements/Button'
import TextInput from '../ui-elements/TextInput'
import RadioButton from '../ui-elements/RadioButton'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EditTransactionModalProps } from '../../types/types'

const EditTransactionModal = ({ title, onClose, onSubmit, isLoading = false, initialData }: EditTransactionModalProps) => {
    const [localTitle, setLocalTitle] = useState(initialData.title || '')
    const [amount, setAmount] = useState(initialData.amount?.toString() || '')
    const [type, setType] = useState<'expense' | 'income'>(initialData.type || 'expense')
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!localTitle.trim() || !amount) return

        await onSubmit({
            id: initialData.id,
            title: localTitle.trim(),
            amount: parseFloat(amount),
            type,
            budget_folder_id: initialData.budget_folder_id ?? null,
        })

        onClose()
    }

    const handleCancel = () => {
        setLocalTitle(initialData.title || '')
        setAmount(initialData.amount?.toString() || '')
        setType(initialData.type || 'expense')
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