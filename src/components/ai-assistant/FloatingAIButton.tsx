"use client"

// Imports 
import React from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

// Import components 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Types 
interface FloatingAIButtonProps {
  onClick?: () => void
  className?: string
  isOpen?: boolean
}

export const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({
  onClick,
  className,
  isOpen = false
}) => {
  const tAI = useTranslations('assistant')
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "fixed right-6 z-[50] bottom-[88px] lg:bottom-6",
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
            aria-label={tAI('buttons.ask')}
          >
            {/* Статичная иконка sparkles, без переключения на X */}
            <div className="w-6 h-6 flex items-center justify-center">
              <Image  
                src="/sparkles.svg"
                alt="Sparkles"
                width={24}
                height={24} 
                className="opacity-100"
              />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium">
          {tAI('buttons.ask')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}