# Recurring Transactions - Bug Fixes

**Дата:** 8 апреля 2026  
**Статус:** ✅ Исправлено

## 🐛 Обнаруженные проблемы

### 1. Поломанные ключи локализации в уведомлениях
**Симптом:** В in-app уведомлениях отображались сырые ключи `notifications.recurring.dueTodayTitle` и `notifications.recurring.message` вместо переведённого текста.

**Причина:** Старый API endpoint `/api/notifications/recurring/route.ts` создаёт уведомления-напоминания о recurring платежах, используя ключи `notifications.recurring.*`, которые отсутствовали в файлах локализации.

**Решение:** Добавлены недостающие ключи во все 7 локалей:
- `notifications.recurring.dueTodayTitle` - "Регулярный платёж сегодня: {name}"
- `notifications.recurring.dueSoonTitle` - "Скоро регулярный платёж: {name}"
- `notifications.recurring.message` - "Срок {date}. Примерно {amount}."

### 2. Транзакция не создалась
**Симптом:** Уведомление появилось, но транзакция в списке отсутствует.

**Причина:** Endpoint `/api/notifications/recurring` создаёт ТОЛЬКО уведомления-напоминания, но НЕ создаёт транзакции. Это старая система, которая работает параллельно с новой.

**Важно:** Новая система `generateRecurringTransactions` создаёт транзакции ТОЛЬКО когда `next_due_date <= TODAY`. Проверка базы показала:
- Ближайший recurring rule: Youtube premium (16 апреля 2026)
- Сегодня: 8 апреля 2026
- **Вывод:** Ни одна транзакция не должна была создаться сегодня

### 3. Toast при входе не сработал
**Симптом:** При входе в приложение не появился toast о добавленной транзакции.

**Причина:** Транзакция не была создана (см. п.2), поэтому toast правильно не показался.

**Улучшение:** Добавлено детальное логирование в `RecurringSync.tsx`:
```typescript
console.log("[RecurringSync] Starting sync...");
console.log("[RecurringSync] Result:", { generated, skipped, shouldShowToast, errors });
console.error("[RecurringSync] Errors occurred:", errors);
```

### 4. Кнопка "Открыть отчёт" в recurring уведомлениях
**Симптом:** В уведомлениях типа `reminder` (recurring) показывалась неуместная кнопка "Открыть отчёт".

**Решение:** 
- Убрана кнопка "Открыть отчёт" для recurring reminder уведомлений
- Добавлена новая кнопка "Посмотреть календарь" которая ведёт на `/dashboard`
- Кнопка показывается только если `notification.metadata.recurring_rule_id` существует

## ✅ Внесённые исправления

### 1. Локализация (7 языков)
**Файлы:** `src/locales/{en,ru,uk,ja,id,hi,ko}.json`

Добавлены ключи:
```json
{
  "notifications": {
    "recurring": {
      "dueTodayTitle": "...",
      "dueSoonTitle": "...",
      "message": "..."
    },
    "bell": {
      "actions": {
        "viewCalendar": "..."
      }
    }
  }
}
```

### 2. Улучшен RecurringSync компонент
**Файл:** `src/components/recurring/RecurringSync.tsx`

**Изменения:**
- ✅ Добавлено детальное console.log логирование
- ✅ Добавлена обработка ошибок с toast.error
- ✅ Изменён variant с "success" на "default" для toast
- ✅ Добавлен tCommon для error messages

### 3. Обновлён NotificationBell
**Файл:** `src/components/ui-elements/NotificationBell.tsx`

**Изменения:**
- ✅ Убрана кнопка "Открыть отчёт" для типа `reminder`
- ✅ Добавлена кнопка "Посмотреть календарь" для recurring reminders
- ✅ Кнопка показывается только если `notification.metadata.recurring_rule_id` существует

## 🔍 Диагностика через MCP

### База данных (8 апреля 2026)
```sql
-- Последнее уведомление
type: "reminder"
title: "notifications.recurring.dueTodayTitle"  ❌ (поломанный ключ)
message: "notifications.recurring.message"       ❌ (поломанный ключ)
created_at: 2026-04-07 16:41:31

-- Транзакции сегодня
COUNT: 0  ✅ (корректно, т.к. нет due recurring rules)

-- Recurring rules
Ближайший: Youtube premium (next_due_date: 2026-04-16)
```

## 📊 Статистика изменений

| Метрика | Значение |
|---------|----------|
| Файлов изменено | 10 |
| Локалей обновлено | 7 |
| Ключей добавлено | 4 × 7 = 28 |
| Компонентов улучшено | 2 |

## 🎯 Результат

### ✅ Исправлено
1. Поломанные ключи локализации в уведомлениях
2. Логирование в RecurringSync для отладки
3. Обработка ошибок с toast.error
4. Кнопка "Открыть отчёт" заменена на "Посмотреть календарь" для recurring

### ℹ️ Пояснение
- Транзакция **не должна была создаться** сегодня (8 апреля), т.к. ближайший recurring rule - 16 апреля
- Toast **правильно не показался**, т.к. транзакция не создавалась
- Уведомление-напоминание создалось из **старого API** `/api/notifications/recurring`, который работает независимо от новой системы

## 🔄 Две системы recurring

### Старая система (НЕ создаёт транзакции)
- **Endpoint:** `/api/notifications/recurring/route.ts`
- **Функция:** Создаёт уведомления-напоминания о предстоящих платежах
- **Когда:** Когда `next_due_date <= today` или `next_due_date <= today + 3 days`
- **Что делает:** Только добавляет запись в `notifications` таблицу
- **Проблема:** Использовала несуществующие ключи локализации

### Новая система (Создаёт транзакции)
- **Функция:** `generateRecurringTransactions.ts`
- **Триггеры:** Cron (каждый час) + RecurringSync (при входе)
- **Когда:** Когда `next_due_date <= today` И `last_generated_date IS NULL` или старая
- **Что делает:** 
  1. Создаёт транзакцию в `transactions`
  2. Обновляет `last_generated_date` и `next_due_date`
  3. Ставит push notification в очередь (если enabled)
  4. Показывает toast (если push disabled/failed)

## 🧪 Тестирование

### Как протестировать исправления

1. **Проверка локализации:**
   - Дождаться 16 апреля 2026 (Youtube premium due date)
   - Проверить, что уведомление показывает переведённый текст, а не ключи

2. **Проверка создания транзакции:**
   - 16 апреля должна создаться транзакция "Youtube premium" (350)
   - Проверить в списке транзакций
   - Проверить toast при входе (если push disabled)

3. **Проверка логирования:**
   - Открыть DevTools Console
   - Войти в приложение
   - Проверить логи `[RecurringSync]`

4. **Проверка кнопки в уведомлении:**
   - Открыть уведомления (колокольчик)
   - Найти recurring reminder
   - Проверить наличие кнопки "Посмотреть календарь"
   - Кликнуть → должен открыться dashboard

## 📝 Рекомендации

1. **Объединить две системы:** Рассмотреть возможность удаления старого `/api/notifications/recurring` endpoint и использовать только новую систему `generateRecurringTransactions`

2. **Улучшить уведомления:** Вместо reminder-уведомления о предстоящем платеже, показывать уведомление ПОСЛЕ создания транзакции

3. **Мониторинг:** Следить за логами `[RecurringSync]` в production для выявления проблем

---

**Готово к тестированию!** 🎉
