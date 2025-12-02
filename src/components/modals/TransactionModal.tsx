// Компонент: TransactionModal
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import { useTranslations } from 'next-intl'

import Button from '@/components/ui-elements/Button'
import TextInput from '@/components/ui-elements/TextInput'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Command, CommandList, CommandInput, CommandGroup, CommandItem, CommandEmpty } from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet'
import useDeviceType from '@/hooks/useDeviceType'
import HybridDatePicker from '@/components/ui-elements/HybridDatePicker'
import { X } from 'lucide-react'

import type { TransactionModalProps, BudgetFolderItemProps } from '@/types/types'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'

function TransactionModal({ title, onClose, onSubmit, initialBudgetId, initialData, allowTypeChange = true }: TransactionModalProps) {
  const { session } = UserAuth()
  const tModals = useTranslations('modals')
  const tCommon = useTranslations('common')
  const tSettings = useTranslations('userSettings')
  const tTransactions = useTranslations('transactions')

  const { isMobile } = useDeviceType()
  const { toast } = useToast()
  const { mobileSheetsEnabled } = useFeatureFlags()
  const [internalOpen, setInternalOpen] = useState(true)

  const handleClose = () => {
    setInternalOpen(false)
    setTimeout(() => {
      onClose()
    }, 450) // Wait for animation
  }

  const [transactionTitle, setTransactionTitle] = useState<string>(initialData?.title || '')
  const [amount, setAmount] = useState<string>(initialData?.amount?.toString() || '')
  const [type, setType] = useState<'expense' | 'income'>(initialData?.type || 'expense')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false)

  const [templates, setTemplates] = useState<
    Array<{ id: string; title: string; amount: number; type: 'expense' | 'income'; budget_folder_id: string | null }>
  >([])

  const [recentTitles, setRecentTitles] = useState<string[]>([])
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>(initialData?.budget_folder_id || initialBudgetId || 'unbudgeted')
  const [budgetFolders, setBudgetFolders] = useState<BudgetFolderItemProps[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isBudgetsLoading, setIsBudgetsLoading] = useState<boolean>(false)
  const [isTypeDisabled, setIsTypeDisabled] = useState<boolean>(!allowTypeChange)
  const [selectedDate, setSelectedDate] = useState<Date>(initialData?.created_at ? new Date(initialData.created_at) : new Date())

  // ref для поля суммы
  const amountRef = useRef<HTMLInputElement | null>(null)



  // Фокусируем поле суммы после монтирования
  useEffect(() => {
    const timer = setTimeout(() => {
      amountRef.current?.focus()
    }, 60)
    return () => clearTimeout(timer)
  }, [])

  const fetchBudgetFolders = async () => {
    if (!session?.user?.id) return
    try {
      setIsBudgetsLoading(true)
      const { data, error } = await supabase
        .from('budget_folders')
        .select('id, emoji, name, amount, type, color_code')
        .eq('user_id', session.user.id)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching budget folders:', error)
        return
      }
      if (data) setBudgetFolders(data as BudgetFolderItemProps[])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsBudgetsLoading(false)
    }
  }

  useEffect(() => {
    fetchBudgetFolders()
    ;(async () => {
      if (!session?.user?.id) return
      try {
        const { data } = await supabase
          .from('transaction_templates')
          .select('id, title, amount, type, budget_folder_id')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
        setTemplates((data || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          amount: Number(t.amount || 0),
          type: t.type,
          budget_folder_id: t.budget_folder_id ?? null,
        })))
      } catch { /* ignore */ }

      try {
        const { data } = await supabase
          .from('transactions')
          .select('title')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        const uniq = Array.from(new Set((data || []).map((r: any) => r.title).filter(Boolean)))
        setRecentTitles(uniq)
      } catch { /* ignore */ }
    })()
  }, [session?.user?.id])

  // Применяем предзаполненный бюджет после загрузки списков
  useEffect(() => {
    if (initialBudgetId && budgetFolders.length > 0) {
      const exists = budgetFolders.some(b => b.id === initialBudgetId)
      if (exists) {
        applyBudgetId(initialBudgetId)
      }
    }
  }, [initialBudgetId, budgetFolders])

  const filteredBudgets = budgetFolders.filter((budget) =>
    budget.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const showSearch = budgetFolders.length > 5

  // Нормализация заголовка (совпадает с серверной логикой)
  const normalizeTitle = (raw: string): string => {
    const s = (raw || '').toLowerCase()
    const stripped = s
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return stripped.replace(/(?:^|\s)[#*]?\d{3,}\b/g, '').trim()
  }

  // Применение бюджета, синхронизация типа
  const applyBudgetId = (budgetId: string) => {
    setSelectedBudgetId(budgetId)
    if (budgetId === 'unbudgeted') {
      setIsTypeDisabled(false)
    } else {
      const selectedBudget = budgetFolders.find((budget) => budget.id === budgetId)
      if (selectedBudget) {
        setType(selectedBudget.type)
        setIsTypeDisabled(true)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!session?.user) {
      onSubmit('Please login to add a transaction', 'error')
      return
    }

    try {
      setIsLoading(true)
      const transactionData = {
        user_id: session.user.id,
        title: transactionTitle,
        amount: Number(amount),
        type,
        budget_folder_id: selectedBudgetId === 'unbudgeted' ? null : selectedBudgetId,
        created_at: selectedDate.toISOString(),
      }

      if (initialData) {
        // Update existing transaction
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', initialData.id)
          .eq('user_id', session.user.id)

        if (error) {
          console.error('Error updating transaction:', error)
          onSubmit('Failed to update transaction. Please try again.', 'error')
        } else {
          onSubmit('Transaction updated successfully!', 'success')
          handleClose()
        }
      } else {
        // Insert new transaction
        const { error } = await supabase
          .from('transactions')
          .insert(transactionData)

        if (error) {
          console.error('Error inserting transaction:', error)
          onSubmit('Failed to add transaction. Please try again.', 'error')
        } else {
          if (saveAsTemplate && session?.user?.id) {
            const limitReached = templates.length >= 3 // free plan limit — проверка в UI ниже
            if (limitReached) {
              toast({
                title: tModals('transaction.templates.limitTitle'),
                description: tModals('transaction.templates.limitDescription'),
                variant: 'destructive'
              })
            } else {
              try {
                const exists = templates.some(t => normalizeTitle(t.title) === normalizeTitle(transactionTitle))
                if (!exists) {
                  await supabase.from('transaction_templates').insert({
                    user_id: session.user.id,
                    title: transactionTitle,
                    amount: Number(amount),
                    type,
                    budget_folder_id: selectedBudgetId === 'unbudgeted' ? null : selectedBudgetId,
                  })
                }
              } catch { /* ignore */ }
            }
          }

          // Reset form
          setTransactionTitle('')
          setAmount('')
          setType('expense')
          setSelectedBudgetId('unbudgeted')
          setSelectedDate(new Date())
          setIsTypeDisabled(false)

          onSubmit('Transaction added successfully!', 'success')
          handleClose()
        }
      }
    } catch (err) {
      console.error('Error:', err)
      onSubmit('An unexpected error occurred. Please try again.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTitleSanitize = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z\s]/g, '')
  }

  const handleBudgetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const budgetId = e.target.value
    applyBudgetId(budgetId)
  }

  // Мобильная версия: шторка Sheet (под фича‑флагом)
  if (isMobile && mobileSheetsEnabled) {
    return (
      <Sheet open={internalOpen} onOpenChange={(open) => {
        if (!open) {
          handleClose()
        }
      }}>
        <SheetContent
          side="bottom"
          className="transaction-modal fixed h-[95dvh] pb-[env(safe-area-inset-bottom)] overflow-y-auto z-[10000]"
          overlayClassName="bg-foreground/45"
        >
          <div className="flex flex-col">
            {/* Drawer handle */}
            <div className="mx-auto mt-2 mb-2 h-1.5 w-12 rounded-full bg-muted" />
            <SheetHeader>
              <SheetTitle className="text-center text-xl font-semibold w-full">
                {title} 📉
              </SheetTitle>
            </SheetHeader>

            <div className="mt-[10px] px-4">
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <Tabs value={type} onValueChange={(v) => setType(v as 'expense' | 'income')} className="mb-3 flex justify-center">
                  <TabsList className="mx-auto gap-2">
                    <TabsTrigger value="expense" disabled={isTypeDisabled} className="data-[state=active]:bg-error data-[state=active]:text-error-foreground">{tModals('transaction.type.expense')}</TabsTrigger>
                    <TabsTrigger value="income" disabled={isTypeDisabled} className="data-[state=active]:bg-success data-[state=active]:text-success-foreground">{tModals('transaction.type.income')}</TabsTrigger>
                  </TabsList>
                </Tabs>

                <TextInput
                  type="number"
                  placeholder={tTransactions('table.headers.amount')}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  autoFocus
                  ref={amountRef}
                  className={`text-3xl font-medium ${type === 'expense' ? 'text-error' : 'text-success'}`}
                />

                <TextInput
                  type="text"
                  placeholder={tModals('transaction.placeholder.title')}
                  value={transactionTitle}
                  onChange={(e) => setTransactionTitle(e.target.value)}
                  onInput={handleTitleSanitize}
                />

                {transactionTitle && (
                  <Command className="border rounded-md">
                    <CommandInput
                      placeholder={tModals('transaction.placeholder.title')}
                      value={transactionTitle}
                      onValueChange={(v) => setTransactionTitle(v)}
                    />
                    <CommandList>
                      <CommandEmpty>{tModals('transaction.noResults')}</CommandEmpty>
                      <CommandGroup>
                        {templates
                          .filter((t) => normalizeTitle(t.title).includes(normalizeTitle(transactionTitle)))
                          .slice(0, 6)
                          .map((t) => (
                            <CommandItem
                              key={`tpl-${t.id}`}
                              onSelect={() => {
                                setTransactionTitle(t.title)
                                setAmount(String(t.amount))
                                applyBudgetId(t.budget_folder_id ?? 'unbudgeted')
                                setType(t.type)
                              }}
                            >
                              <span className="font-medium">⭐ {t.title}</span>
                              <span className="ml-auto text-muted-foreground">{String(t.amount)}</span>
                            </CommandItem>
                          ))}
                        {recentTitles
                          .filter((tt) => normalizeTitle(tt).includes(normalizeTitle(transactionTitle)))
                          .slice(0, 6)
                          .map((tt, idx) => (
                            <CommandItem key={`hist-${idx}`} onSelect={() => setTransactionTitle(tt)}>
                              <span className="font-medium">{tt}</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}

                <HybridDatePicker
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  label={tModals('transaction.date.label')}
                  placeholder={tModals('transaction.date.placeholder')}
                />

                {/* Budget Category Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-secondary-black dark:text-white">
                    {tModals('transaction.select.label')}
                  </label>
                  <Select
                    value={selectedBudgetId}
                    onChange={handleBudgetChange}
                    className="bg-background text-foreground h-[60px] px-[20px]"
                  >
                    <option value="unbudgeted">{tModals('transaction.select.unbudgeted')}</option>
                    {filteredBudgets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.emoji ? `${b.emoji} ${b.name}` : b.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {showSearch && (
                  <input
                    type="text"
                    placeholder={tModals('transaction.search.placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-[50px] px-[20px] w-full rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                )}

                {isBudgetsLoading && (
                  <p className="text-sm text-gray-500">{tModals('transaction.loadingBudgets')}</p>
                )}

                {searchQuery && filteredBudgets.length === 0 && !isBudgetsLoading && (
                  <p className="text-sm text-gray-500">{tModals('transaction.noResults')}</p>
                )}

                {isTypeDisabled && (
                  <p className="text-xs text-gray-500 -mt-2">
                    {tModals('transaction.autoTypeInfo')}
                  </p>
                )}

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.currentTarget.checked)}
                    className="h-4 w-4 rounded border border-border bg-transparent dark:bg-transparent accent-primary"
                  />
                  <span>{tModals('transaction.saveAsTemplate')}</span>
                </label>
                {saveAsTemplate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    You can view and manage templates in {tSettings('header.title')} → {tSettings('templates.title')}
                  </p>
                )}

                <div className="sticky bottom-0 mt-4">
                  <Button
                    type="submit"
                    text={tCommon('submit')}
                    variant="default"
                    disabled={isLoading}
                    isLoading={isLoading}
                    className={`w-full ${type === 'expense' ? 'bg-error text-error-foreground' : 'bg-success text-success-foreground'}`}
                  />
                </div>
              </form>
            </div>

            <SheetFooter className="mt-4 px-4">
              <SheetClose className="h-[60px] md:h-10 px-4 w-full rounded-md border border-input bg-background text-sm text-center">
                {tCommon('close')}
              </SheetClose>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Десктопная версия: диалог
  return (
    <Dialog open={internalOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose()
      }
    }}>
      <DialogContent className="transaction-modal">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
            <X size={22} />
          </DialogClose>
        </DialogHeader>

        <div className="mt-[30px]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Tabs value={type} onValueChange={(v) => setType(v as 'expense' | 'income')} className="mb-3 flex justify-center">
              <TabsList className="mx-auto gap-2">
                <TabsTrigger value="expense" disabled={isTypeDisabled} className="data-[state=active]:bg-error data-[state=active]:text-error-foreground">{tModals('transaction.type.expense')}</TabsTrigger>
                <TabsTrigger value="income" disabled={isTypeDisabled} className="data-[state=active]:bg-success data-[state=active]:text-success-foreground">{tModals('transaction.type.income')}</TabsTrigger>
              </TabsList>
            </Tabs>

            <TextInput
              type="number"
              placeholder={tTransactions('table.headers.amount')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              autoFocus
              ref={amountRef}
              className={`text-3xl font-medium ${type === 'expense' ? 'text-error' : 'text-success'}`}
            />

            <TextInput
              type="text"
              placeholder={tModals('transaction.placeholder.title')}
              value={transactionTitle}
              onChange={(e) => setTransactionTitle(e.target.value)}
              onInput={handleTitleSanitize}
            />

            {transactionTitle && (
              <Command className="border rounded-md">
                <CommandInput
                  placeholder={tModals('transaction.placeholder.title')}
                  value={transactionTitle}
                  onValueChange={(v) => setTransactionTitle(v)}
                />
                <CommandList>
                  <CommandEmpty>{tModals('transaction.noResults')}</CommandEmpty>
                  <CommandGroup>
                    {templates
                      .filter((t) => normalizeTitle(t.title).includes(normalizeTitle(transactionTitle)))
                      .slice(0, 6)
                      .map((t) => (
                        <CommandItem
                          key={`tpl-${t.id}`}
                          onSelect={() => {
                            setTransactionTitle(t.title)
                            setAmount(String(t.amount))
                            applyBudgetId(t.budget_folder_id ?? 'unbudgeted')
                            setType(t.type)
                          }}
                        >
                          <span className="font-medium">⭐ {t.title}</span>
                          <span className="ml-auto text-muted-foreground">{String(t.amount)}</span>
                        </CommandItem>
                      ))}
                    {recentTitles
                      .filter((tt) => normalizeTitle(tt).includes(normalizeTitle(transactionTitle)))
                      .slice(0, 6)
                      .map((tt, idx) => (
                        <CommandItem key={`hist-${idx}`} onSelect={() => setTransactionTitle(tt)}>
                          <span className="font-medium">{tt}</span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}

            <HybridDatePicker
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              label={tModals('transaction.date.label')}
              placeholder={tModals('transaction.date.placeholder')}
            />

            {/* Budget Category Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-secondary-black dark:text-white">
                {tModals('transaction.select.label')}
              </label>
              <Select
                value={selectedBudgetId}
                onChange={handleBudgetChange}
                className="bg-background text-foreground"
              >
                <option value="unbudgeted">{tModals('transaction.select.unbudgeted')}</option>
                {filteredBudgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.emoji ? `${b.emoji} ${b.name}` : b.name}
                  </option>
                ))}
              </Select>
            </div>

            {showSearch && (
              <input
                type="text"
                placeholder={tModals('transaction.search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-[50px] px-[20px] w-full rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            )}

            {isBudgetsLoading && (
              <p className="text-sm text-gray-500">{tModals('transaction.loadingBudgets')}</p>
            )}

            {searchQuery && filteredBudgets.length === 0 && !isBudgetsLoading && (
              <p className="text-sm text-gray-500">{tModals('transaction.noResults')}</p>
            )}

            {isTypeDisabled && (
              <p className="text-xs text-gray-500 -mt-2">
                {tModals('transaction.autoTypeInfo')}
              </p>
            )}

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.currentTarget.checked)}
                className="h-4 w-4 rounded border border-border bg-transparent dark:bg-transparent accent-primary"
              />
              <span>{tModals('transaction.saveAsTemplate')}</span>
            </label>
            {saveAsTemplate && (
              <p className="text-xs text-muted-foreground mt-1">
                You can view and manage templates in {tSettings('header.title')} → {tSettings('templates.title')}
              </p>
            )}

            <div className="mt-2">
              <Button
                type="submit"
                text={tCommon('submit')}
                variant="default"
                disabled={isLoading}
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

export default TransactionModal