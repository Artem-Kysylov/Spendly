// Imports 
import { useState, useEffect, useRef } from 'react'
import EmojiPicker from 'emoji-picker-react'

// Import components 
import Button from '../ui-elements/Button'
import TextInput from '../ui-elements/TextInput'
import RadioButton from '../ui-elements/RadioButton'

// Import types 
import { BudgetModalProps } from '../../types/types'

const BudgetModal = ({ title, onClose, onSubmit, isLoading = false, initialData, handleToastMessage }: BudgetModalProps) => {
    const dialogRef = useRef<HTMLDialogElement>(null)

    // State 
    const [emojiIcon, setEmojiIcon] = useState<string>(initialData?.emoji || '😊')
    const [openEmojiPicker, setOpenEmojiPicker] = useState<boolean>(false)
    const [budgetName, setBudgetName] = useState<string>(initialData?.name || '')
    const [amount, setAmount] = useState<string>(initialData?.amount?.toString() || '')
    const [type, setType] = useState<'expense' | 'income'>(initialData?.type || 'expense')
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!emojiIcon || !budgetName || !amount) return

        try {
            setIsSubmitting(true)
            await onSubmit(emojiIcon, budgetName, Number(amount), type)
            onClose()
        } catch (error) {
            console.error('Error submitting budget:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, '')
    }

    const handleCancel = () => {
        if (handleToastMessage) {
            handleToastMessage('Budget creation cancelled', 'error')
        }
        onClose()
    }

    return (
        <dialog ref={dialogRef} className="modal">
            <div className="modal-box">
                <h3 className="font-semibold text-[25px] mb-4 text-center">{title}</h3>
                <div>
                    <div className='flex items-center justify-center gap-2 mb-[20px]'>
                        <Button
                            text={emojiIcon}
                            className="bg-[#F5F3FF] text-primary text-[25px] w-[60px] h-[60px] flex items-center justify-center rounded-lg hover:opacity-50 transition-opacity duration-300 border-none"
                            onClick={() => setOpenEmojiPicker(true)}
                        />
                        <span className='text-light-grey'>Pick an emoji (optional)</span>
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
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <TextInput
                        type="text"
                        placeholder="Budget Name"
                        value={budgetName}
                        onChange={(e) => setBudgetName(e.target.value)}
                        onInput={handleInput}
                        disabled={isLoading}
                    />
                    <TextInput
                        type="number"
                        placeholder="Amount(USD)"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
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
                    <div className="modal-action justify-center gap-4">
                        <Button
                            text="Cancel"
                            className="btn-ghost text-primary"
                            onClick={handleCancel}
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            text={initialData ? "Save changes" : "Create budget"}
                            className="btn-primary text-white"
                            disabled={isLoading || !budgetName || !amount}
                            isLoading={isSubmitting}
                        />
                    </div>
                </form>
            </div>
        </dialog>
    )
}

export default BudgetModal