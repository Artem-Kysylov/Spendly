'use client'

import { useState } from 'react'
import { UserAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'

const DebugInfo = () => {
    const { session, isReady } = UserAuth()
    const [debugInfo, setDebugInfo] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)

    const runDebugCheck = async () => {
        setIsLoading(true)
        try {
            // Базовая информация о сессии
            const sessionInfo = {
                hasSession: !!session,
                userId: session?.user?.id || null,
                userEmail: session?.user?.email || null,
                isReady,
                timestamp: new Date().toISOString()
            }

            if (!session?.user?.id) {
                setDebugInfo({
                    ...sessionInfo,
                    message: 'Пользователь не аутентифицирован',
                    recommendation: 'Необходимо войти в систему для доступа к настройкам уведомлений'
                })
                return
            }

            // Проверяем доступ к таблице
            const { data: settingsData, error: settingsError } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', session.user.id)

            // Проверяем доступ к таблице уведомлений
            const { data: notificationsData, error: notificationsError } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', session.user.id)
                .limit(5)

            setDebugInfo({
                ...sessionInfo,
                settingsData,
                settingsError: settingsError ? {
                    message: settingsError.message,
                    code: settingsError.code,
                    details: settingsError.details
                } : null,
                notificationsData,
                notificationsError: notificationsError ? {
                    message: notificationsError.message,
                    code: notificationsError.code,
                    details: notificationsError.details
                } : null
            })
        } catch (err) {
            setDebugInfo({
                error: err instanceof Error ? err.message : 'Unknown error',
                timestamp: new Date().toISOString()
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800">Debug Information</h4>
                <button
                    onClick={runDebugCheck}
                    disabled={isLoading}
                    className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Checking...' : 'Run Debug Check'}
                </button>
            </div>
            
            {/* Показываем базовую информацию о сессии */}
            <div className="mb-3 text-sm">
                <div className="flex items-center gap-2">
                    <span className="font-medium">Статус аутентификации:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                        session ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                        {session ? 'Аутентифицирован' : 'Не аутентифицирован'}
                    </span>
                </div>
                {session && (
                    <div className="mt-1 text-gray-600">
                        User ID: {session.user.id}
                    </div>
                )}
            </div>
            
            {debugInfo && (
                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                </pre>
            )}
        </div>
    )
}

export default DebugInfo