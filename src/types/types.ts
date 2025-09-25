import { Session } from '@supabase/supabase-js'
import { ReactNode } from 'react'

export interface ButtonProps {
    text: ReactNode,
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void,
    className?: string,
    type?: 'button' | 'submit' | 'reset',
    disabled?: boolean,
    isLoading?: boolean,
    icon?: ReactNode,
    title?: string,
    variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive',
}

export interface AuthContextType {
    session: Session | null
    signInWithGoogle: () => Promise<{ error: any }>
    signOut: () => Promise<void>
    // New methods for email streams
    signInWithPassword: (email: string, password: string) => Promise<{ data?: any; error?: any }>
    signUpWithPassword: (email: string, password: string) => Promise<{ data?: any; error?: any }>
    // States
    isReady: boolean
    isSigningIn: boolean
    isSigningUp: boolean
    error: string | null
}

export interface ProtectedRouteProps {
    children: React.ReactNode
}

export interface ToastMessageProps {
    text: string,
    type: 'success' | 'error',
}

export interface Transaction {
    id: string,
    title: string,
    amount: number,
    type: 'expense' | 'income',
    created_at: string,
    budget_folder_id?: string | null,
    category_name?: string,
    category_emoji?: string
}

export interface TransactionsTableProps {
    transactions: Transaction[]
    onDeleteTransaction: (id: string) => Promise<void>
    deleteModalConfig?: {
        title: string
        text: string
    }
    onEditTransaction?: (payload: EditTransactionPayload) => Promise<void>
    allowTypeChange?: boolean
}

export interface SignOutModalProps {
    title: string,
    text: string,
    onClose: () => void,
    signOut: () => void
}

export interface DeleteModalProps {
    title: string,
    text: string,
    onClose: () => void,
    onConfirm: () => void,
    isLoading?: boolean
}

export interface TransactionModalProps {
    title: string,
    onClose: () => void,
    onSubmit: (message: string, type: ToastMessageProps['type']) => void,
}

export interface NewBudgetModalProps  {
    title: string,
    onClose: () => void,
    onSubmit: (message: string, type: ToastMessageProps['type']) => void,
}

export interface MainBudgetModalProps {
    title: string,
    onClose: () => void,
    onSubmit: (message: string, type: ToastMessageProps['type']) => void,
}

export interface TextInputProps {
    type: 'text' | 'number',
    placeholder: string,
    value: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onInput?: (e: React.ChangeEvent<HTMLInputElement>) => void,
    disabled?: boolean,
    min?: string,
    step?: string,
}

export interface RadioButtonProps {
    title: string,
    value: 'expense' | 'income',
    currentValue: 'expense' | 'income',
    variant: 'expense' | 'income',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    disabled?: boolean,
}

export interface BudgetPresetProps {
    title: string,
    value: string,
    currentValue: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
}

export interface CreateMainBudgetProps {
    onSubmit: (budget: string) => void;
}

export interface BudgetFolderItemProps {
    id: string,
    emoji: string,
    name: string,
    amount: number,
    spentAmount?: number,
    type: 'expense' | 'income',
}

export interface BudgetDetailsInfoProps {
    emoji: string,
    name: string,
    amount: number,
}

export interface BudgetDetailsProps {
    emoji: string,
    name: string,
    amount: number,
    type: 'expense' | 'income'
}

export interface BudgetDetailsFormProps {
    onSubmit: (title: string, amount: string, date: Date) => Promise<void>;
    isSubmitting: boolean;
}

export interface BudgetDetailsControlsProps {
    onDeleteClick: () => void,
    onEditClick: () => void
}

export interface BudgetModalProps {
    title: string,
    onClose: () => void,
    onSubmit: (emoji: string, name: string, amount: number, type: 'expense' | 'income') => Promise<void>,
    isLoading?: boolean,
    initialData?: BudgetDetailsProps,
    handleToastMessage?: (text: string, type: ToastMessageProps['type']) => void
}

export interface EditTransactionPayload {
    id: string
    title: string
    amount: number
    type: 'expense' | 'income'
    budget_folder_id?: string | null
    created_at?: string
}

export interface EditTransactionModalProps {
    title: string
    onClose: () => void
    isLoading?: boolean
    initialData: {
        id: string
        title: string
        amount: number
        type: 'expense' | 'income'
        budget_folder_id?: string | null
        created_at?: string
    }
    onSubmit: (payload: EditTransactionPayload) => Promise<void>
    allowTypeChange?: boolean
}

// ===== CHART INTERFACES =====

