import { Session } from "@supabase/supabase-js";
import { ReactNode } from "react";
import type { AssistantTone } from "./ai";

export interface ButtonProps {
  text: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  isLoading?: boolean;
  icon?: ReactNode;
  title?: string;
  variant?:
  | "default"
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
}

export interface AuthContextType {
  session: Session | null;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  // необязательные (для совместимости со старым кодом)
  loading?: boolean;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ data?: any; error?: any }>;
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ data?: any; error?: any }>;
  // необязательные (для совместимости со старым кодом)
  resetPassword?: (email: string) => Promise<{ data?: any; error?: any }>;
  isReady: boolean;
  isSigningIn: boolean;
  isSigningUp: boolean;
  error: string | null;
  // новое свойство для управления темой
  setUserThemePreference: (
    theme: "light" | "dark" | "system",
  ) => Promise<{ error: any }>;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export interface ToastMessageProps {
  text: string;
  type: "success" | "error";
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "expense" | "income";
  created_at: string;
  budget_folder_id?: string | null;
  category_name?: string;
  category_emoji?: string;
}

export interface TransactionTemplate {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: "expense" | "income";
  budget_folder_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionsTableProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => Promise<void>;
  deleteModalConfig?: {
    title: string;
    text: string;
  };
  onEditTransaction?: (payload: EditTransactionPayload) => Promise<void>;
  allowTypeChange?: boolean;
}

export interface SignOutModalProps {
  title: string;
  text: string;
  onClose: () => void;
  signOut: () => void;
}

export interface DeleteModalProps {
  title: string;
  text: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export interface TransactionModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (message: string, type: ToastMessageProps["type"]) => void;
  initialBudgetId?: string;
  initialData?: Transaction;
  allowTypeChange?: boolean;
}

export interface NewBudgetModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (message: string, type: ToastMessageProps["type"]) => void;
}

export interface MainBudgetModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (message: string, type: ToastMessageProps["type"]) => void;
}

