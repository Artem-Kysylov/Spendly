// Типы для AI-оркестратора и связанных модулей

export type Model = 'gemini-2.5-flash' | 'gpt-4-turbo'

export type AIAction =
  | { type: 'add_transaction'; payload: { title: string; amount: number; budget_folder_id: string | null; budget_name: string } }

export type AIResponse =
  | { kind: 'action'; action: AIAction; confirmText: string }
  | { kind: 'message'; message: string; model: Model }

export interface AIRequest {
  userId: string
  isPro?: boolean
  enableLimits?: boolean
  message: string
  confirm?: boolean
  actionPayload?: AIAction['payload']
}

// Доменные типы
export type Intent =
  | 'show_week_expenses'
  | 'show_month_expenses'
  | 'save_advice'
  | 'analyze_spending'
  | 'create_budget_plan'
  | 'biggest_expenses'
  | 'compare_months'
  | 'unknown'

export type Period = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'unknown'

// Данные
export type BudgetFolder = {
  id: string
  name: string
  emoji?: string
  type: 'expense' | 'income'
  amount?: number
}

export type Transaction = {
  id?: string
  title: string
  amount: number
  type: 'expense' | 'income'
  budget_folder_id: string | null
  created_at: string
}

export interface UserContext {
  budgets: BudgetFolder[]
  lastTransactions: Transaction[]
  lastMonthTxs: Transaction[]
}

// Если есть контракт структурированного ответа — можно перенести сюда:
// export interface StructuredAIResponse { ... }