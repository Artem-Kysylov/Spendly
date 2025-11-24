# Free Tier — финальные задачи

1. [ ] Weekly digest (Free/Pro-гейтинг)
   - [x] Добавить проверку плана в `api/notifications/digest/route.ts`: Free — базовый summary; Pro — расширенный разбор (AI).
   - [x] Подключить `selectModel` и `buildCountersPrompt` (безопасный фолбэк при отсутствии API-ключей).
   - [x] Обновить строки локализации для дайджеста (title/body/CTA), проверить во всех `locales/*`.
   - [x] `NotificationSettings.tsx`: указать различия Free/Pro, CTA на `/payment`, учитывать план.
   - [ ] E2E: проверка, что постановка push/email в очередь учитывает гейтинг.

2. [x] Локализации
   - [x] Добавить `assistant.toasts.usedNOfDailyLimit` в `en`, `ru`, `uk`, `id`, `ko`, `ja` (в `hi` уже есть).
   - [x] Проверить наличие `recurringRules.errors.limitReached` во всех локалях и единый тон.
   - [x] Прогон проверки на отсутствующие ключи/регрессы при сборке.

3. [x] UX-полировка апгрейд-CTA 
    - [x] Обновить тексты в `PeriodicUpgradeBanner` и `UpgradeSidebarBanner` (инсайты, лимиты). 
    - [x] Убедиться, что CTA ведут на `/payment`. 
    - [x] Скрывать баннеры для Pro последовательно во всех местах.

4. [x] Телеметрия и контроль лимитов
   - [x] Реализовать клиентский хелпер `trackEvent(name, payload)` (отправка в Supabase/аналитику).
   - [x] Логировать события: `ai_request_used`, `ai_limit_hit`, `upgrade_cta_clicked`, `digest_generated`.
   - [x] Админ-переключатель дневного AI-лимита (5 ↔ 10) через удалённый конфиг.

5. [x] Регулярные транзакции — завершающие шаги
   - [x] Убедиться, что серверные guard’ы стоят на всех create/update эндпойнтах (не только AI-путь).
   - [x] E2E для `RecurringRulesSettings.tsx`: дизейбл кнопки Add и показ ошибки в Free при попытке > 2 правил.