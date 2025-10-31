'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotifications } from '@/hooks/useNotifications'
import type { NotificationBellProps } from '@/types/types'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'

function NotificationBell({ className = '', onClick }: NotificationBellProps) {
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead, refetch } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const [pageOffset, setPageOffset] = useState(0)
  const PAGE_SIZE = 10
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const DROPDOWN_WIDTH = 320 // w-80 ≈ 320px
  const tNotifications = useTranslations('notifications')

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
      // загружаем страницу уведомлений при открытом дропдауне
      refetch(PAGE_SIZE, pageOffset)
      const onResizeOrScroll = () => updateDropdownPosition()
      window.addEventListener('resize', onResizeOrScroll)
      window.addEventListener('scroll', onResizeOrScroll, true)
      return () => {
          window.removeEventListener('resize', onResizeOrScroll)
          window.removeEventListener('scroll', onResizeOrScroll, true)
      }
  }, [isOpen, pageOffset, refetch])

  const handlePrevPage = async () => {
    const nextOffset = Math.max(0, pageOffset - PAGE_SIZE)
    setPageOffset(nextOffset)
    await refetch(PAGE_SIZE, nextOffset)
  }

  const handleNextPage = async () => {
    const nextOffset = pageOffset + PAGE_SIZE
    setPageOffset(nextOffset)
    await refetch(PAGE_SIZE, nextOffset)
  }

  const openBudget = async (notification: any) => {
      const budgetId = notification?.metadata?.budget_id
      if (budgetId) {
          if (!notification.is_read) await markAsRead(notification.id)
          router.push({ pathname: '/budgets/[id]', params: { id: String(budgetId) } })
      }
  }

  const openReport = async (notification?: any) => {
    if (notification && !notification.is_read) await markAsRead(notification.id)
    router.push('/dashboard')
  }

  return (
      <div className={`relative ${className}`} ref={dropdownRef}>
          {/* Bell Icon with background */}
          <button
              ref={triggerRef}
              onClick={handleBellClick}
              className="notification-bell-trigger relative p-2 text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-full transition-all duration-200"
              aria-label={tNotifications('bell.aria')}
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
                      <h3 className="font-semibold text-secondary-black">{tNotifications('bell.title')}</h3>
                      <div className="flex items-center gap-2">
                          {!hasDbError && unreadCount > 0 && (
                              <button
                                  onClick={markAllAsRead}
                                  className="text-sm text-primary hover:text-primary/80"
                              >
                                  {tNotifications('bell.markAllRead')}
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
                                  {tNotifications('bell.setup.title')}
                              </p>
                              <p className="text-gray-500 text-xs mt-1">
                                  {tNotifications('bell.setup.subtitle')}
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
                              <p className="text-gray-600">{tNotifications('bell.empty.title')}</p>
                              <p className="text-gray-500 text-sm mt-1">
                                  {tNotifications('bell.empty.description')}
                              </p>
                          </div>
                      ) : (
                          <div className="divide-y divide-gray-100">
                              {notifications.map((notification) => (
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

                                              {/* CTA buttons per type */}
                                              <div className="mt-2 flex gap-2">
                                                  {notification.type === 'budget_alert' && notification?.metadata?.budget_id && (
                                                      <>
                                                          <button
                                                              onClick={(e) => { e.stopPropagation(); openBudget(notification) }}
                                                              className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                                                          >
                                                              Перейти в бюджет
                                                          </button>
                                                          <button
                                                              onClick={(e) => { e.stopPropagation(); openReport(notification) }}
                                                              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                          >
                                                              Открыть отчёт
                                                          </button>
                                                      </>
                                                  )}
                                                  {notification.type === 'weekly_reminder' && (
                                                      <button
                                                          onClick={(e) => { e.stopPropagation(); openReport(notification) }}
                                                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                      >
                                                          Открыть отчёт
                                                      </button>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  {/* Footer: pagination */}
                  {!hasDbError && (
                      <div className="p-3 border-t border-gray-100 flex items-center justify-between">
                          <button
                              onClick={handlePrevPage}
                              disabled={pageOffset === 0}
                              className="text-sm text-primary disabled:text-gray-400 hover:text-primary/80"
                          >
                              Назад
                          </button>
                          <button
                              onClick={handleNextPage}
                              disabled={notifications.length < PAGE_SIZE}
                              className="text-sm text-primary disabled:text-gray-400 hover:text-primary/80"
                          >
                              Вперёд
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