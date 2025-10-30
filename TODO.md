


          
**Структурированный Ассистент (JSON)**
- Цель: получать от LLM строгий JSON с намерением, периодом, фильтрами, данными для графиков и советами; автоматически применять фильтры и выполнять подтверждённые действия (например, добавление транзакции).
- Поток данных:
  - UI (`useChat` → `AIAssistantProvider`) отправляет запрос в `POST /api/assistant` с флагом режима, например `mode: 'structured'`.
  - Сервер (`app/api/assistant/route.ts`) при `mode: 'structured'`:
    - Компонует контекст (`prepareUserContext`) и промпт с инструкцией возвращать строгий JSON.
    - Выбирает провайдера (`OpenAI/Gemini`) на основе `AI_PROVIDER`, сложности (`isComplexRequest`) и доступности ключей.
    - Возвращает единый JSON-ответ (без стрима) или стрим, где первая порция — валидный JSON.
  - Клиент парсит JSON, валидирует и:
    - Применяет фильтры через `useTransactionsData.updateFilters`.
    - Генерирует временный «быстрый» график, не затрагивая основной источник, либо подменяет вход `chartData` для визуального превью.
    - Отображает советы/текст в `AIChatWindow`, а также опционально в `ChartDescription`.
- Структура ответа (логическая схема):
  - `kind`: `'structured'` | `'message'` | `'action'`
  - `intent`: `'show_week_expenses' | 'show_month_expenses' | 'save_advice' | 'analyze_spending' | 'biggest_expenses' | 'compare_months' | 'unknown'`
  - `period`: `'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'unknown'`
  - `filters`: `{ dataType: 'Expenses'|'Income'|'Both', period: 'Week'|'Month', selectedMonth?: number, selectedYear?: number, startDate?: ISOString, endDate?: ISOString, budgetIds?: string[] }`
  - `chart`: `{ type: 'bar'|'line'|'pie', xAxis: string[], series: Array<{ label: string, values: number[], color?: string }>, totals?: { expenses?: number, income?: number, net?: number } }`
  - `advice`: `Array<{ title: string, text: string, severity?: 'info'|'warning'|'critical' }>`
  - `actions`: `Array<{ type: 'apply_filters' | 'add_transaction', payload: any, confirm?: boolean }>`
  - `meta`: `{ model: 'gemini-2.5-flash'|'gpt-4-turbo', promptVersion: string, locale: string, currency: string }`
- Подтверждение действий:
  - Для `add_transaction`: UI показывает `confirmText` («подтвердить добавление?»), при подтверждении отправляет `confirm: true` и `actionPayload` в `POST /api/assistant`, где сервер вызывает `executeTransaction`.
  - Для `apply_filters`: UI применяет сразу (без серверной части) через `useTransactionsData.updateFilters` и синхронизирует панель фильтров/графики.
- Изменения промптов:
  - Явно требовать строгий JSON без префиксов/сигнатур, с валидацией максимальной длины.
  - Поддержать i18n через уже передаваемые `locale`/`currency` в `route.ts`.
  - Для OpenAI рассмотреть `response_format` (строгий JSON) при отключённом стриме; для Gemini — жёсткие инструкции и пост‑валидация на сервере.
- Отказоустойчивость:
  - Если парсинг JSON провалился — показывать текстовый ответ, фильтры не применять.
  - Если `intent` не распознан — не трогать состояние, предложить пресеты.
- Логирование и лимиты:
  - Расширить `ai_usage_logs`: сохранить `intent`, `period`, факт применения `apply_filters`, длину ответа, ошибки парсинга.
  - Сохранить текущую политику лимитов в `route.ts`, отдавать `429` при превышении.
- Интеграция в UI:
  - Превью графиков: поверх стандартного `ExpensesBarChart` можно отрисовать «предложенный» набор данных (без кеширования), с лейблом «AI Preview».
  - В `Transactions` синхронизировать фильтры панели (`TransactionsFilter`) при получении `filters` из ассистента.
  - В `EditTransactionModal` оставить ручной контроль даты/типа; ассистент может предложить значения, но решение — за пользователем.

**Уведомления: Лимиты и Дайджесты**
- Цель: автоматически уведомлять пользователя о достижении порогов бюджета (например, 80%, 100%) и формировать еженедельные дайджесты с ключевыми метриками.
- Модель данных (есть в проекте):
  - `notification_preferences`: включает `engagement_frequency`, `push_enabled`, `email_enabled`.
  - `notification_subscriptions`: хранит `endpoint`, ключи `p256dh`/`auth`, `user_agent`, `is_active`.
  - `notification_queue`: очередь для запланированных/массовых уведомлений с полями `status`, `attempts`, `max_attempts`, `scheduled_for`.
  - `notifications`: список конкретных уведомлений, которые клиент может читать и помечать `is_read`.
