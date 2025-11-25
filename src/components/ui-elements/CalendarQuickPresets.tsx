'use client'

import { useMemo } from 'react'
import useDeviceType from '@/hooks/useDeviceType'
import { cn } from '@/lib/utils'

interface CalendarQuickPresetsProps {
  onSelect: (date: Date) => void
  title?: string
  className?: string
}

export default function CalendarQuickPresets({ onSelect, title = 'Quick presets', className }: CalendarQuickPresetsProps) {
  const { isMobile } = useDeviceType()
  const paddingY = isMobile ? 'py-[15px]' : 'py-2.5' // +5px на мобилке

  const presets = useMemo(() => {
    const now = new Date()
    const yesterday = new Date(now)
    const dayBefore = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    dayBefore.setDate(now.getDate() - 2)
    return [
      { id: 'p1', title: 'Today', date: now },
      { id: 'p2', title: 'Yesterday', date: yesterday },
      { id: 'p3', title: 'Day before yesterday', date: dayBefore },
    ]
  }, [])

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-medium text-secondary-black dark:text-white mb-3 sticky top-0 bg-transparent py-1">
        {title}
      </p>
      <div className="grid grid-cols-1 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.date)}
            className={cn(
              'w-full px-3 text-xs bg-primary/10 hover:bg-primary/40 text-primary rounded-full transition-all duration-200 border border-primary touch-manipulation',
              'text-center', // центрируем текст
              paddingY
            )}
            aria-label={preset.title}
          >
            {preset.title}
          </button>
        ))}
      </div>
    </div>
  )
}