export interface TextInputProps {
  type: "text" | "number" | "password";
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInput?: (e: React.FormEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  min?: string;
  step?: string;
  className?: string;
  label?: string;
  error?: string;
  inputMode?:
  | "search"
  | "text"
  | "decimal"
  | "none"
  | "email"
  | "tel"
  | "url"
  | "numeric";
  autoFocus?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  enterKeyHint?: "done" | "go" | "next" | "search" | "send";
}

export interface RadioButtonProps {
  title: string;
  value: "expense" | "income";
  currentValue: "expense" | "income";
  variant: "expense" | "income";
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  inactiveBgClassName?: string; // custom background for inactive state
}

export interface BudgetPresetProps {
  title: string;
  value: string;
  currentValue: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface CreateMainBudgetProps {
  onSubmit: (
    budget: string,
    locale?: import("./locale").UserLocaleSettings,
  ) => void;
}

export type RolloverMode = "positive-only" | "allow-negative";

export interface BudgetRolloverSettings {
  rolloverEnabled: boolean;
  rolloverMode: RolloverMode;
  rolloverCap?: number | null;
}

export interface UserBudgetSettings {
  defaultRolloverEnabled?: boolean;
}

export interface MonthlyBudgetCategory {
  budget_folder_id: string;
  month: string;
  allocated: number;
  spent: number;
  available: number;
  rolloverFromPrev: number;
  rolloverAppliedAt?: string | null;
  rolloverSourceMonth?: string | null;
}

export interface BudgetFolderItemProps {
  id: string;
  emoji: string;
  name: string;
  amount: number;
  spentAmount?: number;
  type: "expense" | "income";
  color_code?: string | null;
  rolloverEnabled?: boolean;
  rolloverMode?: RolloverMode;
  rolloverCap?: number | null;
  rolloverPreviewCarry?: number;
}

export interface BudgetDetailsInfoProps {
  emoji: string;
  name: string;
  amount: number;
}

export interface BudgetDetailsProps {
  id?: string;
  emoji: string;
  name: string;
  amount: number;
  type: "expense" | "income";
  color_code?: string | null;
  rolloverEnabled?: boolean;
  rolloverMode?: RolloverMode;
  rolloverPreviewCarry?: number;
  rolloverCap?: number | null;
}

export interface BudgetDetailsFormProps {
  onSubmit: (title: string, amount: string, date: Date) => Promise<void>;
  isSubmitting: boolean;
}

export interface BudgetDetailsControlsProps {
  onDeleteClick: () => void;
  onEditClick: () => void;
}

export interface BudgetModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (
    emoji: string,
    name: string,
    amount: number,
    type: "expense" | "income",
    color_code?: string | null,
    rolloverEnabled?: boolean,
    rolloverMode?: RolloverMode,
    rolloverCap?: number | null,
  ) => Promise<void>;
  isLoading?: boolean;
  initialData?: BudgetDetailsProps;
  handleToastMessage?: (text: string, type: ToastMessageProps["type"]) => void;
}

export interface EditTransactionPayload {
  id: string;
  title: string;
  amount: number;
  type: "expense" | "income";
  budget_folder_id?: string | null;
  created_at?: string;
}

export interface EditTransactionModalProps {
  title: string;
  onClose: () => void;
  isLoading?: boolean;
  initialData: {
    id: string;
    title: string;
    amount: number;
    type: "expense" | "income";
    budget_folder_id?: string | null;
    created_at?: string;
  };
  onSubmit: (payload: EditTransactionPayload) => Promise<void>;
  allowTypeChange?: boolean;
}

// Chart Data Types

// Line Chart Data
export interface LineChartData {
  date: string; // Date in format (e.g., "2025-01-15")
  amount: number; // Total amount for this date
  formattedDate?: string; // Human readable date (e.g., "Jan 15")
  cumulativeAmount?: number; // Cumulative amount up to this date
  budgetLine?: number; // Budget line value for this date
  budgetUsagePercent?: number; // Percentage of budget used
}

export interface LineChartProps {
  data: LineChartData[];
  title?: string;
  description?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  height?: number;
  currency?: string;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  lineColor?: string;
  strokeWidth?: number;
  className?: string;
  xPeriod?: "day" | "week" | "month" | "year";
  showBudgetLine?: boolean; // Новое свойство для показа бюджетной линии
  showCumulative?: boolean; // Новое свойство для показа кумулятивных данных
  budgetLineColor?: string; // Цвет бюджетной линии
  mainBudget?: number; // Общий бюджет для отображения в легенде
}

// Bar Chart Data
export interface BarChartData {
  category: string; // Category name (e.g., "Food", "Transport")
  amount: number; // Amount spent in this category
  fill: string; // Color for the bar
  emoji?: string; // Category emoji
}

// Chart Configuration Types (обновленные для новых фильтров)
export type ChartPeriod = "Week" | "Month"; // Убрали 'quarter', 'year', 'custom'
export type ChartDataType = "Expenses" | "Income"; // Убрали 'both', изменили на заглавные буквы

// Chart Filters
export interface ChartFilters {
  period: ChartPeriod;
  startDate: Date;
  endDate: Date;
  dataType: ChartDataType;
  selectedMonth?: number;
  selectedYear?: number;
}

export interface BarChartProps {
  data: BarChartData[];
  title?: string;
  description?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  height?: number;
  currency?: string;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  barColor?: string;
  orientation?: "vertical" | "horizontal";
  className?: string;
  showBudgetLine?: boolean; // Показывать ли бюджетную линию
  mainBudget?: number; // Общий бюджет
  budgetLineColor?: string; // Цвет бюджетной линии
  onBarHover?: (index: number, item: BarChartData) => void;
  onBarLeave?: () => void;
}

// Charts Container Props
export interface ChartsContainerProps {
  filters: ChartFilters;
  onFiltersChange: (filters: ChartFilters) => void;
  className?: string;
}

// Chart Data Hook Return Types
export interface ChartDataHookReturn {
  lineData: LineChartData[];
  barData: BarChartData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseChartDataReturn<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Chart Color Palette
export interface ChartColorPalette {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  [key: string]: string;
}

// Chart Visibility
export interface ChartVisibility {
  barChart: boolean;
  lineChart: boolean;
}

// Export Types
export type ExportFormat = "png" | "pdf" | "all-pdf" | "svg" | "all-svg";

export interface ExportOptions {
  // PNG/JPEG specific
  width?: number;
  height?: number;
  scale?: number;

  // Quality settings
  quality?: "low" | "medium" | "high";

  // Watermark settings
  watermark?: {
    enabled: boolean;
    text?: string;
    position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center";
    opacity?: number;
    fontSize?: number;
    color?: string;
  };

  // General settings
  backgroundColor?: string;
  includeLegend?: boolean;
  format?: "png" | "jpeg";

  // PDF specific
  orientation?: "portrait" | "landscape";
  pageSize?: "a4" | "a3" | "letter";
  margin?: number;

  // SVG specific
  svgOptimization?: boolean;
  embedFonts?: boolean;
  preserveAspectRatio?: string;
  svgAttributes?: Record<string, string>;
}

export interface ChartRef {
  current: HTMLElement | null;
}

export interface ChartsRefs {
  barChart?: ChartRef;
  lineChart?: ChartRef;
}

export interface ExportControlsProps {
  chartsRefs: ChartsRefs;
  onExport?: (
    format: ExportFormat,
    filename: string,
    options?: ExportOptions,
  ) => void;
  onExportStart?: () => void;
  onExportComplete?: (success: boolean, error?: string) => void;
  className?: string;
  disabled?: boolean;
  showSettingsButton?: boolean;
}

export interface ExportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (
    format: ExportFormat,
    filename: string,
    options: ExportOptions,
  ) => void;
  chartsRefs: ChartsRefs;
  defaultOptions?: ExportOptions;
}

// Comparison Line Chart Types
export interface ComparisonLineChartData {
  date: string; // Date in format (e.g., "2025-01-15")
  formattedDate?: string; // Human readable date (e.g., "Jan 15")
  currentPeriod: number; // Amount for current period (this month/week)
  previousPeriod: number; // Amount for previous period (last month/week)
  currentCumulative?: number; // Cumulative amount for current period
  previousCumulative?: number; // Cumulative amount for previous period
}

export interface ComparisonLineChartProps {
  data: ComparisonLineChartData[];
  title?: string;
  description?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  height?: number;
  currency?: string;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
  xPeriod?: "day" | "week" | "month" | "year";

