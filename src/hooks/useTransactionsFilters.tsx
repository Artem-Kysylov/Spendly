'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChartFilters, ChartPeriod, ChartDataType } from '@/types/types'

export interface UseTransactionsFiltersReturn {
  filters: ChartFilters
  updateFilter: <K extends keyof ChartFilters>(key: K, value: ChartFilters[K]) => void
  updateFilters: (newFilters: Partial<ChartFilters>) => void
  resetFilters: () => void
  isFiltered: boolean
}

// Значения фильтров по умолчанию
const DEFAULT_FILTERS: ChartFilters = {
  period: 'Week' as ChartPeriod,
  startDate: new Date(),
  endDate: new Date(),
  dataType: 'Expenses' as ChartDataType,
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear()
}

// Хук для управления фильтрами транзакций
export const useTransactionsFilters = (
  initialFilters?: Partial<ChartFilters>,
  onFiltersChange?: (filters: ChartFilters) => void
): UseTransactionsFiltersReturn => {
  
  const [filters, setFilters] = useState<ChartFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  })

  // Функция для обновления одного фильтра
  const updateFilter = useCallback(<K extends keyof ChartFilters>(
    key: K, 
    value: ChartFilters[K]
  ) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value }
      
      // Обновляем связанные поля при изменении периода
      if (key === 'period') {
        const now = new Date()
        if (value === 'Week') {
          // Устанавливаем начало и конец текущей недели
          const dayOfWeek = now.getDay()
          const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
          
          const startDate = new Date(now)
          startDate.setDate(now.getDate() + mondayOffset)
          startDate.setHours(0, 0, 0, 0)
          
          const endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 6)
          endDate.setHours(23, 59, 59, 999)
          
          newFilters.startDate = startDate
          newFilters.endDate = endDate
        } else if (value === 'Month') {
          // Устанавливаем начало и конец текущего месяца
          const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
          
          newFilters.startDate = startDate
          newFilters.endDate = endDate
          newFilters.selectedMonth = now.getMonth()
          newFilters.selectedYear = now.getFullYear()
        }
      }
      
      return newFilters
    })
  }, [])

  // Функция для обновления нескольких фильтров
  const updateFilters = useCallback((newFilters: Partial<ChartFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Функция для сброса фильтров
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  // Проверка, применены ли фильтры (отличаются от значений по умолчанию)
  const isFiltered = filters.dataType !== DEFAULT_FILTERS.dataType || 
                    filters.period !== DEFAULT_FILTERS.period

  // Эффект для вызова колбэка при изменении фильтров
  useEffect(() => {
    onFiltersChange?.(filters)
  }, [filters, onFiltersChange])

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    isFiltered
  }
}

// Дополнительный хук для работы с URL параметрами фильтров
export const useTransactionsFiltersWithURL = (
  onFiltersChange?: (filters: ChartFilters) => void
) => {
  // Получаем фильтры из URL при инициализации
  const getFiltersFromURL = useCallback((): Partial<ChartFilters> => {
    if (typeof window === 'undefined') return {}
    
    const params = new URLSearchParams(window.location.search)
    const filters: Partial<ChartFilters> = {}
    
    const period = params.get('period')
    if (period === 'Week' || period === 'Month') {
      filters.period = period as ChartPeriod
    }
    
    const dataType = params.get('type')
    if (dataType === 'Expenses' || dataType === 'Income') {
      filters.dataType = dataType as ChartDataType
    }
    
    return filters
  }, [])

  const filtersHook = useTransactionsFilters(getFiltersFromURL(), onFiltersChange)

  // Функция для обновления URL при изменении фильтров
  const updateURL = useCallback((filters: ChartFilters) => {
    if (typeof window === 'undefined') return
    
    const params = new URLSearchParams()
    params.set('period', filters.period)
    params.set('type', filters.dataType)
    
    const newURL = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, '', newURL)
  }, [])

  // Переопределяем функции обновления для синхронизации с URL
  const updateFilter = useCallback(<K extends keyof ChartFilters>(
    key: K, 
    value: ChartFilters[K]
  ) => {
    filtersHook.updateFilter(key, value)
    // Обновляем URL после изменения фильтра
    setTimeout(() => updateURL(filtersHook.filters), 0)
  }, [filtersHook, updateURL])

  const updateFilters = useCallback((newFilters: Partial<ChartFilters>) => {
    filtersHook.updateFilters(newFilters)
    // Обновляем URL после изменения фильтров
    setTimeout(() => updateURL(filtersHook.filters), 0)
  }, [filtersHook, updateURL])

  return {
    ...filtersHook,
    updateFilter,
    updateFilters
  }
}