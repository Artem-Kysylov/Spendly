import { Session } from '@supabase/supabase-js'
import { ReactNode } from 'react'

export interface ButtonProps {
    text: ReactNode,
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void,
    className?: string,
    type?: 'button' | 'submit' | 'reset',
    disabled?: boolean,
    isLoading?: boolean,
    icon?: ReactNode
}

export interface AuthContextType {
    session: Session | null
    signInWithGoogle: () => Promise<{ error: any }>
    signOut: () => Promise<void>
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
    created_at: string
}

export interface TransactionsTableProps {
    transactions: Transaction[]
    onDeleteTransaction: (id: string) => Promise<void>
    deleteModalConfig?: {
        title: string
        text: string
    }
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
}

export interface RadioButtonProps {
    title: string,
    value: 'expense' | 'income',
    currentValue: 'expense' | 'income',
    variant: 'expense' | 'income',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
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
    onSubmit: (title: string, amount: string) => Promise<void>;
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