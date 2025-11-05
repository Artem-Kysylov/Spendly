'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import type { RecurringRule } from '@/types/ai'
import TextInput from '@/components/ui-elements/TextInput'
import Button from '@/components/ui-elements/Button'
import CustomDatePicker from '@/components/ui-elements/CustomDatePicker'
import { Select } from '@/components/ui/select'
import type { BudgetFolderItemProps } from '@/types/types'
import { useTranslations } from 'next-intl'

type DraftRule = {
  title_pattern: string
  budget_folder_id: string | null
  avg_amount: string
  cadence: 'weekly' | 'monthly'
  next_due_date: Date
}

export default function RecurringRulesSettings() {
  const { session } = UserAuth()
  const userId = session?.user?.id || null

  const [rules, setRules] = useState<RecurringRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [budgets, setBudgets] = useState<BudgetFolderItemProps[]>([])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const tSettings = useTranslations('userSettings')

  const [draft, setDraft] = useState<DraftRule>({
    title_pattern: '',
    budget_folder_id: 'unbudgeted',
    avg_amount: '',
    cadence: 'monthly',
    next_due_date: new Date(),
  })

  const normalizedDraft = useMemo(() => ({
    title_pattern: draft.title_pattern.trim(),
    budget_folder_id: draft.budget_folder_id === 'unbudgeted' ? null : draft.budget_folder_id,
    avg_amount: Number(draft.avg_amount),
    cadence: draft.cadence,
    next_due_date: draft.next_due_date.toISOString().slice(0, 10),
  }), [draft])

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: e } = await supabase
          .from('recurring_rules')
          .select('id, user_id, title_pattern, budget_folder_id, avg_amount, cadence, next_due_date, active, created_at, updated_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        if (e) throw e
        setRules((data || []) as RecurringRule[])
      } catch (e: any) {
        setError(e?.message || tSettings('recurringRules.errors.loadFailed'))
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        const { data, error: e } = await supabase
          .from('budget_folders')
          .select('id, emoji, name, amount, type')
          .eq('user_id', userId)
          .order('name', { ascending: true })
        if (e) throw e
        setBudgets((data || []) as BudgetFolderItemProps[])
      } catch {
        // ignore
      }
    })()
  }, [userId])

  const handleCreate = async () => {
    if (!userId) return
    if (!normalizedDraft.title_pattern || !Number.isFinite(normalizedDraft.avg_amount)) {
      setError(tSettings('recurringRules.errors.fillTitleAndAmount'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        user_id: userId,
        title_pattern: normalizedDraft.title_pattern,
        budget_folder_id: normalizedDraft.budget_folder_id,
        avg_amount: normalizedDraft.avg_amount,
        cadence: normalizedDraft.cadence,
        next_due_date: normalizedDraft.next_due_date,
        active: true,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('recurring_rules')
        .upsert(payload, { onConflict: 'user_id,title_pattern' })
        .select()
      if (error) throw error
      // refresh list
      const created = (data || [])[0]
      setRules(prev => {
        const idx = prev.findIndex(r => r.title_pattern === payload.title_pattern)
        if (idx >= 0) {
          const next = prev.slice()
          next[idx] = created
          return next
        }
        return [created, ...prev]
      })
      // reset draft
      setDraft({
        title_pattern: '',
        budget_folder_id: 'unbudgeted',
        avg_amount: '',
        cadence: 'monthly',
        next_due_date: new Date(),
      })
    } catch (e: any) {
      setError(e?.message || tSettings('recurringRules.errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('recurring_rules')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
      if (error) throw error
      setRules(prev => prev.filter(r => r.id !== id))
    } catch (e: any) {
      setError(e?.message || tSettings('recurringRules.errors.deleteFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string, patch: Partial<RecurringRule>) => {
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('recurring_rules')
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
      if (error) throw error
      const updated = (data || [])[0] as RecurringRule
      setRules(prev => prev.map(r => (r.id === id ? updated : r)))
      setEditingId(null)
    } catch (e: any) {
      setError(e?.message || tSettings('recurringRules.errors.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-secondary-black dark:text-white">
            {tSettings('recurringRules.form.title.label')}
          </label>
          <TextInput
            type="text"
            placeholder={tSettings('recurringRules.form.title.placeholder')}
            value={draft.title_pattern}
            onChange={(e) => setDraft(d => ({ ...d, title_pattern: e.target.value }))}
            className="h-10 px-3"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-secondary-black dark:text-white">
            {tSettings('recurringRules.form.avgAmount.label')}
          </label>
          <TextInput
            type="number"
            placeholder={tSettings('recurringRules.form.avgAmount.placeholder')}
            value={draft.avg_amount}
            onChange={(e) => setDraft(d => ({ ...d, avg_amount: e.target.value }))}
            className="h-10 px-3"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-secondary-black dark:text-white">
            {tSettings('recurringRules.form.cadence.label')}
          </label>
          <Select
            value={draft.cadence}
            onChange={(e) => setDraft(d => ({ ...d, cadence: e.target.value as 'weekly' | 'monthly' }))}
            className="h-10"
          >
            <option value="weekly">{tSettings('recurringRules.form.cadence.options.weekly')}</option>
            <option value="monthly">{tSettings('recurringRules.form.cadence.options.monthly')}</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-secondary-black dark:text-white">
            {tSettings('recurringRules.form.nextDue.label')}
          </label>
          <CustomDatePicker
            selectedDate={draft.next_due_date}
            onDateSelect={(d) => setDraft(prev => ({ ...prev, next_due_date: d }))}
            placeholder={tSettings('recurringRules.form.nextDue.placeholder')}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-secondary-black dark:text-white">
            {tSettings('recurringRules.form.budget.label')}
          </label>
          <Select
            value={draft.budget_folder_id ?? 'unbudgeted'}
            onChange={(e) => setDraft(d => ({ ...d, budget_folder_id: e.target.value }))}
            className="h-10"
          >
            <option value="unbudgeted">{tSettings('recurringRules.form.budget.unbudgeted')}</option>
            {budgets.map(b => (
              <option key={b.id} value={b.id}>
                {b.emoji ? `${b.emoji} ${b.name}` : b.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="md:col-span-5 flex justify-end">
          <Button
            text={saving ? tSettings('recurringRules.form.btn.saving') : tSettings('recurringRules.form.btn.add')}
            variant="default"
            onClick={handleCreate}
            disabled={saving}
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">{tSettings('recurringRules.list.loading')}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && rules.length === 0 && (
          <p className="text-sm text-muted-foreground">{tSettings('recurringRules.list.empty')}</p>
        )}
        {rules.map(rule => (
          <div key={rule.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-md p-3">
            {editingId === rule.id ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 flex-1">
                <TextInput
                  type="text"
                  placeholder={tSettings('recurringRules.form.title.placeholder')}
                  value={rule.title_pattern}
                  onChange={(e) => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, title_pattern: e.target.value } : r))}
                  className="h-10 px-3"
                />
                <Select
                  value={rule.cadence}
                  onChange={(e) => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, cadence: e.target.value as 'weekly' | 'monthly' } : r))}
                  className="h-10"
                >
                  <option value="weekly">{tSettings('recurringRules.form.cadence.options.weekly')}</option>
                  <option value="monthly">{tSettings('recurringRules.form.cadence.options.monthly')}</option>
                </Select>
                <TextInput
                  type="number"
                  placeholder={tSettings('recurringRules.form.avgAmount.label')}
                  value={String(rule.avg_amount)}
                  onChange={(e) => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, avg_amount: Number(e.target.value) } : r))}
                  className="h-10 px-3"
                />
                <Select
                  value={rule.budget_folder_id ?? 'unbudgeted'}
                  onChange={(e) => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, budget_folder_id: (e.target.value === 'unbudgeted' ? null : e.target.value) } : r))}
                  className="h-10"
                >
                  <option value="unbudgeted">{tSettings('recurringRules.form.budget.unbudgeted')}</option>
                  {budgets.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.emoji ? `${b.emoji} ${b.name}` : b.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="flex-1">
                <div className="font-medium">{rule.title_pattern}</div>
                <div className="text-sm text-muted-foreground">
                  {rule.cadence} • ~{rule.avg_amount.toFixed(2)} • {tSettings('recurringRules.list.next')} {rule.next_due_date} • {rule.budget_folder_id ? tSettings('recurringRules.list.inBudget') : tSettings('recurringRules.list.unbudgeted')}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              {editingId === rule.id ? (
                <>
                  <Button
                    text={tSettings('recurringRules.list.save')}
                    variant="default"
                    onClick={() => handleUpdate(rule.id, {
                      title_pattern: rule.title_pattern,
                      cadence: rule.cadence,
                      avg_amount: rule.avg_amount,
                      budget_folder_id: rule.budget_folder_id,
                    })}
                    isLoading={saving}
                    disabled={saving}
                  />
                  <Button
                    text={tSettings('recurringRules.list.cancel')}
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    disabled={saving}
                  />
                </>
              ) : (
                <>
                  <Button
                    text={tSettings('recurringRules.list.edit')}
                    variant="ghost"
                    onClick={() => setEditingId(rule.id)}
                  />
                  <Button
                    text={tSettings('recurringRules.list.delete')}
                    variant="destructive"
                    onClick={() => handleDelete(rule.id)}
                    isLoading={saving}
                    disabled={saving}
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}