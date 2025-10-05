// Эвристики сложности и выбор модели

import type { Model } from '@/types/ai'

export const isComplexRequest = (text: string): boolean => {
  const lower = text.toLowerCase()
  const hasKeywords = /(save|analyze|forecast)/.test(lower)
  const isLong = text.length > 100
  return hasKeywords || isLong
}

export const selectModel = (isPro?: boolean, isComplex?: boolean): Model => {
  if (isPro && isComplex) return 'gpt-4-turbo'
  return 'gemini-2.5-flash'
}