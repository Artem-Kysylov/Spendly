// src/components/user-settings/TransactionTemplatesSettings.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

export default function TransactionTemplatesSettings() {
  const { session } = UserAuth()
  const [templates, setTemplates] = useState<Array<{ id: string; title: string; amount: number; type: 'expense' | 'income'; budget_folder_id: string | null }>>([])
  const [loading, setLoading] = useState(false)
  const tSettings = useTranslations('userSettings')

  useEffect(() => {
    if (!session?.user?.id) return
    ;(async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('transaction_templates')
          .select('id, title, amount, type, budget_folder_id')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
        setTemplates((data || []).map((t: any) => ({ id: t.id, title: t.title, amount: Number(t.amount||0), type: t.type, budget_folder_id: t.budget_folder_id ?? null })))
      } catch { /* ignore */ }
      setLoading(false)
    })()
  }, [session?.user?.id])

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('transaction_templates').delete().eq('id', id)
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-secondary-black mb-2 dark:text-white">{tSettings('templates.title')}</h2>
        <p className="text-gray-600 dark:text-white text-sm">{tSettings('templates.description')}</p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">{tSettings('templates.loading')}</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tSettings('templates.empty')}</p>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div className="flex items-center gap-3">
                <span>⭐</span>
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.type === 'expense' ? 'Расход' : 'Доход'} · ${t.amount}</div>
                </div>
              </div>
              <Button variant="outline" onClick={() => handleDelete(t.id)}>{tSettings('templates.delete')}</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}