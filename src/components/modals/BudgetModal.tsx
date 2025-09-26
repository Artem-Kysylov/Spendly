// Import types
import { useState, useEffect, useRef } from 'react'
import EmojiPicker from 'emoji-picker-react'

// Import components
import Button from '../ui-elements/Button'
import TextInput from '../ui-elements/TextInput'
import RadioButton from '../ui-elements/RadioButton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// Import types
import { BudgetModalProps } from '../../types/types'

const BudgetModal = ({ title, onClose, onSubmit, isLoading = false, initialData, handleToastMessage }: BudgetModalProps) => {
    const [emojiIcon, setEmojiIcon] = useState(initialData?.emoji || '💰')
    const [name, setName] = useState(initialData?.name || '')
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '')
    const [type, setType] = useState<'expense' | 'income'>(initialData?.type || 'expense')
    const [openEmojiPicker, setOpenEmojiPicker] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
    }, [])

    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
        const value = e.currentTarget.value
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setAmount(value)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !amount) return

        try {
            await onSubmit(emojiIcon, name.trim(), parseFloat(amount), type)
            onClose()
        } catch (error) {
            console.error('Error in budget modal:', error)
            if (handleToastMessage) {
                handleToastMessage('Failed to save budget folder', 'error')
            }
        }
    }

    const handleCancel = () => {
        setEmojiIcon(initialData?.emoji || '💰')
        setName(initialData?.name || '')
        setAmount(initialData?.amount?.toString() || '')
        setType(initialData?.type || 'expense')
        onClose()
    }

    return (
        <Dialog open={true} onOpenChange={(o) => { if (!o) onClose() }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-center">{title}</DialogTitle>
                </DialogHeader>
                <div className="mt-[30px]">
                    <div className='flex items-center justify-center gap-2 mb-[20px]'>
                        <Button
                            text={emojiIcon}
                            className="bg-[#F5F3FF] text-primary text-[25px] w-[60px] h-[60px] flex items-center justify-center rounded-lg hover:opacity-50 transition-opacity duration-300 border-none"
                            onClick={() => setOpenEmojiPicker(true)}
                        />
                        <span className='text-secondary-black'>Pick an emoji (optional)</span>
                    </div>
                    <div className='absolute top-0 right-0'>
                        <EmojiPicker 
                            open={openEmojiPicker}
                            onEmojiClick={(e) => {
                                setEmojiIcon(e.emoji)
                                setOpenEmojiPicker(false)
                            }}
                        />
                    </div>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <TextInput
                            type="text"
                            placeholder="Budget Folder Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            className="!bg-gray-50"
                        />
                        <TextInput
                            type="text"
                            placeholder="Amount(USD)"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onInput={handleInput}
                            disabled={isLoading}
                            className="!bg-gray-50"
                        />
                        <div className="flex gap-4">
                            <RadioButton
                                title="Expense"
                                value="expense"
                                currentValue={type}
                                variant="expense"
                                onChange={(e) => setType(e.target.value as 'expense' | 'income')}
                                inactiveBgClassName="bg-background"
                            />
                            <RadioButton
                                title="Income"
                                value="income"
                                currentValue={type}
                                variant="income"
                                onChange={(e) => setType(e.target.value as 'expense' | 'income')}
                                inactiveBgClassName="bg-background"
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
                                text={isLoading ? 'Saving...' : 'Submit'}
                                variant="primary"
                                disabled={isLoading || !name.trim() || !amount}
                            />
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default BudgetModal