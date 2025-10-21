'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotifications } from '@/hooks/useNotifications'
import type { NotificationBellProps } from '@/types/types'

function NotificationBell({ className = '', onClick }: NotificationBellProps) {
    const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead } = useNotifications()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
    const DROPDOWN_WIDTH = 320 // w-80 ≈ 320px

    // Явный type guard для error (исправляет ts(18047))
    const hasDbError = typeof error === 'string' &&
        (error.includes('relation') || error.includes('table') || error.includes('does not exist'))

    // Функция позиционирования — считает left от кнопки (исправляет ошибки на L19-28 и отсутствие updateDropdownPosition)
    const updateDropdownPosition = () => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        const left = Math.max(8, Math.min(rect.right - DROPDOWN_WIDTH, window.innerWidth - DROPDOWN_WIDTH - 8))
        setDropdownPosition({ top: rect.bottom + 8, left })
    }

    // Эффект для обновления позиции (заменяет старый эффект с dropdownRef/right)
    useEffect(() => {
        if (!isOpen) return
        updateDropdownPosition()
        const onResizeOrScroll = () => updateDropdownPosition()
        window.addEventListener('resize', onResizeOrScroll)
        window.addEventListener('scroll', onResizeOrScroll, true)
        return () => {
            window.removeEventListener('resize', onResizeOrScroll)
            window.removeEventListener('scroll', onResizeOrScroll, true)
        }
    }, [isOpen])

    // Обработчик клика по уведомлению — внутри компонента (исправляет ts(2304) по markAsRead)
    const handleNotificationClick = async (notification: any) => {
        if (!notification.is_read) {
            await markAsRead(notification.id)
        }
    }
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'budget_alert': return '⚠️'
            case 'weekly_reminder': return '📅'
            case 'expense_warning': return '💸'
            case 'goal_achieved': return '🎉'
            default: return '📢'
        }
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element
            const insideTrigger = !!target.closest('.notification-bell-trigger')
            const insideDropdown = !!target.closest('.notification-dropdown')
            if (isOpen && !insideTrigger && !insideDropdown) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    const handleBellClick = () => {
        updateDropdownPosition()
        setIsOpen(prev => !prev)
        onClick?.()
    }

    useEffect(() => {
        if (!isOpen) return
        updateDropdownPosition()
        const onResizeOrScroll = () => updateDropdownPosition()
        window.addEventListener('resize', onResizeOrScroll)
        window.addEventListener('scroll', onResizeOrScroll, true)
        return () => {
            window.removeEventListener('resize', onResizeOrScroll)
            window.removeEventListener('scroll', onResizeOrScroll, true)
        }
    }, [isOpen])

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Bell Icon with background */}
            <button
                ref={triggerRef}
                onClick={handleBellClick}
                className="notification-bell-trigger relative p-2 text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-full transition-all duration-200"
                aria-label="Notifications"
            >
                <Bell className="w-6 h-6" />
                {!hasDbError && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown — render via portal to escape stacking contexts */}
            {isOpen && createPortal(
                <div
                    className="notification-dropdown fixed w-80 bg-white dark:bg-card rounded-lg shadow-lg border border-border dark:border-border z-[9999]"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-secondary-black">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {!hasDbError && unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-sm text-primary hover:text-primary/80"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="max-h-96 overflow-y-auto">
                        {hasDbError ? (
                            <div className="p-4 text-center">
                                <div className="text-gray-400 mb-2">
                                    <Bell className="w-8 h-8 mx-auto" />
                                </div>
                                <p className="text-gray-600 text-sm">
                                    Настройте базу данных для работы с уведомлениями
                                </p>
                                <p className="text-gray-500 text-xs mt-1">
                                    Перейдите в настройки для получения инструкций
                                </p>
                            </div>
                        ) : isLoading ? (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-3 animate-pulse">
                                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="text-gray-400 mb-2">
                                    <Bell className="w-8 h-8 mx-auto" />
                                </div>
                                <p className="text-gray-600">No notifications yet</p>
                                <p className="text-gray-500 text-sm mt-1">
                                    We'll notify you when something important happens
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.slice(0, 10).map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`
                                            p-4 cursor-pointer hover:bg-gray-50 transition-colors
                                            ${!notification.is_read ? 'bg-blue-50/50' : ''}
                                        `}
                                    >
                                        <div className="flex gap-3">
                                            <div className="text-xl">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className={`
                                                        text-sm font-medium text-secondary-black truncate
                                                        ${!notification.is_read ? 'font-semibold' : ''}
                                                    `}>
                                                        {notification.title}
                                                    </h4>
                                                    {!notification.is_read && (
                                                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {!hasDbError && notifications.length > 10 && (
                        <div className="p-3 border-t border-gray-100 text-center">
                            <button className="text-sm text-primary hover:text-primary/80">
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    )
}

export default NotificationBell