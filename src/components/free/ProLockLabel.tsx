import React from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProLockLabel({
  className,
  text = 'PRO',
}: {
  className?: string
  text?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
        'bg-muted text-muted-foreground border border-border shadow-sm',
        className
      )}
    >
      <Lock className="w-3 h-3" />
      <span>{text}</span>
    </div>
  )
}