  // Color customization
  currentPeriodColor?: string; // Основной синий цвет для текущего периода
  previousPeriodColor?: string; // Синий с прозрачностью для предыдущего периода
  strokeWidth?: number;

  // Data display options
  showCumulative?: boolean; // Показывать кумулятивные данные или обычные
  periodType?: "month" | "week"; // Тип периода для правильных подписей в легенде

  // Labels customization
  currentPeriodLabel?: string; // "This Month" / "This Week"
  previousPeriodLabel?: string; // "Last Month" / "Last Week"

  // Additional context
  startDate?: Date; // Дата начала текущего периода
  endDate?: Date; // Дата окончания текущего периода
  dataType?: "expenses" | "income" | "both"; // Тип данных для правильного описания

  // Summary data
  currentPeriodTotal?: number; // Общая сумма за текущий период
  previousPeriodTotal?: number; // Общая сумма за предыдущий период
  percentageChange?: number; // Процентное изменение между периодами
}

// Hook return type for comparison chart
export interface UseComparisonChartDataReturn {
  data: ComparisonLineChartData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  currentPeriodTotal?: number; // Общая сумма за текущий период
  previousPeriodTotal?: number; // Общая сумма за предыдущий период
  percentageChange?: number; // Процентное изменение между периодами
}

// AI Chat Types
export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  toolInvocations?: any[];
}

export interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isTyping: boolean;
}

export interface ChatPreset {
  id: string;
  title: string;
  prompt: string;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isOpen: boolean;
  isTyping: boolean;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  // Добавлено для поддержки abort в useChat
  abort: () => void;
  // Добавлено для подтверждения действий ассистента
  confirmAction: (confirm: boolean) => Promise<void>;
  hasPendingAction: boolean;
  isRateLimited: boolean;
  isLimitModalOpen: boolean;
  limitModalMessage?: string | null;
  closeLimitModal: () => void;
  pendingActionPayload?: {
    title?: string;
    amount?: number;
    budget_folder_id: string | null;
    budget_name?: string;
    title_pattern?: string;
    avg_amount?: number;
    cadence?: "weekly" | "monthly";
    next_due_date?: string;
  } | null;
  // Новый: текущий тон и setter
  assistantTone: AssistantTone;
  setAssistantTone: (tone: AssistantTone) => Promise<void> | void;
  // Валюта интерфейса ассистента
  currency?: string;

  // Новый: текущая AI-сессия и работа с историей
  currentSessionId: string | null;
  loadSessionMessages: (sessionId: string) => Promise<void>;
  newChat: () => void;
  syncLocalToCloud: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
}

// ===== NOTIFICATION TYPES =====

export type NotificationFrequency =
  | "disabled"
  | "gentle"
  | "aggressive"
  | "relentless";

export interface NotificationSettings {
  id: string;
  user_id: string;
  locale: string;
  frequency: NotificationFrequency;
  push_enabled: boolean;
  email_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type:
  | "budget_alert"
  | "weekly_reminder"
  | "expense_warning"
  | "goal_achieved"
  | "info"
  | "success"
  | "warning"
  | "error";
  is_read: boolean;
  created_at: string;
  metadata?: {
    budget_id?: string;
    amount?: number;
    budget_name?: string;
    [key: string]: any;
  };
}

export interface NotificationBellProps {
  count?: number;
  className?: string;
  onClick?: () => void;
  /** Режим без фона для кнопки колокола */
  minimal?: boolean;
  /** Стили для самой кнопки триггера, если нужно переопределить */
  buttonClassName?: string;
}

export interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  isLoading?: boolean;
}

export interface NotificationSettingsProps {
  settings: NotificationSettings;
  onUpdate: (settings: Partial<NotificationSettings>) => Promise<void>;
  isLoading?: boolean;
}

export interface NotificationFrequencyOption {
  value: NotificationFrequency;
  label: string;
  description: string;
  emoji: string;
  selected?: boolean;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (notificationData: {
    title: string;
    message: string;
    type?: "info" | "success" | "warning" | "error";
    metadata?: Record<string, any>;
  }) => Promise<Notification>;
  refetch: (
    limit?: number,
    offset?: number,
    unreadOnly?: boolean,
  ) => Promise<void>;
}

export interface UseNotificationSettingsReturn {
  settings: NotificationSettings | null;
  isLoading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
}
