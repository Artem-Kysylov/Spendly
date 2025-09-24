import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// Типы для настроек экспорта
// В этом файле: интерфейс ExportOptions
export interface ExportOptions {
  // Размер изображения
  width?: number
  height?: number
  scale?: number
  
  // Качество
  quality?: 'low' | 'medium' | 'high'
  
  // Водяной знак
  watermark?: {
    enabled: boolean
    text?: string
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
    opacity?: number
    fontSize?: number
    color?: string
  }
  
  // Дополнительные настройки
  backgroundColor?: string
  includeLegend?: boolean
  format?: 'png' | 'jpeg'
  
  // PDF специфичные настройки
  orientation?: 'portrait' | 'landscape'
  pageSize?: 'a4' | 'a3' | 'letter'
  margin?: number

  // SVG-специфичные настройки (добавлено)
  svgOptimization?: boolean
  embedFonts?: boolean
  preserveAspectRatio?: string
  svgAttributes?: Record<string, string>
}

export interface ChartRef {
  current: HTMLElement | null
}

export interface ChartsRefs {
  pieChart?: ChartRef
  barChart?: ChartRef
  lineChart?: ChartRef
}

// Настройки качества по умолчанию
const QUALITY_SETTINGS = {
  low: { scale: 1, quality: 0.7 },
  medium: { scale: 2, quality: 0.85 },
  high: { scale: 3, quality: 0.95 }
}

// Размеры страниц для PDF
const PAGE_SIZES = {
  a4: { width: 210, height: 297 },
  a3: { width: 297, height: 420 },
  letter: { width: 216, height: 279 }
}

/**
 * Валидация параметров экспорта
 */
const validateExportParams = (
  chartRef: ChartRef, 
  filename: string
): { isValid: boolean; error?: string } => {
  if (!chartRef?.current) {
    return { isValid: false, error: 'Chart reference is not available' }
  }
  
  if (!filename || filename.trim().length === 0) {
    return { isValid: false, error: 'Filename is required' }
  }
  
  // Проверка на недопустимые символы в имени файла
  const invalidChars = /[<>:"/\\|?*]/g
  if (invalidChars.test(filename)) {
    return { isValid: false, error: 'Filename contains invalid characters' }
  }
  
  return { isValid: true }
}

/**
 * Добавление водяного знака на canvas
 */
const addWatermark = (
  canvas: HTMLCanvasElement, 
  options: ExportOptions['watermark']
): HTMLCanvasElement => {
  if (!options?.enabled) return canvas
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  
  const {
    text = 'Spendly',
    position = 'bottom-right',
    opacity = 0.3,
    fontSize = 16,
    color = '#666666'
  } = options
  
  // Настройка стиля текста
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.font = `${fontSize}px Arial, sans-serif`
  ctx.fillStyle = color
  
  // Измерение текста
  const textMetrics = ctx.measureText(text)
  const textWidth = textMetrics.width
  const textHeight = fontSize
  
  // Определение позиции
  let x: number, y: number
  const margin = 20
  
  switch (position) {
    case 'top-left':
      x = margin
      y = margin + textHeight
      break
    case 'top-right':
      x = canvas.width - textWidth - margin
      y = margin + textHeight
      break
    case 'bottom-left':
      x = margin
      y = canvas.height - margin
      break
    case 'bottom-right':
      x = canvas.width - textWidth - margin
      y = canvas.height - margin
      break
    case 'center':
      x = (canvas.width - textWidth) / 2
      y = (canvas.height + textHeight) / 2
      break
    default:
      x = canvas.width - textWidth - margin
      y = canvas.height - margin
  }
  
  // Отрисовка водяного знака
  ctx.fillText(text, x, y)
  ctx.restore()
  
  return canvas
}

/**
 * Конвертация элемента в canvas с настройками
 */
const elementToCanvas = async (
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<HTMLCanvasElement> => {
  const qualitySettings = QUALITY_SETTINGS[options.quality || 'medium']
  
  const html2canvasOptions = {
    scale: options.scale || qualitySettings.scale,
    backgroundColor: options.backgroundColor || '#ffffff',
    useCORS: true,
    allowTaint: true,
    width: options.width,
    height: options.height,
    logging: false,
    removeContainer: true
  }
  
  try {
    const canvas = await html2canvas(element, html2canvasOptions)
    return addWatermark(canvas, options.watermark)
  } catch (error) {
    throw new Error(`Failed to convert element to canvas: ${error}`)
  }
}

/**
 * Экспорт графика в PNG
 */
export const exportChartToPNG = async (
  chartRef: ChartRef,
  filename: string,
  options: ExportOptions = {}
): Promise<void> => {
  // Валидация параметров
  const validation = validateExportParams(chartRef, filename)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }
  
  try {
    const canvas = await elementToCanvas(chartRef.current!, options)
    const qualitySettings = QUALITY_SETTINGS[options.quality || 'medium']
    
    // Конвертация в blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob from canvas'))
          }
        },
        `image/${options.format || 'png'}`,
        qualitySettings.quality
      )
    })
    
    // Скачивание файла
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.${options.format || 'png'}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
  } catch (error) {
    throw new Error(`Failed to export chart to PNG: ${error}`)
  }
}

