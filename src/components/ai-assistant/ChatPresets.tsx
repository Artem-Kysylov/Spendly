'use client'

import { ChatPreset } from '@/types/types'
import { useTranslations } from 'next-intl'

interface ChatPresetsProps {
  onSelectPreset: (prompt: string) => Promise<void>
}

const presets = (t: ReturnType<typeof useTranslations>): ChatPreset[] => [
  { id: '1', title: t('presets.showWeek'), prompt: t('presets.showWeek') },
  { id: '2', title: t('presets.saveMoney'), prompt: t('presets.saveMoney') },
  { id: '3', title: t('presets.analyzePatterns'), prompt: t('presets.analyzePatterns') },
  { id: '4', title: t('presets.createBudgetPlan'), prompt: t('presets.createBudgetPlan') },
  { id: '5', title: t('presets.showBiggest'), prompt: t('presets.showBiggest') },
  { id: '6', title: t('presets.compareMonths'), prompt: t('presets.compareMonths') },
]

export const ChatPresets = ({ onSelectPreset }: ChatPresetsProps) => {
  const tAI = useTranslations('assistant')
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-secondary-black dark:text-white mb-3 sticky top-0 bg-white dark:bg-black py-1">{tAI('presets.header')}</p>
      <div className="grid grid-cols-1 gap-2">
        {presets(tAI).map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset.prompt)}
            className="w-full text-left px-3 py-2.5 text-xs bg-primary/10 hover:bg-primary/40 text-primary rounded-full transition-all duration-200 border border-primary touch-manipulation"
          >
            {preset.title}
          </button>
        ))}
      </div>
    </div>
  )
}