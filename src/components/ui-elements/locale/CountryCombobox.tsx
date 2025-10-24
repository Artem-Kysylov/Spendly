'use client'

import { useEffect, useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import type { Country } from '@/types/locale'
import { matchSorter } from 'match-sorter'
import { useTranslations } from 'next-intl'

type Props = {
  value?: string
  onChange?: (code: string) => void
  onSearch?: (query: string) => void
  placeholder?: string
  autodetected?: boolean
  className?: string
}

export default function CountryCombobox({
  value,
  onChange,
  onSearch,
  placeholder = 'Search country...',
  autodetected,
  className
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Country[]>([])

  useEffect(() => {
    let active = true
    fetch('/data/countries-currencies-languages.json')
      .then((r) => r.json())
      .then((data: Country[]) => {
        if (!active) return
        setItems(data)
      })
      .catch(() => {
        setItems([])
      })
    return () => {
      active = false
    }
  }, [])

  const options = useMemo(() => {
    if (!query) return items
    const res = matchSorter(items, query, { keys: ['name', 'code'] })
    return res
  }, [items, query])

  const selected = useMemo(() => items.find((c) => c.code === value), [items, value])
  const tBudget = useTranslations('BudgetSetup')
  const tModals = useTranslations('modals')
  const placeholderText = placeholder ?? tBudget('searchCountry')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={className}>
          {selected ? `${selected.name} (${selected.code})` : tBudget('selectCountry')}
          {autodetected ? <span className="ml-2 text-muted-foreground text-xs">• {tBudget('autodetected')}</span> : null}
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
                  value={`${c.code}-${c.name}`}
                  onSelect={() => {
                    onChange?.(c.code)
                    setOpen(false)
                  }}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-muted-foreground">{c.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}