/**
 * Экспорт графика в PDF
 */
export const exportChartToPDF = async (
  chartRef: ChartRef,
  filename: string,
  options: ExportOptions = {}
): Promise<void> => {
  // Валидация параметров
  const validation = validateExportParams(chartRef, filename)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }
  
  try {
    const canvas = await elementToCanvas(chartRef.current!, options)
    
    // Настройки PDF
    const orientation = options.orientation || 'landscape'
    const pageSize = options.pageSize || 'a4'
    const margin = options.margin || 20
    
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize
    })
    
    // Получение размеров страницы
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    // Вычисление размеров изображения с учетом отступов
    const availableWidth = pageWidth - (margin * 2)
    const availableHeight = pageHeight - (margin * 2)
    
    // Масштабирование изображения для вписывания в страницу
    const canvasRatio = canvas.width / canvas.height
    const pageRatio = availableWidth / availableHeight
    
    let imgWidth: number, imgHeight: number
    
    if (canvasRatio > pageRatio) {
      // Изображение шире относительно страницы
      imgWidth = availableWidth
      imgHeight = availableWidth / canvasRatio
    } else {
      // Изображение выше относительно страницы
      imgHeight = availableHeight
      imgWidth = availableHeight * canvasRatio
    }
    
    // Центрирование изображения
    const x = (pageWidth - imgWidth) / 2
    const y = (pageHeight - imgHeight) / 2
    
    // Конвертация canvas в изображение
    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    
    // Добавление изображения в PDF
    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight)
    
    // Сохранение файла
    pdf.save(`${filename}.pdf`)
    
  } catch (error) {
    throw new Error(`Failed to export chart to PDF: ${error}`)
  }
}

/**
 * Экспорт всех графиков в один PDF
 */
export const exportAllChartsToPDF = async (
  chartsRefs: ChartsRefs,
  filename: string,
  options: ExportOptions = {}
): Promise<void> => {
  if (!filename || filename.trim().length === 0) {
    throw new Error('Filename is required')
  }
  
  // Фильтрация доступных графиков
  const availableCharts = Object.entries(chartsRefs).filter(
    ([_, ref]) => ref?.current
  )
  
  if (availableCharts.length === 0) {
    throw new Error('No charts available for export')
  }
  
  try {
    // Настройки PDF
    const orientation = options.orientation || 'portrait'
    const pageSize = options.pageSize || 'a4'
    const margin = options.margin || 20
    
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize
    })
    
    // Получение размеров страницы
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const availableWidth = pageWidth - (margin * 2)
    const availableHeight = pageHeight - (margin * 2)
    
    // Обработка каждого графика
    for (let i = 0; i < availableCharts.length; i++) {
      const [chartName, chartRef] = availableCharts[i]
      
      if (i > 0) {
        pdf.addPage()
      }
      
      // Конвертация графика в canvas
      const canvas = await elementToCanvas(chartRef.current!, options)
      
      // Масштабирование изображения
      const canvasRatio = canvas.width / canvas.height
      const pageRatio = availableWidth / availableHeight
      
      let imgWidth: number, imgHeight: number
      
      if (canvasRatio > pageRatio) {
        imgWidth = availableWidth
        imgHeight = availableWidth / canvasRatio
      } else {
        imgHeight = availableHeight
        imgWidth = availableHeight * canvasRatio
      }
      
      // Центрирование изображения
      const x = (pageWidth - imgWidth) / 2
      const y = (pageHeight - imgHeight) / 2
      
      // Конвертация canvas в изображение
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      
      // Добавление заголовка
      pdf.setFontSize(16)
      pdf.setTextColor(60, 60, 60)
      const title = chartName.charAt(0).toUpperCase() + chartName.slice(1) + ' Chart'
      const titleWidth = pdf.getTextWidth(title)
      pdf.text(title, (pageWidth - titleWidth) / 2, margin)
      
      // Добавление изображения
      pdf.addImage(imgData, 'JPEG', x, y + 10, imgWidth, imgHeight - 10)
    }
    
    // Сохранение файла
    pdf.save(`${filename}.pdf`)
    
  } catch (error) {
    throw new Error(`Failed to export all charts to PDF: ${error}`)
  }
}

/**
 * Получение информации о размере экспортируемого файла (приблизительно)
 */
