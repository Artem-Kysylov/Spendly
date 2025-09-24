'use client'

import React from 'react'
import { CardDescription } from '@/components/ui/card'

interface ChartDescriptionProps {
  children: React.ReactNode
  className?: string
}

export const ChartDescription: React.FC<ChartDescriptionProps> = ({
  children,
  className = ""
}) => {
  return (
    <CardDescription className={`text-sm text-muted-foreground mt-1 ${className}`}>
      {children}
    </CardDescription>
  )
}