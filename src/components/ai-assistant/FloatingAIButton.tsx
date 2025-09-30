"use client"

import React from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingAIButtonProps {
  onClick?: () => void
  className?: string
}

const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({ 
  onClick, 
  className 
}) => {
  return (
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
      aria-label="Открыть AI-ассистента"
      title="AI-ассистент"
    >
      <Sparkles 
        size={24} 
        className="transition-transform duration-200 group-hover:scale-110" 
      />
    </button>
  )
}

export default FloatingAIButton