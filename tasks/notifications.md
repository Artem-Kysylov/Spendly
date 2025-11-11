# Notifications — Production Checklist

1. Установить VAPID-ключи в окружении:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (base64url, для клиента)
   - `VAPID_PUBLIC_KEY` (опционально, если отличен от публичного)
   - `VAPID_PRIVATE_KEY` (приватный, для сервера)
   - Перезапустить сервер, убедиться что `/api/notifications/processor` не отвечает `Missing VAPID keys`.

2. Настроить расписания (Supabase Scheduler / продакшен-крон):
   - `POST https://<host>/<locale>/api/notifications/processor` каждые 1–2 минуты, заголовок `X-Cron-Secret: ${CRON_SECRET}`.
   - `POST https://<host>/<locale>/api/notifications/digest` еженедельно (понедельник утром), заголовок `X-Cron-Secret: ${CRON_SECRET}`.

3. Проверить RLS и индексы:
   - `notification_subscriptions`: политики SELECT/INSERT/UPDATE/DELETE для `auth.uid() = user_id`; индекс по `user_id`, `endpoint`; флаг `is_active`.
   - `notification_queue`: доступ процессора по service role; индексы по `status`, `scheduled_for`, `user_id`; поле `attempts`, `max_attempts`.
   - Убедиться, что сервисный ключ `SUPABASE_SERVICE_ROLE_KEY` установлен в окружении сервера.

4. Проверить клиентскую подписку на push:
   - В `.env` есть `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
   - В настройках уведомлений включить Push; в консоли — “Push subscription saved successfully”.
   - В БД (`notification_subscriptions`) появляется запись с `endpoint`, `p256dh_key`, `auth_key`, `is_active = true`.
   - В `notification_preferences` у пользователя `push_enabled = true`.

5. Провести e2e-тест очереди:
   - Отправить тест через `/api/notifications/queue` (с токеном пользователя).
   - Убедиться, что запись появилась в `notification_queue` со `status = 'pending'`.
   - Вызвать `/api/notifications/processor` с `X-Cron-Secret`; статус задач меняется на `sent`/`failed`.
   - В браузере приходит push; в DevTools → Application → Service Workers push виден.

6. Мониторинг и логирование:
   - Включить и проверить логи процессора (ошибки `webpush` с кодами 403/404/410 → деактивация подписки).
   - Настроить алерты для ошибок выборки очереди/преференций.