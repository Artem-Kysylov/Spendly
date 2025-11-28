'use client'

import { useTranslations } from 'next-intl'

interface PresetChipsRowProps {
  onSelect: (prompt: string) => void | Promise<void>
  className?: string
  scrollbarMode?: 'never' | 'hover' | 'always'
}

export const PresetChipsRow = ({ onSelect, className, scrollbarMode = 'never' }: PresetChipsRowProps) => {
  const tAI = useTranslations('assistant')
  const chips = [
    tAI('presets.showWeek'),
    tAI('presets.saveMoney'),
    tAI('presets.analyzePatterns'),
    tAI('presets.createBudgetPlan'),
    tAI('presets.showBiggest'),
    tAI('presets.compareMonths'),
  ]
  const modeClass =
    scrollbarMode === 'never' ? 'chips-scroll chips-scroll--never' :
    scrollbarMode === 'always' ? 'chips-scroll chips-scroll--always' :
    'chips-scroll chips-scroll--hover'
  return (
    <div className={className ?? ''}>
      <div className={`${modeClass} flex gap-2 overflow-x-auto pb-2 px-4 border-t border-border bg-background`}>
        {chips.map((label, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(label)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary hover:bg-primary/30 transition-colors"
            aria-label={label}
            title={label}
          >
            {label}
          </button>
        ))}
      </div>
      <style jsx>{`
        .chips-scroll { -ms-overflow-style: none; }
        .chips-scroll--never { scrollbar-width: none; }
        .chips-scroll--never::-webkit-scrollbar { width: 0; height: 0; display: none; }
        .chips-scroll--always { scrollbar-width: thin; }
        .chips-scroll--always::-webkit-scrollbar { height: 6px; }
        .chips-scroll--always::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.5); border-radius: 9999px; }
        .chips-scroll--hover { scrollbar-width: none; }
        .chips-scroll--hover::-webkit-scrollbar { width: 0; height: 0; }
        .chips-scroll--hover:hover { scrollbar-width: thin; }
        .chips-scroll--hover:hover::-webkit-scrollbar { height: 6px; }
        .chips-scroll--hover:hover::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.5); border-radius: 9999px; }
      `}</style>
    </div>
  )
}