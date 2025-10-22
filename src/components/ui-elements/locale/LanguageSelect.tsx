'use client'

import type { Language } from '@/types/locale'
import { Select } from '@/components/ui/select'

type Props = {
  value?: Language
  onChange?: (lang: Language) => void
  placeholder?: string
  className?: string
}

const LANGUAGES: Array<{ code: Language; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'uk', label: 'Українська' },
  { code: 'ru', label: 'Русский (СНГ)' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' }
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
          {l.label}
        </option>
      ))}
    </Select>
  )
}