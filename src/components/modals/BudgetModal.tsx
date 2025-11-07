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
import { useTranslations } from 'next-intl'

const BudgetModal = ({ title, onClose, onSubmit, isLoading = false, initialData, handleToastMessage }: BudgetModalProps) => {
    const [emojiIcon, setEmojiIcon] = useState(initialData?.emoji || '💰')
    const [name, setName] = useState(initialData?.name || '')
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '')
    const [type, setType] = useState<'expense' | 'income'>(initialData?.type || 'expense')
    const [openEmojiPicker, setOpenEmojiPicker] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Новое: состояние пикера цвета и список доступных цветов
    const [selectedColor, setSelectedColor] = useState<string | null>(initialData?.color_code ?? null)
    const COLOR_OPTIONS: Array<string | null> = [null, 'FFA09A', '9CFFB4', '96CBFF', 'FFEE98', 'E0A3FF']
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

    const tModals = useTranslations('modals')
    const tCommon = useTranslations('common')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !amount) return
        try {
            await onSubmit(emojiIcon, name.trim(), parseFloat(amount), type, selectedColor)
            onClose()
        } catch (error) {
            console.error('Error in budget modal:', error)
            if (handleToastMessage) {
                handleToastMessage(tModals('budget.toast.saveFailed'), 'error')
            }
        }
    }

    const handleCancel = () => {
        setEmojiIcon(initialData?.emoji || '💰')
        setName(initialData?.name || '')
        setAmount(initialData?.amount?.toString() || '')
        setType(initialData?.type || 'expense')
        setSelectedColor(initialData?.color_code ?? null)
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
                            className="bg-[#F5F3FF] dark:bg-background text-primary text-[25px] w-[60px] h-[60px] flex items-center justify-center rounded-lg hover:opacity-50 transition-opacity duration-300 border-none"
                            onClick={() => setOpenEmojiPicker(true)}
                        />
                        <span className='text-secondary-black dark:text-white'>{tModals('budget.pickEmojiOptional')}</span>
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

                    {/* Color picker: moved under emoji and centered */}
                    <div className="flex flex-col items-center gap-2 mb-[20px]">
                      <label className="text-sm font-medium text-secondary-black dark:text-white text-center">
                        {tModals('budget.pickColor')}
                      </label>
                      <div className="flex items-center justify-center gap-3">
                        {COLOR_OPTIONS.map((color, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            aria-label={color ? `#${color}` : tModals('budget.color.none')}
                            title={color ? `#${color}` : tModals('budget.color.none')}
                            className={`w-8 h-8 rounded-full border ${selectedColor === color ? 'ring-2 ring-primary' : 'border-border'} flex items-center justify-center overflow-hidden`}
                            style={{ backgroundColor: color ? `#${color}` : 'transparent' }}
                          >
                            {!color && (
                              <span className="block w-9 h-[2px] rotate-45 bg-foreground dark:bg-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <TextInput
                            type="text"
                            placeholder={tModals('budget.placeholder.name')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                        />
                        <TextInput
                            type="text"
                            placeholder={tModals('budget.placeholder.amountUSD')}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onInput={handleInput}
                            disabled={isLoading}
                        />
                        <div className="flex gap-4">
                            <RadioButton
                                title={tModals('budget.type.expense')}
                                value="expense"
                                currentValue={type}
                                variant="expense"
                                onChange={(e) => setType(e.target.value as 'expense' | 'income')}
                                inactiveBgClassName="bg-background"
                            />
                            <RadioButton
                                title={tModals('budget.type.income')}
                                value="income"
                                currentValue={type}
                                variant="income"
                                onChange={(e) => setType(e.target.value as 'expense' | 'income')}
                                inactiveBgClassName="bg-background"
                            />
                        </div>
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
                                text={isLoading ? tCommon('saving') : tCommon('submit')}
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