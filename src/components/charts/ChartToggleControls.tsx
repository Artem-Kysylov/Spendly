'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { PieChart, BarChart3, TrendingUp } from 'lucide-react'

interface ChartVisibility {
  pie: boolean
  bar: boolean
  line: boolean
}

interface ChartToggleControlsProps {
  visibility: ChartVisibility
  onVisibilityChange: (visibility: ChartVisibility) => void
  className?: string
}

export const ChartToggleControls: React.FC<ChartToggleControlsProps> = ({
  visibility,
  onVisibilityChange,
  className = ""
}) => {
  const handleToggle = (chartType: keyof ChartVisibility) => {
    onVisibilityChange({
      ...visibility,
      [chartType]: !visibility[chartType]
    })
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="text-base font-medium">Отображение графиков</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="pie-chart"
              checked={visibility.pie}
              onChange={() => handleToggle('pie')}
            />
            <Label htmlFor="pie-chart" className="flex items-center gap-2 cursor-pointer">
              <PieChart className="h-4 w-4" />
              Круговая диаграмма
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="bar-chart"
              checked={visibility.bar}
              onChange={() => handleToggle('bar')}
            />
            <Label htmlFor="bar-chart" className="flex items-center gap-2 cursor-pointer">
              <BarChart3 className="h-4 w-4" />
              Столбчатая диаграмма
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="line-chart"
              checked={visibility.line}
              onChange={() => handleToggle('line')}
            />
            <Label htmlFor="line-chart" className="flex items-center gap-2 cursor-pointer">
              <TrendingUp className="h-4 w-4" />
              Линейная диаграмма
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export type { ChartVisibility }