// Pie Chart Data Interface (for Recharts)
export interface PieChartData {
    name: string
    value: number
    fill: string
    percentage?: number
    emoji?: string        // Category emoji
    [key: string]: string | number | undefined
}

// Line Chart Data Interface (for Recharts)
export interface LineChartData {
    date: string          // Date in format (e.g., "2025-01-15")
    amount: number        // Total amount for this date
    formattedDate?: string // Human readable date (e.g., "Jan 15")
}

// Bar Chart Data Interface (for Recharts)
export interface BarChartData {
    category: string      // Category name (e.g., "Food", "Transport")
    amount: number        // Amount spent in this category
    fill: string          // Color for the bar
    emoji?: string        // Category emoji
}

// Chart Filter Types
export type ChartPeriod = 'week' | 'month' | 'quarter' | 'year' | 'custom'
export type ChartDataType = 'expenses' | 'income' | 'both'

// Chart Filters Interface
export interface ChartFilters {
    period: ChartPeriod
    startDate: Date
    endDate: Date
    dataType: ChartDataType
    selectedMonth?: number
    selectedYear?: number
}

// Chart Props Interfaces
export interface PieChartProps {
    data: PieChartData[]
    title?: string
    description?: string
    showLegend?: boolean
    showTooltip?: boolean
    height?: number
    currency?: string
    isLoading?: boolean
    error?: string | null
    emptyMessage?: string
    className?: string
}

export interface LineChartProps {
    data: LineChartData[]
    title?: string
    description?: string
    showGrid?: boolean
    showTooltip?: boolean
    showLegend?: boolean
    height?: number
    currency?: string
    isLoading?: boolean
    error?: string | null
    emptyMessage?: string
    lineColor?: string
    strokeWidth?: number
    className?: string
    xPeriod?: 'day' | 'week' | 'month' | 'year'
}

export interface BarChartProps {
    data: BarChartData[]
    title?: string
    description?: string
    showGrid?: boolean
    showTooltip?: boolean
    showLegend?: boolean
    height?: number
    currency?: string
    isLoading?: boolean
    error?: string | null
    emptyMessage?: string
    barColor?: string
    orientation?: 'vertical' | 'horizontal'
    className?: string
}

// Chart Container Props
export interface ChartsContainerProps {
    filters: ChartFilters
    onFiltersChange: (filters: ChartFilters) => void
    className?: string
}

// Chart Data Hook Return Types
export interface ChartDataHookReturn {
    pieData: PieChartData[]
    lineData: LineChartData[]
    barData: BarChartData[]
    isLoading: boolean
    error: string | null
    refetch: () => void
}

export interface UseChartDataReturn<T> {
    data: T[]
    isLoading: boolean
    error: string | null
    refetch: () => void
}

// Chart Utils Types
export interface ChartColorPalette {
    primary: string
    secondary: string
    success: string
    warning: string
    error: string
    info: string
    [key: string]: string
}

// Chart Visibility Control
export interface ChartVisibility {
    pieChart: boolean
    barChart: boolean
    lineChart: boolean
}

// Custom Legend Types
export interface LegendItem {
    value: string | number
    name: string
    color: string
    payload?: any
    emoji?: string
    icon?: React.ReactNode
}

export interface CustomLegendProps {
    payload?: LegendItem[]
    layout?: 'horizontal' | 'vertical' | 'grid'
    align?: 'left' | 'center' | 'right'
    verticalAlign?: 'top' | 'middle' | 'bottom'
    iconType?: 'circle' | 'square' | 'line' | 'rect'
    iconSize?: number
    fontSize?: number
    currency?: string
    showValues?: boolean
    showBadges?: boolean
    interactive?: boolean
    onItemClick?: (item: LegendItem, index: number) => void
    onItemHover?: (item: LegendItem | null, index: number | null) => void
    hiddenItems?: Set<number>
    className?: string
    itemClassName?: string
    spacing?: 'compact' | 'normal' | 'relaxed'
    maxItems?: number
    showToggleAll?: boolean
}

// Export related types
export type ExportFormat = 'png' | 'pdf' | 'all-pdf' | 'svg' | 'all-svg'

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
  
  // SVG специфичные настройки
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

export interface ExportControlsProps {
  chartsRefs: ChartsRefs
  onExport?: (format: ExportFormat, filename: string, options?: ExportOptions) => void
  onExportStart?: () => void
  onExportComplete?: (success: boolean, error?: string) => void
  className?: string
  disabled?: boolean
  showSettingsButton?: boolean
}

export interface ExportSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (format: ExportFormat, filename: string, options: ExportOptions) => void
  chartsRefs: ChartsRefs
  defaultOptions?: ExportOptions
}