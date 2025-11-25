'use client'
import PresetButtons from '@/components/ui-elements/PresetButtons'

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
  return <PresetButtons onSelectPreset={onSelectPreset} />
}