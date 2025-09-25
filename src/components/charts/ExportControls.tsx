'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Download, 
  FileImage, 
  FileText, 
  Files, 
  Settings, 
  Loader2,
  AlertCircle,
  FileCode // New icon for SVG
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { 
  exportChartToPNG, 
  exportChartToPDF, 
  exportAllChartsToPDF,
  exportChartToSVG,        // New import
  exportAllChartsToSVG,    // New import
  checkBrowserSupport 
} from '@/lib/chartExportUtils'
import { ExportControlsProps, ExportFormat, ExportOptions, ChartRef } from '@/types/types'

export const ExportControls: React.FC<ExportControlsProps> = ({
  chartsRefs,
  onExport,
  onExportStart,
  onExportComplete,
  className = "",
  disabled = false,
  showSettingsButton = true
}) => {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Check browser support
  const browserSupport = checkBrowserSupport()

  // Get available charts
  const getAvailableCharts = () => {
    const available = []
    if (chartsRefs.pieChart?.current) available.push('Pie Chart')
    if (chartsRefs.barChart?.current) available.push('Bar Chart')
    if (chartsRefs.lineChart?.current) available.push('Line Chart')
    return available
  }

  const availableCharts = getAvailableCharts()
  const hasCharts = availableCharts.length > 0

  // Handle export
  const handleExport = async (format: ExportFormat, chartType?: 'pie' | 'bar' | 'line') => {
    if (!browserSupport.supported) {
      toast({
        title: "Export Error",
        description: `Your browser doesn't support export: ${browserSupport.missing.join(', ')}`,
        variant: "destructive"
      })
      return
    }

    if (!hasCharts) {
      toast({
        title: "Export Error",
        description: 'No charts available for export',
        variant: "destructive"
      })
      return
    }

    setIsExporting(true)
    setExportingFormat(format)
    onExportStart?.()

    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const defaultOptions: ExportOptions = {
        quality: 'high',
        watermark: {
          enabled: true,
          text: 'Spendly',
          position: 'bottom-right',
          opacity: 0.3
        },
        backgroundColor: '#ffffff',
        // SVG специфичные настройки
        svgOptimization: true,
        embedFonts: true
      }

      let filename: string
      let success = false

      switch (format) {
        case 'png':
          if (chartType) {
            const chartRef = getChartRef(chartType)
            if (chartRef?.current) {
              filename = `spendly-${chartType}-chart-${timestamp}`
              await exportChartToPNG(chartRef, filename, defaultOptions)
              success = true
            }
          }
          break

        case 'pdf':
          if (chartType) {
            const chartRef = getChartRef(chartType)
            if (chartRef?.current) {
              filename = `spendly-${chartType}-chart-${timestamp}`
              await exportChartToPDF(chartRef, filename, {
                ...defaultOptions,
                orientation: 'landscape',
                pageSize: 'a4'
              })
              success = true
            }
          }
          break

        case 'svg':
          if (chartType) {
            const chartRef = getChartRef(chartType)
            if (chartRef?.current) {
              filename = `spendly-${chartType}-chart-${timestamp}`
              await exportChartToSVG(chartRef, filename, defaultOptions)
              success = true
            }
          }
          break

        case 'all-pdf':
          filename = `spendly-all-charts-${timestamp}`
          await exportAllChartsToPDF(chartsRefs, filename, {
            ...defaultOptions,
            orientation: 'portrait',
            pageSize: 'a4'
          })
          success = true
          break

        case 'all-svg':
          filename = `spendly-all-charts-${timestamp}`
          await exportAllChartsToSVG(chartsRefs, filename, defaultOptions)
          success = true
          break
      }

      if (success) {
        const formatName = format === 'svg' ? 'SVG' : 
                          format === 'all-svg' ? 'SVG (all charts)' :
                          format === 'png' ? 'PNG' : 
                          format === 'pdf' ? 'PDF' : 'PDF (all charts)'
        
        toast({
          title: "Export Complete",
          description: `Export to ${formatName} completed successfully!`
        })
        onExport?.(format, filename!, defaultOptions)
      }

    } catch (error) {
      console.error('Export error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: "Export Error",
        description: `Export error: ${errorMessage}`,
        variant: "destructive"
      })
      onExportComplete?.(false, errorMessage)
    } finally {
      setIsExporting(false)
      setExportingFormat(null)
      onExportComplete?.(true)
    }
  }

  // Helper function to get chart reference
  const getChartRef = (chartType: 'pie' | 'bar' | 'line'): ChartRef | undefined => {
    switch (chartType) {
      case 'pie':
        return chartsRefs.pieChart
      case 'bar':
        return chartsRefs.barChart
      case 'line':
        return chartsRefs.lineChart
      default:
        return undefined
    }
  }

  // Render export button for specific chart
  const renderChartExportButton = (chartType: 'pie' | 'bar' | 'line', label: string, icon: React.ReactNode) => {
    const chartRef = getChartRef(chartType)
    if (!chartRef?.current) return null

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isExporting}
            className="flex items-center gap-2"
          >
            {icon}
            {label}
            {isExporting && exportingFormat && (
              <Loader2 className="h-3 w-3 animate-spin ml-1" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => handleExport('png', chartType)}
            disabled={isExporting}
          >
            <FileImage className="h-4 w-4 mr-2" />
            Export to PNG
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleExport('pdf', chartType)}
            disabled={isExporting}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export to PDF
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleExport('svg', chartType)}
            disabled={isExporting}
          >
            <FileCode className="h-4 w-4 mr-2" />
            Export to SVG
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (!browserSupport.supported) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Export not available in your browser
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Charts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Экспорт отдельных графиков */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Экспорт отдельных графиков
          </h4>
          <div className="flex flex-wrap gap-2">
            {renderChartExportButton('pie', 'Круговая', <FileImage className="h-4 w-4" />)}
            {renderChartExportButton('bar', 'Столбчатая', <FileImage className="h-4 w-4" />)}
            {renderChartExportButton('line', 'Линейная', <FileImage className="h-4 w-4" />)}
          </div>
        </div>

        {/* Экспорт всех графиков */}
        {hasCharts && (
          <>
            <DropdownMenuSeparator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Экспорт всех графиков
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('all-pdf')}
                disabled={disabled || isExporting}
                className="flex items-center gap-2"
              >
                <Files className="h-4 w-4" />
                All Charts to PDF
                {isExporting && exportingFormat === 'all-pdf' && (
                  <Loader2 className="h-3 w-3 animate-spin ml-1" />
                )}
              </Button>
            </div>
          </>
        )}

        {/* Кнопка настроек */}
        {showSettingsButton && (
          <>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              disabled={disabled}
              className="flex items-center gap-2 w-full justify-start"
            >
              <Settings className="h-4 w-4" />
              Export Settings
            </Button>
          </>
        )}

        {/* Информация о доступных графиках */}
        {availableCharts.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Available charts: {availableCharts.join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}