export const getEstimatedFileSize = (
  width: number,
  height: number,
  options: ExportOptions = {}
): { png: string; pdf: string } => {
  const qualitySettings = QUALITY_SETTINGS[options.quality || 'medium']
  const scale = options.scale || qualitySettings.scale
  
  // Приблизительный расчет размера PNG (в байтах)
  const pixelCount = width * height * scale * scale
  const pngSize = pixelCount * 4 * qualitySettings.quality // 4 байта на пиксель (RGBA)
  
  // Приблизительный расчет размера PDF
  const pdfSize = pngSize * 0.7 // PDF обычно меньше из-за сжатия
  
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  
  return {
    png: formatSize(pngSize),
    pdf: formatSize(pdfSize)
  }
}

/**
 * Извлечение SVG элемента из графика
 */
const extractSVGFromChart = (chartRef: ChartRef): SVGElement | null => {
  if (!chartRef.current) return null
  
  const svgElement = chartRef.current.querySelector('svg')
  if (!svgElement) return null
  
  return svgElement.cloneNode(true) as SVGElement
}

/**
 * Встраивание стилей в SVG
 */
const embedStylesInSVG = (svgElement: SVGElement): void => {
  const styleElement = document.createElement('style')
  
  // Получаем все computed styles для элементов SVG
  const allElements = svgElement.querySelectorAll('*')
  const styles: string[] = []
  
  allElements.forEach((element, index) => {
    const computedStyle = window.getComputedStyle(element)
    const className = `svg-element-${index}`
    element.setAttribute('class', className)
    
    // Извлекаем важные стили
    const importantStyles = [
      'fill', 'stroke', 'stroke-width', 'font-family', 
      'font-size', 'font-weight', 'text-anchor', 'opacity'
    ]
    
    const styleRules: string[] = []
    importantStyles.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop)
      if (value && value !== 'none') {
        styleRules.push(`${prop}: ${value}`)
      }
    })
    
    if (styleRules.length > 0) {
      styles.push(`.${className} { ${styleRules.join('; ')} }`)
    }
  })
  
  styleElement.textContent = styles.join('\n')
  svgElement.insertBefore(styleElement, svgElement.firstChild)
}

/**
 * Добавление водяного знака в SVG
 */
const addSVGWatermark = (
  svgElement: SVGElement, 
  options: ExportOptions['watermark']
): void => {
  if (!options?.enabled || !options.text) return
  
  const svgRect = svgElement.getBoundingClientRect()
  const width = svgElement.getAttribute('width') || svgRect.width.toString()
  const height = svgElement.getAttribute('height') || svgRect.height.toString()
  
  const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  textElement.textContent = options.text
  textElement.setAttribute('fill', options.color || '#666666')
  textElement.setAttribute('opacity', (options.opacity || 0.3).toString())
  textElement.setAttribute('font-size', (options.fontSize || 12).toString())
  textElement.setAttribute('font-family', 'Arial, sans-serif')
  
  // Позиционирование водяного знака
  let x = '10', y = '20'
  switch (options.position) {
    case 'top-right':
      x = (parseFloat(width) - 100).toString()
      y = '20'
      textElement.setAttribute('text-anchor', 'end')
      break
    case 'bottom-left':
      x = '10'
      y = (parseFloat(height) - 10).toString()
      break
    case 'bottom-right':
      x = (parseFloat(width) - 10).toString()
      y = (parseFloat(height) - 10).toString()
      textElement.setAttribute('text-anchor', 'end')
      break
    case 'center':
      x = (parseFloat(width) / 2).toString()
      y = (parseFloat(height) / 2).toString()
      textElement.setAttribute('text-anchor', 'middle')
      break
  }
  
  textElement.setAttribute('x', x)
  textElement.setAttribute('y', y)
  
  svgElement.appendChild(textElement)
}

/**
 * Оптимизация SVG
 */
const optimizeSVG = (svgString: string): string => {
  return svgString
    // Удаляем лишние пробелы и переносы строк
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    // Удаляем ненужные атрибуты
    .replace(/\s(xmlns:xlink|xml:space)="[^"]*"/g, '')
    // Округляем числовые значения
    .replace(/(\d+\.\d{3,})/g, (match) => parseFloat(match).toFixed(2))
    .trim()
}

/**
 * Экспорт графика в SVG
 */
