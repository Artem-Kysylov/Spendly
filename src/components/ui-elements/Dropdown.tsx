'use client'

import { MoreVertical } from 'lucide-react'
import { Button as ShadButton } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import React from 'react'

export type DropdownItemSpec = {
  label: React.ReactNode
  onClick: () => void
  destructive?: boolean
  icon?: React.ReactNode
  className?: string
}

type Props = {
  items: DropdownItemSpec[]
  ariaLabel?: string
  align?: 'start' | 'end' | 'center'
  sideOffset?: number
  icon?: React.ReactNode
  buttonVariant?: React.ComponentProps<typeof ShadButton>['variant']
  buttonSize?: React.ComponentProps<typeof ShadButton>['size']
  buttonClassName?: string
  contentClassName?: string
}

export default function Dropdown({
  items,
  ariaLabel = 'More actions',
  align = 'end',
  sideOffset = 6,
  icon,
  buttonVariant = 'ghost',
  buttonSize = 'icon',
  buttonClassName,
  contentClassName,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ShadButton
          variant={buttonVariant}
          size={buttonSize}
          aria-label={ariaLabel}
          className={buttonClassName}
        >
          {icon ?? <MoreVertical className="h-4 w-4" />}
        </ShadButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} sideOffset={sideOffset} className={contentClassName}>
        {items.map((item, idx) => (
          <DropdownMenuItem
            key={idx}
            onClick={item.onClick}
            className={cn(
              item.destructive
                ? 'text-error focus:bg-error/10 dark:focus:bg-error/20'
                : '',
              item.className
            )}
          >
            {item.icon && <span className="mr-2 inline-flex">{item.icon}</span>}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}