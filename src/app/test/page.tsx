'use client'

import { useEffect, useState } from 'react'
import CountryCombobox from '@/components/ui-elements/locale/CountryCombobox'
import CurrencyCombobox from '@/components/ui-elements/locale/CurrencyCombobox'
import LanguageSelect from '@/components/ui-elements/locale/LanguageSelect'
import { detectInitialLocale } from '@/i18n/detect'
import { formatMoney } from '@/lib/format/money'

export default function TestLocalePage() {
  const [country, setCountry] = useState('US')
  const [currency, setCurrency] = useState('USD')
  const [locale, setLocale] = useState<'en' | 'uk' | 'ru' | 'hi' | 'id' | 'ja' | 'ko'>('en')
  const [autodetected, setAutodetected] = useState(false)
  const presets = ['2000', '5000', '10000', '20000']

  useEffect(() => {
    let active = true
    detectInitialLocale().then((s) => {
      if (!active) return
      setCountry(s.country)
      setCurrency(s.currency)
      setLocale(s.locale)
      setAutodetected(!!s.autodetected)
      document.documentElement.lang = s.locale
    })
    return () => { active = false }
  }, [])

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Locale Test</h1>
      <p className="text-sm text-muted-foreground">
        Автодетект: {autodetected ? 'да' : 'нет'} • Country: {country} • Currency: {currency} • Language: {locale}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CountryCombobox
          value={country}
          onChange={setCountry}
          autodetected={autodetected}
        />
        <CurrencyCombobox
          value={currency}
          countryCode={country}
          onChange={setCurrency}
        />
      </div>

      <div className="flex items-center gap-3">
        <LanguageSelect value={locale} onChange={(l) => {
          setLocale(l)
          document.documentElement.lang = l
          document.cookie = `spendly_locale=${encodeURIComponent(l)}; path=/; max-age=31536000; samesite=lax`
        }} />
        <span className="text-xs text-muted-foreground">Cookie set: spendly_locale={locale}</span>
      </div>

      <div>
        <h2 className="font-medium mb-2">Budget Presets (formatted)</h2>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <div key={p} className="px-3 py-2 rounded-md border">
              {formatMoney(Number(p), currency, locale)}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-medium mb-2">Custom amount</h2>
        <div className="flex items-center gap-2">
          <span className="px-3 py-2 rounded-md border text-sm">{currency}</span>
          <input
            type="text"
            placeholder={`Enter amount (${currency})`}
            className="flex-1 h-10 px-3 rounded-md border"
          />
        </div>
      </div>
    </div>
  )
}