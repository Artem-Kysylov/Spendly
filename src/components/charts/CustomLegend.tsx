'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/chartUtils'
import { cn } from '@/lib/utils'

// Basic interface for legend item
export interface LegendItem {
  value: string | number
  name: string
  color: string
  payload?: any
  emoji?: string
  icon?: React.ReactNode
}

// Interface for CustomLegend props
export interface CustomLegendProps {
  payload?: LegendItem[]
  layout?: 'horizontal' | 'vertical' | 'grid'
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  iconType?: 'circle' | 'square' | 'line' | 'rect'
  iconSize?: number
  fontSize?: number
  currency?: string
  showValues?: boolean
  showBadges?: boolean
  interactive?: boolean
  onItemClick?: (item: LegendItem, index: number) => void
  onItemHover?: (item: LegendItem | null, index: number | null) => void
  hiddenItems?: Set<number>
  className?: string
  itemClassName?: string
  spacing?: 'compact' | 'normal' | 'relaxed'
  maxItems?: number
  showToggleAll?: boolean
}

export const CustomLegend: React.FC<CustomLegendProps> = ({
  payload = [],
  layout = 'horizontal',
  align = 'center',
  verticalAlign = 'bottom',
  iconType = 'circle',
  iconSize = 12,
  fontSize = 14,
  currency = 'USD',
  showValues = true,
  showBadges = true,
  interactive = false,
  onItemClick,
  onItemHover,
  hiddenItems = new Set(),
  className = '',
  itemClassName = '',
  spacing = 'normal',
  maxItems,
  showToggleAll = false
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [allHidden, setAllHidden] = useState(false)

  // Handle item click
  const handleItemClick = (item: LegendItem, index: number) => {
    if (interactive && onItemClick) {
      onItemClick(item, index)
    }
  }

  // Handle hover
  const handleItemHover = (item: LegendItem | null, index: number | null) => {
    setHoveredIndex(index)
    if (onItemHover) {
      onItemHover(item, index)
    }
  }

  // Handle toggle all
  const handleToggleAll = () => {
    setAllHidden(!allHidden)
    if (onItemClick) {
      payload.forEach((item, index) => {
        onItemClick(item, index)
      })
    }
  }

  // Define styles for layout
  const getContainerClasses = () => {
    const baseClasses = 'flex'
    const spacingClasses = {
      compact: 'gap-1',
      normal: 'gap-2',
      relaxed: 'gap-4'
    }
    
    const alignClasses = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end'
    }

    switch (layout) {
      case 'vertical':
        return cn(
          baseClasses,
          'flex-col',
          spacingClasses[spacing],
          alignClasses[align]
        )
      case 'grid':
        return cn(
          'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
          spacingClasses[spacing],
          alignClasses[align]
        )
      default: // horizontal
        return cn(
          baseClasses,
          'flex-wrap',
          spacingClasses[spacing],
          alignClasses[align]
        )
    }
  }

  // Render icon
  const renderIcon = (item: LegendItem, size: number) => {
    const iconStyle = {
      backgroundColor: item.color,
      width: iconSize,
      height: iconSize
    }

    const iconClasses = cn(
      'flex-shrink-0',
      {
        'rounded-full': iconType === 'circle',
        'rounded-sm': iconType === 'square' || iconType === 'rect',
        'rounded-none': iconType === 'line'
      }
    )

    if (item.icon) {
      return (
        <div className="flex-shrink-0" style={{ width: iconSize, height: iconSize }}>
          {item.icon}
        </div>
      )
    }

    if (iconType === 'line') {
      return (
        <div 
          className={cn(iconClasses, 'h-0.5')} 
          style={{ ...iconStyle, height: 2 }}
        />
      )
    }

    return <div className={iconClasses} style={iconStyle} />
  }

  // Limit number of items
  const displayItems = maxItems ? payload.slice(0, maxItems) : payload
  const hasMoreItems = maxItems && payload.length > maxItems

  if (!payload || payload.length === 0) {
    return null
  }

  return (
    <div className={cn('mt-4', className)}>
      {showToggleAll && payload.length > 1 && (
        <div className="mb-2 flex justify-center">
          <button
            onClick={handleToggleAll}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {allHidden ? 'Show All' : 'Hide All'}
          </button>
        </div>
      )}
      
      <div className={getContainerClasses()}>
        {displayItems.map((item, index) => {
          const isHidden = hiddenItems.has(index)
          const isHovered = hoveredIndex === index
          
          return (
            <div
              key={`legend-item-${index}`}
              className={cn(
                'flex items-center transition-all duration-200',
                {
                  'cursor-pointer': interactive,
                  'opacity-50': isHidden,
                  'opacity-100': !isHidden,
                  'scale-105': isHovered && interactive,
                  'hover:bg-muted/50 rounded-md p-1': interactive
                },
                itemClassName
              )}
              onClick={() => handleItemClick(item, index)}
              onMouseEnter={() => handleItemHover(item, index)}
              onMouseLeave={() => handleItemHover(null, null)}
              style={{ fontSize }}
            >
              {/* Эмодзи или иконка */}
              {item.emoji && (
                <span className="mr-2 text-sm">{item.emoji}</span>
              )}
              
              {/* Цветовая иконка */}
              {renderIcon(item, iconSize)}
              
              {/* Название */}
              <span 
                className={cn(
                  'ml-2 text-muted-foreground transition-colors',
                  {
                    'line-through': isHidden,
                    'text-foreground': isHovered && interactive
                  }
                )}
              >
                {item.name}
              </span>
              
              {/* Значение в Badge */}
              {showValues && showBadges && typeof item.value === 'number' && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'ml-2 text-xs transition-all',
                    {
                      'opacity-50': isHidden
                    }
                  )}
                >
                  {formatCurrency(item.value, currency)}
                </Badge>
              )}
              
              {/* Значение как текст */}
              {showValues && !showBadges && (
                <span 
                  className={cn(
                    'ml-2 text-xs text-muted-foreground',
                    {
                      'opacity-50': isHidden
                    }
                  )}
                >
                  {typeof item.value === 'number' 
                    ? formatCurrency(item.value, currency)
                    : item.value
                  }
                </span>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Индикатор "еще элементы" */}
      {hasMoreItems && (
        <div className="mt-2 text-center">
          <span className="text-xs text-muted-foreground">
            and {payload.length - maxItems!} more items...
          </span>
        </div>
      )}
    </div>
  )
}

// Hook for managing legend state
export const useLegendState = (initialHidden: number[] = []) => {
  const [hiddenItems, setHiddenItems] = useState<Set<number>>(
    new Set(initialHidden)
  )

  const toggleItem = (index: number) => {
    const newHidden = new Set(hiddenItems)
    if (newHidden.has(index)) {
      newHidden.delete(index)
    } else {
      newHidden.add(index)
    }
    setHiddenItems(newHidden)
  }

  const hideAll = () => {
    const allIndices = Array.from({ length: 10 }, (_, i) => i) // Assume maximum 10 items
    setHiddenItems(new Set(allIndices))
  }

  const showAll = () => {
    setHiddenItems(new Set())
  }

  return {
    hiddenItems,
    toggleItem,
    hideAll,
    showAll,
    isHidden: (index: number) => hiddenItems.has(index)
  }
}