# Spendly: Production Checklist

Ниже — полный чек‑лист для продакшена, с конкретными переменными окружения, проверками, и задачами для тестирования. Отметьте пункты ([x]) по мере выполнения.

## 1) Переменные окружения

- [ ] Supabase
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Уведомления (Web Push / Cron)
  - [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - [ ] `VAPID_PRIVATE_KEY`
  - [ ] `CRON_SECRET`
- [ ] Платежи (Lemon Squeezy)
  - [ ] `LEMON_SQUEEZY_API_KEY`
  - [ ] `LEMON_SQUEEZY_STORE_ID`
  - [ ] `LEMON_SQUEEZY_PRO_VARIANT_ID`
  - [ ] `LEMON_SQUEEZY_WEBHOOK_SECRET`
  - [ ] `NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL` (валидная хостимая ссылка, не legacy `/checkout/buy/`)
- [ ] LLM (опционально для Pro‑дайджеста)
  - [ ] `OPENAI_API_KEY` и `OPENAI_MODEL` (например, `gpt-4-turbo`)
  - [ ] `GOOGLE_API_KEY` и `GEMINI_MODEL` (например, `gemini-2.5-flash`)
- [ ] SMTP (для email‑канала; см. раздел 3 ниже)
  - [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
  - [ ] `SMTP_SECURE` (`true|false`)
  - [ ] `SMTP_FROM` (например, `Spendly <no-reply@your-domain>`)

## 2) Supabase и безопасность

- [ ] RLS и схемы:
  - [ ] `notification_preferences`: политики `auth.uid() = user_id`; триггер `update_updated_at_column`
  - [ ] `notification_subscriptions`: политики `auth.uid() = user_id`; индекс по `user_id`, `endpoint`; поле `is_active`
  - [ ] `notification_queue`: RLS под пользователя; поля `status`, `attempts`, `max_attempts`, `scheduled_for`
  - [ ] `notifications`: базовая таблица с RLS для `auth.uid() = user_id`
  - [ ] (опц.) `telemetry`: RLS под `auth.uid()` или публичная запись по дизайну
- [ ] Проверить, что серверные вызовы используют `SUPABASE_SERVICE_ROLE_KEY` только на бекэнде
- [ ] Проверить, что `getAuthenticatedClient` валидирует токен и отдаёт локаль

## 3) Уведомления (push + email)

- [ ] Service Worker
  - [ ] `service-worker.js` собирается в `public/sw.js` (Next‑PWA: `swSrc: 'service-worker.js'`)
  - [ ] Регистрация в `ServiceWorkerRegistration.tsx` (`/sw.js`, scope `/`)
  - [ ] Обработчики `push` и `notificationclick` работают (deep link, действия)
- [ ] Push подписка
  - [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` задан; конвертация Base64Url → Uint8Array корректна
  - [ ] POST `/{locale}/api/notifications/subscribe` создаёт запись в `notification_subscriptions`
  - [ ] Деактивация дублей и сломанных подписок (статусы 403/404/410) работает
- [ ] Процессор очереди
  - [ ] Авторизация: `Bearer SUPABASE_SERVICE_ROLE_KEY` или `x-cron-secret`
  - [ ] Бэкофф при ошибках: экспонента 1m/2m/4m…; статус обновляется (`sent/failed/pending`)
  - [ ] Учитываются тихие часы при постановке в очередь (`queue/route.ts`)
- [ ] Еженедельный дайджест
  - [ ] Крон вызывает `/{locale}/api/notifications/digest` с `x-cron-secret`
  - [ ] Для Pro: добавляются краткие AI‑инсайты при наличии ключей
- [ ] Email‑канал (SMTP)
  - [ ] Auth‑почта (логин/сброс): в Supabase Dashboard → Authentication → Email → SMTP задан ваш провайдер (host/port/user/pass/from). Это покрывает письма входа, подтверждения, сброса.
  - [ ] Транзакционные письма (уведомления, дайджесты):
    - [ ] Определиться с провайдером (Nodemailer + SMTP, или Resend/SendGrid/SES).
    - [ ] Реализовать отправку письма в `processor/route.ts` при `send_email = true` (сейчас email‑канал не реализован; только push). 
    - [ ] Добавить шаблоны писем (минимум: заголовок, текст, CTA‑ссылки).
    - [ ] Логи и ретраи для email‑ошибок (аналог push backoff).

## 4) Платежи

- [ ] Checkout URL
  - [ ] Использовать `NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL` как основной путь (новая хостимая ссылка)
  - [ ] Фолбэк: `/api/checkout-url` POST создаёт чек‑аут и редиректит на `/{locale}/checkout/success`
- [ ] Webhooks
  - [x] HMAC‑подпись (`X-Signature`, hex) проверяется
  - [x] Обновление `user_metadata.subscription_status` в Supabase на событиях:
    - [x] `subscription_payment_success` → `pro`
    - [x] `subscription_cancelled` / `subscription_expired` → `free`
- [ ] UI: исчезновение `Upgrade` баннеров при `pro`, корректные текст/локаль на `payment` и `checkout/success`
- [ ] UI: Danger Zone — компонент «Unsubscribe» внизу настроек (только для Pro)
  - [ ] Рендерить только при `useSubscription() === 'pro'`
  - [ ] Локализация: `layout.dangerZone.title`, `layout.dangerZone.description`, `layout.dangerZone.cta`
  - [ ] Красная кнопка «Unsubscribe» с подтверждением действия
  - [ ] Вызов отмены подписки и обновление `user_metadata.subscription_status → 'free'`
  - [ ] Телеметрия: `unsubscribe_cta_clicked`, `unsubscribe_success`

## 5) PWA

- [ ] `next.config.js` — `next-pwa` включён, `swSrc: 'service-worker.js'`
- [ ] `public/manifest.json` содержит корректные иконки и ярлыки (shortcuts)
- [ ] Проверка на установку и оффлайн‑кэш (Lighthouse)

## 6) Телеметрия

- [ ] Таблица `telemetry`
- [ ] События:
  - [ ] `upgrade_cta_clicked` (есть в баннерах)
  - [ ] (опц.) `digest_generated`, `ai_limit_hit`, `ai_request_used`
- [ ] В проде запись включена, в деве — консоль лог

## 7) Онбординг

- [ ] Заменить `/draft.png` на реальные скриншоты в `public/`
- [ ] Обновить `src/components/onboarding/steps.ts` на актуальные изображения и тексты
- [ ] `user_metadata.onboarding_completed` выставляется, редирект работает

## 8) Смоук‑тесты перед релизом

- [ ] Аутентификация (email+пароль, Google): письма приходят (SMTP для Supabase Auth настроен), вход/сброс работает
- [ ] Push уведомления: подписка сохранена, очередь создаётся, процессор отправляет, уведомление кликается и открывает deep link
- [ ] Дайджест: крон вызывает, записи появляются, Pro‑инсайты добавляются при наличии ключей
- [ ] Платёж: Upgrade → чек‑аут → success‑страница → вебхук меняет `subscription_status` на `pro` → UI обновляется
- [ ] PWA: регистрация SW, оффлайн кэш, инсталляция
- [ ] Локали: корректные тексты для `payment`, `success`, уведомлений
- [ ] Кастомный тон ассистента: для Free выбор тона заблокирован в ToneSettings/ToneSelect/ChatInput и показан Upgrade‑CTA; для Pro выбор доступен, сохранение в `user_metadata.assistant_tone` и применение на сервере.

## 9) Наблюдаемость и алерты

- [ ] Логи в вебхуках и процессоре без PII
- [ ] Алерт на фейлы очереди (`failed > threshold`)
- [ ] Алерт на неправильную подпись вебхука и пропуски крон‑вызовов

---
Примечание: Email‑канал уведомлений пока не реализован в коде процессора — включите SMTP для auth‑писем в Supabase и добавьте транзакционную отправку в процессор/отдельный worker для полноценной поддержки email‑уведомлений.