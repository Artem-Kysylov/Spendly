# Платежи (Lemon Squeezy) — продакшен чеклист

Этот документ фиксирует, что нужно сделать для корректной работы оплаты в продакшене, и что уже готово в дев-окружении.

## Окружение и переменные

В `.env/.env.local` должны быть заданы:
- `LEMON_SQUEEZY_STORE_ID` — ID магазина в Lemon Squeezy.
- `LEMON_SQUEEZY_PRO_VARIANT_ID` — ID варианта (подписки Pro).
- `NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL` — публичный UUID‑чекаут URL.
- `LEMON_SQUEEZY_API_KEY` — API‑ключ Lemon Squeezy.
- `LEMON_SQUEEZY_WEBHOOK_SECRET` — секрет для подписи вебхуков (6–40 символов, совпадает с секретом в настройках вебхука).

## Вебхуки

- Callback URL: `https://<ваш-домен>/api/webhooks`
- События (минимальный набор):
  - `order_created`
  - `subscription_created`
  - `subscription_payment_success`
  - `subscription_payment_failed`
  - `subscription_cancelled`
  - `subscription_expired`
  - `subscription_updated`
- Секрет подписи (`Signing secret`): сильная случайная строка, 32–40 символов; должен быть одинаковым в Dashboard и переменной `LEMON_SQUEEZY_WEBHOOK_SECRET`.

Серверный обработчик: `src/app/api/webhooks/route.ts` — проверяет заголовок `X-Signature` (HMAC SHA‑256) и логирует `meta.event_name`.

## Генерация боевого checkout URL

- В продакшене генерируем новый checkout через API:
  - `preview: false` (или не указывать `preview`)
  - `redirect_url`: на реальный домен (`https://<ваш-домен>/checkout/success`)
- Берем значение `data.attributes.url` из ответа API и пишем его в `NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL`.
- Перезапускаем приложение (и обновляем переменные на прод‑платформе деплоя).

Примечание: локальные туннели (например, `loca.lt`) подходят только для дев‑режима; браузерные редиректы на `loca.lt` могут требовать “tunnel password” и отдавать `401` для посетителей [1].

## Бизнес‑логика активации Pro

В продакшене нужно:
- На `subscription_payment_success` активировать Pro у пользователя.
- На `subscription_cancelled`/`subscription_expired` деактивировать Pro.
- Надежно связать событие Lemon Squeezy с нашим пользователем (обычно по email из заказа/подписки).
- Обновлять `user_metadata.isPro` в Supabase (требует service role key) или хранить флаг в нашей таблице `users` и читать его на клиенте.
- Добавить идемпотентность обработки (защита от повторных вебхуков по одному событию).

## Наблюдаемость и безопасность

- Вести минимальные логи (без PII), хранить `event_id`/`created_at`.
- Таймауты/ретраи: вебхуки могут приходить повторно.
- Ограничения по входящим IP не включать, пока нет белых списков.
- В проде использовать стабильный публичный домен и HTTPS.

## Что уже готово в дев‑окружении

- Публичный checkout URL (тестовый) сохранен в `NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL`.
- Вебхук настроен с `Callback URL` и секретом.
- Обработчик `/api/webhooks` есть и валидирует `X‑Signature`.

## Что осталось сделать для продакшена

1) Реализовать активацию/деактивацию Pro в `src/app/api/webhooks/route.ts`.
2) Создать страницу `GET /checkout/success` (подтверждение оплаты, QA‑точка).
3) Сгенерировать боевой checkout URL (`preview: false`) и заменить `NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL`.
4) Перенести и проверить все env‑переменные на прод‑среде деплоя.
5) Проверить доставку вебхуков с прод‑домена (логирование, идемпотентность).
6) Провести E2E тест с реальной оплатой (не test_mode), убедиться в включении Pro.

## Тестовая оплата в дев‑режиме

- Можно открыть текущий checkout URL из `.env.local` и пройти тестовую оплату.
- После оплаты вебхуки должны дойти до `/api/webhooks` и быть залогированы.
- Из‑за `loca.lt` редирект на страницу успеха может показать промежуточную страницу с паролем и вернуть `401` для браузера [1]; это не влияет на доставку вебхуков.

До реализации активации/деактивации Pro тест не изменит план пользователя автоматически. Для временной проверки UI можно поставить локальный флаг `localStorage.setItem('spendly_is_pro', 'true')`, но в продакшене нужен серверный апдейт статуса.

---

[1] LocalTunnel предупреждение и требование “tunnel password” для браузеров: https://weak-oranges-burn.loca.lt/checkout/success

## После деплоя: полный прод-чеклист
- Переключить checkout на прод: `preview: false`, `redirect_url` → `https://<ваш-домен>/checkout/success`.
- Сгенерировать новый `data.attributes.url` и обновить `NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL`.
- Реализовать активацию/деактивацию Pro в `/api/webhooks`:
  - Активировать на `subscription_payment_success`, деактивировать на `subscription_cancelled`/`subscription_expired`.
  - Связать событие с пользователем (обычно по email из заказа/подписки).
  - Идемпотентность: не обрабатывать одно событие дважды.
  - Обновлять флаг Pro в БД (например, `users.is_pro` или `user_metadata.isPro` через Supabase Admin).
- Добавить “Управление подпиской” (линк на страницу подписки/портал, если будет использован).
- Логирование/метрики: статус обработки вебхуков, ошибки, ретраи.
- Подтвердить, что все env переменные перенесены в прод‑окружение деплоя:
  - `LEMON_SQUEEZY_STORE_ID`
  - `LEMON_SQUEEZY_PRO_VARIANT_ID`
  - `NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL`
  - `LEMON_SQUEEZY_API_KEY`
  - `LEMON_SQUEEZY_WEBHOOK_SECRET`

## Sandbox‑чеклист (проверка сейчас)
1) Убедиться, что заданы env:
   - `LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_PRO_VARIANT_ID`, `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_WEBHOOK_SECRET`, `NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL`.
2) Запустить публичный URL (например, `npx localtunnel --port 3000`) и держать туннель открытым.
3) В Lemon Squeezy: `Callback URL` → `https://<публичный-URL>/api/webhooks`, секрет 6–40 символов.
4) Открыть страницу /payment, нажать “Upgrade to Pro”, пройти тестовую оплату (в режиме `test_mode`).
5) Проверить, что вебхук приходит и валидируется: `/api/webhooks` отвечает `200 OK`, в логах виден `meta.event_name`.
6) Проверить редирект на `/checkout/success` и кнопку возврата на дашборд.
7) Важно: автоматическая активация Pro пока не включена — это запланировано на финал прод‑настройки.

## Статус задачи
- Вебхуки и редирект настроены, sandbox‑проверка возможна.
- Оставшиеся шаги по Pro (активация/деактивация, идемпотентность, управление подпиской) выполнены после деплоя.