'use client'

import { useEffect, useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { matchSorter } from 'match-sorter'
import { useTranslations } from 'next-intl'

type CurrencyItem = {
  code: string
  name?: string
  symbol?: string
}

type Props = {
  value?: string
  onChange?: (code: string) => void
  onSearch?: (query: string) => void
  placeholder?: string
  countryCode?: string
  className?: string
}

export default function CurrencyCombobox({
  value,
  onChange,
  onSearch,
  placeholder = 'Search currency...',
  countryCode,
  className
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<CurrencyItem[]>([])

  useEffect(() => {
    let active = true
    fetch('/data/countries-currencies-languages.json')
      .then((r) => r.json())
      .then((data: Array<{ currency: string; symbol?: string; code: string }>) => {
        if (!active) return
        const unique: Record<string, CurrencyItem> = {}
        for (const row of data) {
          if (!unique[row.currency]) {
            unique[row.currency] = { code: row.currency, symbol: row.symbol }
          }
        }
        setItems(Object.values(unique))
      })
      .catch(() => setItems([]))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!countryCode) return
    // Preselect currency by country, if value not set yet
    fetch('/data/countries-currencies-languages.json')
      .then((r) => r.json())
      .then((data: Array<{ code: string; currency: string }>) => {
        const found = data.find((d) => d.code === countryCode)
        if (found && !value) onChange?.(found.currency)
      })
      .catch(() => void 0)
  }, [countryCode])

  const options = useMemo(() => {
    if (!query) return items
    return matchSorter(items, query, { keys: ['code', 'symbol'] })
  }, [items, query])

  const selected = useMemo(() => items.find((c) => c.code === value), [items, value])

  const tBudget = useTranslations('BudgetSetup')
  const tModals = useTranslations('modals')
  const placeholderText = placeholder ?? tBudget('searchCurrency')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={className}>
          {selected ? `${selected.code}${selected.symbol ? ` (${selected.symbol})` : ''}` : tBudget('selectCurrency')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]">
        <Command>
          <CommandInput
            placeholder={placeholderText}
            value={query}
            onValueChange={(v) => {
              setQuery(v)
              onSearch?.(v)
            }}
          />
          <CommandList>
            <CommandEmpty>{tModals('transaction.noResults')}</CommandEmpty>
            <CommandGroup>
              {options.map((c) => (
                <CommandItem
                  key={c.code}
                  value={c.code}
                  onSelect={() => {
                    onChange?.(c.code)
                    setOpen(false)
                  }}
                >
                  <span className="font-medium">{c.code}</span>
                  {c.symbol ? <span className="ml-2 text-muted-foreground">{c.symbol}</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}