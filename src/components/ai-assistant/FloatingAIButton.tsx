"use client"

import React from 'react'
import { Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface FloatingAIButtonProps {
  onClick?: () => void
  className?: string
  isOpen?: boolean
}

const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({ 
  onClick, 
  className,
  isOpen = false
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              // Базовые стили
              "fixed bottom-6 right-6 z-50",
              "w-14 h-14 rounded-full",
              "bg-primary text-primary-foreground",
              "shadow-lg shadow-primary/25",
              "flex items-center justify-center",
              
              // Ховер эффекты (как у обычной кнопки)
              "hover:bg-primary/90",
              "transition-all duration-200 ease-in-out",
              
              // Активное состояние с bounce эффектом
              "active:scale-110 active:transition-transform active:duration-150 active:ease-out",
              
              // Фокус состояние
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "ring-offset-background",
              
              // Дополнительные эффекты
              "hover:shadow-xl hover:shadow-primary/30",
              "transform-gpu", // Оптимизация для анимаций
              
              className
            )}
            aria-label={isOpen ? "Close AI Assistant" : "Ask Spendly Pal"}
          >
            <div className="relative w-6 h-6 flex items-center justify-center">
              <Sparkles 
                size={24} 
                className={cn(
                  "absolute transition-all duration-300 ease-in-out",
                  isOpen ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
                )}
              />
              <X 
                size={24} 
                className={cn(
                  "absolute transition-all duration-300 ease-in-out",
                  isOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75"
                )}
              />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium">
          {isOpen ? "Close AI Assistant" : "Ask Spendly Pal"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default FloatingAIButton