- Триггеры лимитов бюджета:
  - При вставке/обновлении транзакции (таблица `transactions`) проверять связанный бюджет (`budget_folders.amount`) и текущие расходы (сумма `expense` по `budget_folder_id` и `user_id`).
  - Если порог `>=80%` или `>=100%` — создавать запись в `notification_queue` (тип `'budget_alert'`) и/или сразу `notifications`.
  - Пороговая логика учитывает `notification_preferences.engagement_frequency`:
    - `'disabled'`: ничего не создаём.
    - `'gentle'`: только при `>=100%`.
    - `'aggressive'`: при `>=80%` и `>=100%` с умным дебаунсом.
    - `'relentless'`: при каждом пересечении порога, но с rate‑limit.
- Еженедельные дайджесты:
  - Крон‑задача (Supabase Scheduler / Edge Function) раз в неделю:
    - Агрегация расходов/доходов за прошлую неделю, топ‑категории, советы ассистента (опционально, можно рейндж).
    - Формирование `notification_queue` с типом `'weekly_reminder'` для каждого активного пользователя.
- Обработчик очереди:
  - Edge Function (или серверный бэкенд) «processor»:
    - Берёт `status: 'pending'` из `notification_queue` с учётом `scheduled_for` ≤ сейчас.
    - На основе `notification_subscriptions` отправляет Web Push. При необходимости — email (если включено).
    - Помечает `status` → `'sent'` или `'failed'`, увеличивает `attempts`, повторяет по backoff до `max_attempts`.
  - Отправка push требует VAPID‑ключей; хранить публичный/приватный ключ в секретах и использовать их при отправке.
- Интеграция в UI:
  - Индикатор колокольчика в `TopBar` с счётчиком непрочитанных.
  - Панель уведомлений (popover/drawer) с лентой из `/api/notifications` (`GET` с пагинацией и `unread_only` флагом).
  - Действия: `mark_read`, `mark_all_read` через `PATCH /api/notifications`.
  - Настройки: страница/модалка «Notification Settings» использует `useNotificationSettings` и `POST /api/notifications/subscribe` для push (разрешение на уведомления, регистрация сервис‑воркера `public/sw.js`).
  - Inline предупреждения на деталях бюджета (`BudgetDetailsInfo`/`BudgetDetailsControls`): если `>=80%`, подсветить прогрессбар и показать CTA «Уменьшить расходы»/«Открыть отчёт».
- Политики UX и спама:
  - Дебаунс повторных уведомлений по одному бюджету (например, не чаще 1 раза/24 часа для `gentle`).
  - Сессионные тосты (`ToastMessage`) для мгновенных оповещений при добавлении транзакции (локально), без записи в push.
  - Для `relentless` — ограничить максимум уведомлений/день.
- Тестирование и мониторинг:
  - Протестировать сценарии: достижение 80%/100% по бюджету, отсутствие подписки на push (деградация в in‑app), крон‑дайджест.
  - Логи: расширить серверные логи ошибок отправки, метрики очереди (общее, sent, failed).
- Безопасность и RLS:
  - Все API используют аутентифицированный Supabase клиент (`getAuthenticatedClient`) и проверяют `user.id`.
  - Схемы БД под RLS: правила должны допускать чтение/запись только для владельца `user_id`.

**Пошаговый План Работ**
- Ассистент (structured):
  - Определить JSON‑схему и режим `mode: 'structured'` для `POST /api/assistant`.
  - Дополнить промпты строгой инструкцией JSON‑ответа, настроить нестриминговый ответ.
  - На клиенте: парс/валидация ответа, применение `apply_filters` и превью графиков.
  - Расширить `UseChatReturn` и UI для отображения советов/графиков и подтверждения действий.
- Уведомления:
  - Реализовать пороговую логику на сервере: вставка в `notification_queue` при пересечении 80%/100%.
  - Настроить еженедельный крон‑дайджест (агрегации + создание задач в очереди).
  - Написать обработчик очереди (Edge Function), интегрировать VAPID‑ключи.
  - Завести UI: колокольчик, список, действия, настройки; интегрировать `useNotifications`/`useNotificationSettings`.

**Зависимости и Конфиг**
- Ключи: `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `AI_PROVIDER`, `OPENAI_MODEL`, `GEMINI_MODEL`.
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` для серверных операций/крона.
- Push: VAPID (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) для отправки Web Push со стороны сервера.
- Планы крона: задать расписание в Supabase Scheduler (еженедельно).

Если ок, могу подготовить подробные чек‑листы по каждому этапу и приступить к первому — структурированному ответу ассистента с применением фильтров.
        

        Улучшения для уведомлений



          
Сначала проверю серверные API уведомлений, сервис‑воркер и подписку push.
        
            
toolName: search_codebase
            
status: success
          
query: Find notification-related server routes and client hooks/components to debug why push notifications are not delivered.
          

        
            
toolName: search_by_regex
            
status: success
          
query: serviceWorker|sw\.js|pushManager|Notification.requestPermission|navigator\.serviceWorker
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/macbookair/Documents/projects/spendly-app-ver-1.0/src/hooks/useNotificationSettings.ts
/Users/macbookair/Documents/projects/spendly-app-ver-1.0/src/app/api/notifications/subscribe/route.ts
/Users/macbookair/Documents/projects/spendly-app-ver-1.0/public/sw.js
          

        
            
toolName: search_by_regex
            
status: success
          
