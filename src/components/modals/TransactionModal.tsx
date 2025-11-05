import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'

import Button from '../ui-elements/Button'
import TextInput from '../ui-elements/TextInput'
import RadioButton from '../ui-elements/RadioButton'
import CustomDatePicker from '../ui-elements/CustomDatePicker'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select } from '@/components/ui/select'

import { TransactionModalProps, BudgetFolderItemProps } from '../../types/types'
import { useTranslations } from 'next-intl'
import type { RecurringRule } from '@/types/ai'

function TransactionModal({ title, onClose, onSubmit }: TransactionModalProps) {
  const { session } = UserAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const tModals = useTranslations('modals')
  const tCommon = useTranslations('common')
  const tTxn = useTranslations('transaction')

  const [transactionTitle, setTransactionTitle] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('unbudgeted')
  const [budgetFolders, setBudgetFolders] = useState<BudgetFolderItemProps[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isBudgetsLoading, setIsBudgetsLoading] = useState<boolean>(false)
  const [isTypeDisabled, setIsTypeDisabled] = useState<boolean>(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Автоподстановка: состояние правил и совпадения
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([])
  const [matchedRule, setMatchedRule] = useState<RecurringRule | null>(null)
  const [autoApplyKey, setAutoApplyKey] = useState<string | null>(null)
  const [prevManual, setPrevManual] = useState<{ amount: string; budgetId: string; type: 'expense' | 'income' } | null>(null)

  // Резервные строки для бейджа автозаполнения (если ключи лежат в другом неймспейсе)
  const badgeByRuleText = (() => {
    const s = tModals('transaction.ruleBadge.byRule')
    return s === 'modals.transaction.ruleBadge.byRule' ? tTxn('ruleBadge.byRule') : s
  })()
  const badgeUndoText = (() => {
    const s = tModals('transaction.ruleBadge.undo')
    return s === 'modals.transaction.ruleBadge.undo' ? tTxn('ruleBadge.undo') : s
  })()

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
      if (data) setBudgetFolders(data as BudgetFolderItemProps[])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsBudgetsLoading(false)
    }
  }

  useEffect(() => {
    if (dialogRef.current) dialogRef.current.showModal()
    fetchBudgetFolders()
    return () => {
      if (dialogRef.current) dialogRef.current.close()
    }
  }, [session?.user?.id])

  // Загрузка активных правил пользователя
  useEffect(() => {
    if (!session?.user?.id) return
    ;(async () => {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('id, user_id, title_pattern, budget_folder_id, avg_amount, cadence, next_due_date, active, created_at, updated_at')
        .eq('user_id', session.user.id)
        .eq('active', true)
        .order('avg_amount', { ascending: false })
      if (!error && data) setRecurringRules(data as RecurringRule[])
    })()
  }, [session?.user?.id])

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

  // Поиск совпадения по правилу и автозаполнение
  useEffect(() => {
    const norm = normalizeTitle(transactionTitle)
    if (!norm) {
      setMatchedRule(null)
      setAutoApplyKey(null)
      return
    }
    const rule = recurringRules.find((r) => normalizeTitle(r.title_pattern) === norm) || null
    if (rule && autoApplyKey !== rule.title_pattern) {
      setPrevManual({ amount, budgetId: selectedBudgetId, type })
      setAmount(String(rule.avg_amount))
      applyBudgetId(rule.budget_folder_id ?? 'unbudgeted')
      setMatchedRule(rule)
      setAutoApplyKey(rule.title_pattern)
    } else if (!rule) {
      setMatchedRule(null)
      setAutoApplyKey(null)
    }
  }, [transactionTitle, recurringRules])

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
          budget_folder_id: selectedBudgetId === 'unbudgeted' ? null : selectedBudgetId,
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
        setSelectedBudgetId('unbudgeted')
        setSelectedDate(new Date())
        setIsTypeDisabled(false)
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

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-z\s]/g, '')
  }

  const handleBudgetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const budgetId = e.target.value
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

  const handleUndoRule = () => {
    if (!prevManual) {
      setMatchedRule(null)
      setAutoApplyKey(null)
      return
    }
    setAmount(prevManual.amount)
    applyBudgetId(prevManual.budgetId)
    setType(prevManual.type)
    setMatchedRule(null)
    setAutoApplyKey(null)
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
              placeholder={tModals('transaction.placeholder.title')}
              value={transactionTitle}
              onChange={(e) => setTransactionTitle(e.target.value)}
              onInput={handleInput}
            />
            {matchedRule && (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-muted text-muted-foreground">
                  {badgeByRuleText}
                </span>
                <button type="button" onClick={handleUndoRule} className="text-primary underline">
                  {badgeUndoText}
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground italic">
              {tModals('transaction.hintRecurring')}
            </p>
            <TextInput
              type="number"
              placeholder={tModals('transaction.placeholder.amountUSD')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <CustomDatePicker
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

            <div className="flex gap-4">
              <RadioButton
                title={tModals('transaction.type.expense')}
                value="expense"
                currentValue={type}
                variant="expense"
                onChange={(e) => setType(e.target.value as 'expense' | 'income')}
                disabled={isTypeDisabled}
              />
              <RadioButton
                title={tModals('transaction.type.income')}
                value="income"
                currentValue={type}
                variant="income"
                onChange={(e) => setType(e.target.value as 'expense' | 'income')}
                disabled={isTypeDisabled}
              />
            </div>

            {isTypeDisabled && (
              <p className="text-xs text-gray-500 -mt-2">
                {tModals('transaction.autoTypeInfo')}
              </p>
            )}

            <DialogFooter className="justify-center sm:justify-center gap-4">
              <Button
                text={tCommon('cancel')}
                variant="ghost"
                className="text-primary"
                onClick={onClose}
              />
              <Button
                type="submit"
                text={tCommon('submit')}
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