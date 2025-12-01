'use client'

import type { Language } from '@/types/locale'
import { Select } from '@/components/ui/select'

type Props = {
  value?: Language
  onChange?: (lang: Language) => void
  placeholder?: string
  className?: string
}

const LANGUAGES: Array<{ code: Language; label: string; emoji: string }> = [
  { code: 'en', label: 'English', emoji: '🇺🇸' },
  { code: 'uk', label: 'Українська', emoji: '🇺🇦' },
  { code: 'ru', label: 'Русский (СНГ)', emoji: '🇷🇺' },
  { code: 'hi', label: 'हिन्दी', emoji: '🇮🇳' },
  { code: 'id', label: 'Bahasa Indonesia', emoji: '🇮🇩' },
  { code: 'ja', label: '日本語', emoji: '🇯🇵' },
  { code: 'ko', label: '한국어', emoji: '🇰🇷' }
]

export default function LanguageSelect({ value, onChange, placeholder = 'Select language', className }: Props) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange?.(e.target.value as Language)}
      className={className}
    >
      {!value && <option value="" disabled>{placeholder}</option>}
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.emoji} {l.label}
        </option>
      ))}
    </Select>
  )
}