query: subscribeToPush\(|unsubscribeFromPush\(
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/macbookair/Documents/projects/spendly-app-ver-1.0/src/components/notifications/NotificationSettings.tsx
/Users/macbookair/Documents/projects/spendly-app-ver-1.0/src/hooks/useNotifications.ts
/Users/macbookair/Documents/projects/spendly-app-ver-1.0/src/app/api/notifications/route.ts
          
**Краткий Статус**
- Клиентская часть: сервис‑воркер регистрируется (`/sw.js`), есть UI для подписки на push в настройках.
- Сервер: API для уведомлений, подписок и очереди работает через Supabase, Edge Function `send-push-notifications` дергается из эндпойнта очереди.
- Симптом: push не приходит.

**Основная Причина**
- В `subscribeToPush` мы передаем `applicationServerKey` строкой (`process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`). Для `PushManager.subscribe` нужен `Uint8Array` (Base64Url → Uint8Array). В таком виде подписка падает с ошибкой, запись в `notification_subscriptions` не создается, и пуши некому отправлять.

**Что Уже Есть**
- Регистрация SW: `app/layout.tsx` подключает `ServiceWorkerRegistration` → `navigator.serviceWorker.register('/sw.js')`.
- SW обработчик `push`: показывает уведомление, читает `event.data.json()` (`title`, `message`, `icon`) и открывает `/dashboard` по действию.
- API:
  - `/api/notifications` — CRUD уведомлений в БД.
  - `/api/notifications/preferences` — настройки частоты/каналов.
  - `/api/notifications/subscribe` — сохраняет push‑подписку в `notification_subscriptions`.
  - `/api/notifications/queue` — кладет задачу в `notification_queue` и вызывает Edge Function (`Authorization: Bearer service_role`).

**Проверки На Месте**
- Разрешение и подписка:
  - Открой страницу настроек, включи “Push Notifications”. В консоли должен быть “Push subscription saved successfully”.
  - Если в консоли ошибка похожая на “TypeError: Failed to execute 'subscribe' on 'PushManager': parameter 1 ('applicationServerKey') is not of type 'BufferSource'” — это подтверждает проблему.
- БД:
  - В таблице `notification_subscriptions` должна появиться строка с твоим `user_id` и `endpoint`. В `notification_preferences` → `push_enabled` = true.
  - В `notification_queue` — записи со статусом `pending`/`sent` при тестовой отправке.
- SW:
  - В DevTools → Application → Service Workers убедись, что `Spendly` активен, попробуй “Push” с payload `{"title":"Test","message":"Hello"}` — должен всплыть пуш.
- Edge Function:
  - Проверь логи функции `send-push-notifications` и что она доступна по `NEXT_PUBLIC_SUPABASE_URL/functions/v1/send-push-notifications`.

**Тест Очереди (ручная отправка)**
- Выполни запрос на очередь с немедленной обработкой. Нужен bearer токен пользователя из `supabase.auth.getSession()`.

```bash
curl -X POST "http://localhost:3000/api/notifications/queue" \
  -H "Authorization: Bearer <AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Spendly test","message":"Queue → Edge → Push","send_push":true}'
```

- Успешный ответ: 201 и сообщение “Notification added to queue successfully”. В логе Next может быть предупреждение, если Edge Function не ответила, но запись в очереди появится.

**Рекомендованный Фикс VAPID Ключа**
- Конвертируй `NEXT_PUBLIC_VAPID_PUBLIC_KEY` в `Uint8Array` перед `subscribe`. Это устранит ошибку подписки.

```typescript:/Users/macbookair/Documents/projects/spendly-app-ver-1.0/src/hooks/useNotificationSettings.ts
export const useNotificationSettings = (): UseNotificationSettingsReturn => {
    // ... existing code ...
    const subscribeToPush = useCallback(async (): Promise<boolean> => {
        // ... existing code ...
            const registration = await navigator.serviceWorker.ready
            const applicationServerKeyString = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string
            const applicationServerKey = urlBase64ToUint8Array(applicationServerKeyString)

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            })
        // ... existing code ...
    }, [getAuthToken, settings])
    // ... existing code ...
}

// ... existing code ...

// Помощник: Base64Url → Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/')

    const rawData = typeof window !== 'undefined'
        ? window.atob(base64)
        : Buffer.from(base64, 'base64').toString('binary')

    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}
```

**Дополнительные Моменты**
- Иконки в SW: укажи существующие пути — например, `'/icons/icon-192x192.png'` и `'/icons/icon-512x512.png'`; файл `'/badge-72x72.png'` отсутствует.
- Каналы и частота: при `frequency='disabled'` лучше явно выключать `push_enabled`/`email_enabled`, что уже делается в `preferences`.
- iOS ограничения: на iOS push работает только для установленного PWA (iOS 16.4+). В Safari без установки — push не придет.

**Следующие Шаги**
- Исправить `applicationServerKey` на `Uint8Array`.
- Подписаться на push в настройках, проверить запись в `notification_subscriptions`.
- Отправить тест в `/api/notifications/queue` и посмотреть, приходит ли пуш; проверить логи Edge Function.
- При необходимости — поправить иконки в `sw.js` и убедиться, что SW активен.

        