// Функция exportChartToSVG (расширена по шагам 4.x и 5.x)
export const exportChartToSVG = async (
  chartRef: ChartRef,
  filename: string,
  options: ExportOptions = {}
): Promise<void> => {
  const validation = validateExportParams(chartRef, filename)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  // Проверка базовой поддержки (XMLSerializer, Blob)
  if (typeof XMLSerializer === 'undefined') {
    throw new Error('Браузер не поддерживает XMLSerializer')
  }
  if (typeof Blob === 'undefined') {
    throw new Error('Браузер не поддерживает Blob для SVG')
  }

  const svgElement = extractSVGFromChart(chartRef)
  if (!svgElement) {
    throw new Error('SVG элемент не найден в графике')
  }

  // Сохранение размеров и viewBox
  ensureSVGDimensions(svgElement, options)

  // Обработка стилей и атрибутов
  if (options.embedFonts !== false) {
    embedStylesInSVG(svgElement)
  }

  // Водяной знак
  if (options.watermark?.enabled) {
    addSVGWatermark(svgElement, options.watermark)
  }

  // Дополнительные атрибуты
  if (options.svgAttributes) {
    Object.entries(options.svgAttributes).forEach(([key, value]) => {
      svgElement.setAttribute(key, value)
    })
  }

  // Сериализация
  const serializer = new XMLSerializer()
  let svgString = serializer.serializeToString(svgElement)

  // XML декларация
  svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString

  // Валидация сгенерированного SVG
  const { valid, error } = validateSVGContent(svgString)
  if (!valid) {
    throw new Error(error || 'Валидация SVG не пройдена')
  }

  // Оптимизация
  if (options.svgOptimization !== false) {
    svgString = optimizeSVG(svgString)
  }

  // Blob и скачивание
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Экспорт всех графиков в отдельные SVG файлы
 */
export const exportAllChartsToSVG = async (
  chartsRefs: ChartsRefs,
  baseFilename: string,
  options: ExportOptions = {}
): Promise<void> => {
  const charts = [
    { ref: chartsRefs.pieChart, name: 'pie-chart' },
    { ref: chartsRefs.barChart, name: 'bar-chart' },
    { ref: chartsRefs.lineChart, name: 'line-chart' }
  ]

  const availableCharts = charts.filter(chart => chart.ref?.current)
  
  if (availableCharts.length === 0) {
    throw new Error('Нет доступных графиков для экспорта')
  }

  // Экспортируем каждый график отдельно
  for (const chart of availableCharts) {
    const filename = `${baseFilename}-${chart.name}`
    await exportChartToSVG(chart.ref!, filename, options)
  }
}

// Обновленная проверка поддержки браузером (включая SVG)
export const checkBrowserSupport = (): { 
  supported: boolean; 
  missing: string[] 
} => {
  const missing: string[] = []

  if (!HTMLCanvasElement.prototype.toBlob) {
    missing.push('Canvas toBlob')
  }
  if (!document.createElement('a').download) {
    missing.push('Download attribute')
  }
  if (!URL.createObjectURL) {
    missing.push('URL.createObjectURL')
  }
  if (typeof XMLSerializer === 'undefined') {
    missing.push('XMLSerializer')
  }
  if (typeof Blob === 'undefined') {
    missing.push('Blob')
  }

  return {
    supported: missing.length === 0,
    missing
  }
}

// Хелперы для SVG (новые функции)
const ensureSVGDimensions = (svgElement: SVGElement, options: ExportOptions = {}): void => {
  // Сохранение размеров и viewBox
  const rect = svgElement.getBoundingClientRect()
  const widthAttr = svgElement.getAttribute('width')
  const heightAttr = svgElement.getAttribute('height')
  const viewBoxAttr = svgElement.getAttribute('viewBox')

  const width = widthAttr ? parseFloat(widthAttr) : rect.width
  const height = heightAttr ? parseFloat(heightAttr) : rect.height

  if (!widthAttr || !Number.isFinite(width)) {
    svgElement.setAttribute('width', Math.max(1, rect.width || 1).toString())
  }
  if (!heightAttr || !Number.isFinite(height)) {
    svgElement.setAttribute('height', Math.max(1, rect.height || 1).toString())
  }
  if (!viewBoxAttr) {
    const w = Number.isFinite(width) ? width : (rect.width || 1)
    const h = Number.isFinite(height) ? height : (rect.height || 1)
    svgElement.setAttribute('viewBox', `0 0 ${Math.max(1, w)} ${Math.max(1, h)}`)
  }

  // preserveAspectRatio из опций
  if (options.preserveAspectRatio) {
    svgElement.setAttribute('preserveAspectRatio', options.preserveAspectRatio)
  }
}

const validateSVGContent = (svgString: string): { valid: boolean; error?: string } => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgString, 'image/svg+xml')
    const root = doc.documentElement
    if (!root || root.nodeName.toLowerCase() !== 'svg') {
      return { valid: false, error: 'Некорректный SVG: корневой элемент не <svg>' }
    }
    const parserError = doc.querySelector('parsererror')
    if (parserError) {
      return { valid: false, error: 'Ошибка парсинга SVG' }
    }
    return { valid: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Неизвестная ошибка парсинга'
    return { valid: false, error: msg }
  }
}