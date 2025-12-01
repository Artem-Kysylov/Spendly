import { useState } from 'react'
import EmojiPicker from 'emoji-picker-react'

import Button from '../ui-elements/Button'
import TextInput from '../ui-elements/TextInput'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X } from 'lucide-react'
import useDeviceType from '@/hooks/useDeviceType'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet'

import { BudgetModalProps } from '../../types/types'
import { useTranslations } from 'next-intl'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'

const BudgetModal = ({
  title,
  onClose,
  onSubmit,
  isLoading = false,
  initialData,
  handleToastMessage,
}: BudgetModalProps) => {
  const tModals = useTranslations('modals')
  const tCommon = useTranslations('common')
  const tTransactions = useTranslations('transactions')
  const tBudgets = useTranslations('budgets')

  const { isMobile } = useDeviceType()
  const { mobileSheetsEnabled } = useFeatureFlags()

  const [emojiIcon, setEmojiIcon] = useState(initialData?.emoji || '💰')
  const [name, setName] = useState(initialData?.name || '')
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '')
  const [type, setType] = useState<'expense' | 'income'>(initialData?.type || 'expense')
  const [openEmojiPicker, setOpenEmojiPicker] = useState(false)

  const [selectedColor, setSelectedColor] = useState<string | null>(initialData?.color_code ?? null)
  const COLOR_OPTIONS: Array<string | null> = [null, 'FFA09A', '9CFFB4', '96CBFF', 'FFEE98', 'E0A3FF']

  const [rolloverEnabled, setRolloverEnabled] = useState<boolean>(initialData?.rolloverEnabled ?? true)
  const [rolloverMode, setRolloverMode] = useState<'positive-only' | 'allow-negative'>(
    initialData?.rolloverMode ?? 'positive-only',
  )

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
      await onSubmit(
        emojiIcon,
        name.trim(),
        parseFloat(amount),
        type,
        selectedColor,
        type === 'expense' ? rolloverEnabled : false,
        type === 'expense' ? rolloverMode : undefined,
        undefined, // кап пока не настраиваем (задача 29)
      )
      onClose()
    } catch (error) {
      console.error('Error in budget modal:', error)
      if (handleToastMessage) {
        handleToastMessage(tModals('budget.toast.saveFailed'), 'error')
      }
    }
  }

  // Мобильная версия: полный экран через Sheet (под фича‑флагом)
  if (isMobile && mobileSheetsEnabled) {
    return (
      <Sheet open={true} onOpenChange={(o) => { if (!o) onClose() }}>
        <SheetContent
          side="bottom"
          className="fixed h-[95dvh] pb-[env(safe-area-inset-bottom)] overflow-y-auto z-[10000]"
          overlayClassName="bg-foreground/45"
        >
          {/* Drawer handle */}
          <div className="mx-auto mt-2 mb-2 h-1.5 w-12 rounded-full bg-muted" />

          <SheetHeader>
            <SheetTitle className="text-center">{title}</SheetTitle>
          </SheetHeader>

          <div className="mt-[10px] px-4">
            <Tabs
              value={type}
              onValueChange={(v) => setType(v as 'expense' | 'income')}
              className="mb-4 flex justify-center"
            >
              <TabsList className="mx-auto gap-2">
                <TabsTrigger
                  value="expense"
                  className="data-[state=active]:bg-error data-[state=active]:text-error-foreground"
                >
                  {tModals('budget.type.expense')}
                </TabsTrigger>
                <TabsTrigger
                  value="income"
                  className="data-[state=active]:bg-success data-[state=active]:text-success-foreground"
                >
                  {tModals('budget.type.income')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 mb-[20px]">
              <Button
                text={emojiIcon}
                className="bg-[#F5F3FF] dark:bg-background text-primary text-[25px] w-[60px] h-[60px] flex items-center justify-center rounded-lg hover:opacity-50 transition-opacity duration-300 border-none"
                onClick={() => setOpenEmojiPicker(true)}
              />
              <TextInput
                type="text"
                placeholder={tModals('budget.placeholder.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
            </div>

            <div className="absolute top-0 right-0">
              <EmojiPicker
                open={openEmojiPicker}
                onEmojiClick={(e) => {
                  setEmojiIcon(e.emoji)
                  setOpenEmojiPicker(false)
                }}
              />
            </div>

            {/* Color picker */}
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
                    {!color && <span className="block w-9 h-[2px] rotate-45 bg-foreground dark:bg-white" />}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <TextInput
                type="text"
                placeholder={tTransactions('table.headers.amount')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onInput={handleInput}
                disabled={isLoading}
                inputMode="decimal"
                className={type === 'expense' ? 'text-error text-2xl font-medium' : 'text-success text-2xl font-medium'}
              />

              {type === 'expense' && (
                <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                  <label className="text-sm font-medium">{tBudgets('rollover.panelTitle')}</label>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{tBudgets('rollover.toggleLabel')}</span>
                    <button
                      type="button"
                      onClick={() => setRolloverEnabled((v) => !v)}
                      className={`w-10 h-6 rounded-full ${rolloverEnabled ? 'bg-primary' : 'bg-muted'} relative`}
                      aria-pressed={rolloverEnabled}
                    >
                      <span className={`absolute top-0.5 ${rolloverEnabled ? 'left-5' : 'left-1'} w-5 h-5 rounded-full bg-white`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{tBudgets('rollover.modeLabel')}</span>
                    <select
                      value={rolloverMode}
                      onChange={(e) => setRolloverMode(e.target.value as 'positive-only' | 'allow-negative')}
                      className="h-8 rounded-md border border-border bg-card px-2 text-sm"
                    >
                      <option value="positive-only">{tBudgets('rollover.positiveOnly')}</option>
                      <option value="allow-negative">{tBudgets('rollover.allowNegative')}</option>
                    </select>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                text={isLoading ? tCommon('saving') : tCommon('submit')}
                variant="default"
                disabled={isLoading || !name.trim() || !amount}
                className={`w-full ${type === 'expense' ? 'bg-error text-error-foreground' : 'bg-success text-success-foreground'}`}
              />
            </form>
          </div>

          <SheetFooter className="px-4">
            <SheetClose className="h-10 px-4 w-full rounded-md border border-input bg-background text-sm text-center">
              {tCommon('close')}
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  // Десктопная версия: обычный Dialog
  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
            <X size={22} />
          </DialogClose>
        </DialogHeader>

        <div className="mt-[30px]">
          <Tabs
            value={type}
            onValueChange={(v) => setType(v as 'expense' | 'income')}
            className="mb-4 flex justify-center"
          >
            <TabsList className="mx-auto gap-2">
              <TabsTrigger
                value="expense"
                className="data-[state=active]:bg-error data-[state=active]:text-error-foreground"
              >
                {tModals('budget.type.expense')}
              </TabsTrigger>
              <TabsTrigger
                value="income"
                className="data-[state=active]:bg-success data-[state=active]:text-success-foreground"
              >
                {tModals('budget.type.income')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 mb-[20px]">
            <Button
              text={emojiIcon}
              className="bg-[#F5F3FF] dark:bg-background text-primary text-[25px] w-[60px] h-[60px] flex items-center justify-center rounded-lg hover:opacity-50 transition-opacity duration-300 border-none"
              onClick={() => setOpenEmojiPicker(true)}
            />
            <TextInput
              type="text"
              placeholder={tModals('budget.placeholder.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
          </div>

          <div className="absolute top-0 right-0">
            <EmojiPicker
              open={openEmojiPicker}
              onEmojiClick={(e) => {
                setEmojiIcon(e.emoji)
                setOpenEmojiPicker(false)
              }}
            />
          </div>

          {/* Color picker */}
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
                  {!color && <span className="block w-9 h-[2px] rotate-45 bg-foreground dark:bg-white" />}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextInput
              type="text"
              placeholder={tTransactions('table.headers.amount')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onInput={handleInput}
              disabled={isLoading}
              inputMode="decimal"
              className={type === 'expense' ? 'text-error text-2xl font-medium' : 'text-success text-2xl font-medium'}
            />

            {type === 'expense' && (
              <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <label className="text-sm font-medium">{tBudgets('rollover.panelTitle')}</label>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{tBudgets('rollover.toggleLabel')}</span>
                  <button
                    type="button"
                    onClick={() => setRolloverEnabled((v) => !v)}
                    className={`w-10 h-6 rounded-full ${rolloverEnabled ? 'bg-primary' : 'bg-muted'} relative`}
                    aria-pressed={rolloverEnabled}
                  >
                    <span className={`absolute top-0.5 ${rolloverEnabled ? 'left-5' : 'left-1'} w-5 h-5 rounded-full bg-white`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{tBudgets('rollover.modeLabel')}</span>
                  <select
                    value={rolloverMode}
                    onChange={(e) => setRolloverMode(e.target.value as 'positive-only' | 'allow-negative')}
                    className="h-8 rounded-md border border-border bg-card px-2 text-sm"
                  >
                    <option value="positive-only">{tBudgets('rollover.positiveOnly')}</option>
                    <option value="allow-negative">{tBudgets('rollover.allowNegative')}</option>
                  </select>
                </div>
              </div>
            )}

            <Button
              type="submit"
              text={isLoading ? tCommon('saving') : tCommon('submit')}
              variant="default"
              disabled={isLoading || !name.trim() || !amount}
              className={`w-full ${type === 'expense' ? 'bg-error text-error-foreground' : 'bg-success text-success-foreground'}`}
            />
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BudgetModal