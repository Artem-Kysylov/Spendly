Transactions table

4. Таблица транзакций (Адаптация под Мобайл)
Цель: Читаемость списка на узком экране.
 * [ ] Conditional Rendering:
   * Для Desktop (hidden md:block): Рендерить текущий компонент DataTable.
   * Для Mobile (block md:hidden): Рендерить новый компонент списка карточек.
 * [ ] Компонент MobileTransactionCard:
   * Верстка: Flexbox (row).
   * Слева: Avatar/Icon категории (круглый).
   * Центр (Stack): Название (font-medium, truncate) сверху, Дата + Категория (text-muted-foreground, text-xs) снизу.
   * Справа: Сумма (font-bold). Цвет текста: красный для расхода, зеленый для дохода.
 * [ ] Swipe Actions (Опционально): Добавить возможность свайпа влево для удаления (или кнопку "Три точки" в каждой карточке).