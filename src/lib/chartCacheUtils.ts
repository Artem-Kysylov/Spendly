import { QueryClient } from '@tanstack/react-query'
import { chartQueryKeys } from './chartQueries'
import { ChartFilters } from '@/types/types'

// Утилиты для управления кэшем графиков
export class ChartCacheManager {
  constructor(private queryClient: QueryClient) {}

  // Инвалидация всех данных графиков
  invalidateAllCharts() {
    return this.queryClient.invalidateQueries({
      queryKey: chartQueryKeys.all
    })
  }

  // Инвалидация данных для конкретных фильтров
  invalidateChartsForFilters(filters: ChartFilters) {
    return Promise.all([
      this.queryClient.invalidateQueries({
        queryKey: chartQueryKeys.transactions(filters)
      }),
      this.queryClient.invalidateQueries({
        queryKey: chartQueryKeys.categories(filters)
      }),
      this.queryClient.invalidateQueries({
        queryKey: chartQueryKeys.aggregated(filters, filters.period)
      })
    ])
  }

  // Предварительная загрузка данных
  async prefetchChartData(userId: string, filters: ChartFilters) {
    const { fetchTransactions, fetchPeriodStats } = await import('./chartQueries')
    
    return Promise.all([
      this.queryClient.prefetchQuery({
        queryKey: chartQueryKeys.transactions(filters),
        queryFn: () => fetchTransactions(userId, filters),
        staleTime: 3 * 60 * 1000,
      }),
      this.queryClient.prefetchQuery({
        queryKey: [...chartQueryKeys.all, 'stats', filters],
        queryFn: () => fetchPeriodStats(userId, filters),
        staleTime: 5 * 60 * 1000,
      })
    ])
  }

  // Очистка старых данных из кэша
  clearStaleData() {
    return this.queryClient.clear()
  }

  // Получение статуса кэша
  getCacheStatus() {
    const cache = this.queryClient.getQueryCache()
    const queries = cache.getAll()
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      cacheSize: this.estimateCacheSize(queries)
    }
  }

  private estimateCacheSize(queries: any[]): string {
    // Примерная оценка размера кэша
    const totalItems = queries.reduce((sum, query) => {
      const data = query.state.data
      if (Array.isArray(data)) {
        return sum + data.length
      }
      return sum + (data ? 1 : 0)
    }, 0)
    
    return `~${Math.round(totalItems * 0.1)}KB`
  }
}

// Хук для использования менеджера кэша
export const useChartCacheManager = () => {
  const queryClient = new QueryClient()
  return new ChartCacheManager(queryClient)
}