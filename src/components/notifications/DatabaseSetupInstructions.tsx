'use client'

import { useState } from 'react'
import { Copy, Check, Database, AlertCircle } from 'lucide-react'

const DatabaseSetupInstructions = () => {
    const [copied, setCopied] = useState(false)

    const sqlScript = `-- Создание таблицы для настроек уведомлений
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL DEFAULT 'gentle' CHECK (frequency IN ('disabled', 'gentle', 'aggressive', 'relentless')),
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZОНЕ DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZОНЕ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Создание таблицы для уведомлений
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('budget_alert', 'weekly_reminder', 'expense_warning', 'goal_achieved', 'general')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZОНЕ DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZОНЕ DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON notifications(user_id, is_read);

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security (RLS)
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности для notification_preferences
CREATE POLICY "Users can view their own notification settings" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings" ON notification_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Создание политик безопасности для notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Политики для вставки уведомлений (обычно делается системой)
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Создание функции для создания тестовых уведомлений
CREATE OR REPLACE FUNCTION create_sample_notifications(target_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
    (target_user_id, 'Превышен бюджет', 'Ваши расходы на продукты превысили месячный бюджет на 15%', 'budget_alert', false),
    (target_user_id, 'Еженедельный отчет', 'Ваш еженедельный отчет о расходах готов к просмотру', 'weekly_reminder', false),
    (target_user_id, 'Крупная трата', 'Обнаружена трата в размере $250. Проверьте детали транзакции', 'expense_warning', true),
    (target_user_id, 'Цель достигнута!', 'Поздравляем! Вы достигли цели по экономии на этот месяц', 'goal_achieved', true);
END;
$$ language 'plpgsql';`

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(sqlScript)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy text: ', err)
        }
    }

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <h3 className="font-semibold text-amber-800 mb-2">
                        Требуется настройка базы данных
                    </h3>
                    <p className="text-amber-700 mb-4">
                        Для работы системы уведомлений необходимо создать таблицы в базе данных Supabase.
                    </p>
                    
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-medium text-amber-800 mb-2">Инструкции:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-amber-700">
                                <li>Откройте панель управления Supabase</li>
                                <li>Перейдите в раздел "SQL Editor"</li>
                                <li>Скопируйте и выполните SQL скрипт ниже</li>
                                <li>Обновите страницу после выполнения</li>
                            </ol>
                        </div>

                        <div className="bg-white rounded-lg border border-amber-200 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Database className="w-4 h-4 text-amber-600" />
                                    <span className="text-sm font-medium text-amber-800">SQL Script</span>
                                </div>
                                <button
                                    onClick={copyToClipboard}
                                    className="flex items-center gap-2 px-3 py-1 text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 rounded transition-colors"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Скопировано!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Копировать
                                        </>
                                    )}
                                </button>
                            </div>
                            <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded border overflow-x-auto max-h-64">
                                {sqlScript}
                            </pre>
                        </div>

                        <div className="text-sm text-amber-700">
                            <strong>Примечание:</strong> После выполнения SQL скрипта вы можете использовать функцию{' '}
                            <code className="bg-amber-100 px-1 rounded">create_sample_notifications(user_id)</code>{' '}
                            для создания тестовых уведомлений.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DatabaseSetupInstructions