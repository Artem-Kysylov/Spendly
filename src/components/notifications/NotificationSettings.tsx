'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { useNotificationSettings } from '@/hooks/useNotificationSettings'
import { UserAuth } from '@/context/AuthContext'
import DatabaseSetupInstructions from './DatabaseSetupInstructions'
import DebugInfo from './DebugInfo'
import type { NotificationFrequency, NotificationFrequencyOption } from '@/types/types'

const NotificationSettings = () => {
    const { session, isReady } = UserAuth()
    const { settings, isLoading, error, updateSettings, subscribeToPush, unsubscribeFromPush } = useNotificationSettings()
    const [isUpdating, setIsUpdating] = useState(false)

    const frequencyOptions: NotificationFrequencyOption[] = [
        {
            value: 'disabled',
            label: "Don't send",
            description: 'Turn off all reminders',
            emoji: '😴'
        },
        {
            value: 'gentle',
            label: 'Gentle nudges',
            description: '1-2 notifications daily',
            emoji: '🤗'
        },
        {
            value: 'aggressive',
            label: 'Aggressive reminders',
            description: '4-5 notifications daily',
            emoji: '😤'
        },
        {
            value: 'relentless',
            label: 'Relentless',
            description: "You'll feel it (10+ daily)",
            emoji: '🤯'
        }
    ]

    const handleFrequencyChange = async (frequency: NotificationFrequency) => {
        if (!settings || isUpdating) return

        try {
            setIsUpdating(true)
            await updateSettings({ frequency })
        } catch (err) {
            console.error('Failed to update frequency:', err)
        } finally {
            setIsUpdating(false)
        }
    }

    const handlePushToggle = async (enabled: boolean) => {
        if (!settings || isUpdating) return

        try {
            setIsUpdating(true)
            if (enabled) {
                const success = await subscribeToPush()
                if (!success) {
                    // Handle subscription failure
                    console.error('Failed to subscribe to push notifications')
                }
            } else {
                await unsubscribeFromPush()
            }
        } catch (err) {
            console.error('Failed to toggle push notifications:', err)
        } finally {
            setIsUpdating(false)
        }
    }

    // Проверяем аутентификацию
    if (isReady && !session) {
        return (
            <div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Требуется аутентификация</h3>
                    <p className="text-blue-700 text-sm mb-3">
                        Для доступа к настройкам уведомлений необходимо войти в систему.
                    </p>
                    <button 
                        onClick={() => window.location.href = '/login'}
                        className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded transition-colors"
                    >
                        Войти в систему
                    </button>
                </div>
                <DebugInfo />
            </div>
        )
    }

    // Показываем инструкции по настройке БД, если есть ошибка, связанная с отсутствием таблицы
    if (error && (error.includes('relation') || error.includes('table') || error.includes('does not exist'))) {
        return (
            <div>
                <DatabaseSetupInstructions />
                <DebugInfo />
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                </div>
                <DebugInfo />
            </div>
        )
    }

    if (error) {
        return (
            <div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-2">Ошибка загрузки настроек</h3>
                    <p className="text-red-700 text-sm mb-3">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors"
                    >
                        Обновить страницу
                    </button>
                </div>
                <DebugInfo />
            </div>
        )
    }

    if (!settings) {
        return (
            <div>
                <div className="text-center py-8">
                    <p className="text-gray-600">Не удалось загрузить настройки уведомлений</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded transition-colors"
                    >
                        Попробовать снова
                    </button>
                </div>
                <DebugInfo />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Push Notifications Toggle */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                    <h3 className="font-medium text-secondary-black">Push Notifications</h3>
                    <p className="text-sm text-gray-600">Receive notifications on this device</p>
                </div>
                <Switch
                    checked={settings.push_enabled}
                    onCheckedChange={handlePushToggle}
                    disabled={isUpdating}
                    className="data-[state=checked]:bg-primary"
                />
            </div>

            {/* Frequency Settings */}
            <div>
                <h3 className="font-medium text-secondary-black mb-4">Notification Frequency</h3>
                <div className="space-y-3">
                    {frequencyOptions.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => handleFrequencyChange(option.value)}
                            className={`
                                p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                                ${settings.frequency === option.value
                                    ? 'border-primary bg-primary/5'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }
                                ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{option.emoji}</span>
                                <div className="flex-1">
                                    <div className="font-medium text-secondary-black">
                                        {option.label}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {option.description}
                                    </div>
                                </div>
                                {settings.frequency === option.value && (
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Debug Info - временно для отладки */}
            <DebugInfo />
        </div>
    )
}

export default NotificationSettings