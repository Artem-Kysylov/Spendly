

### 🎨 Новый макет страницы Бюджетов

#### 1. Десктопная версия (Split View или Top-Down)
Тут у нас много места.
* **Секция 1 (Верхняя треть):** Аналитика.
    * Тот самый **Бар-чарт (Сравнение бюджетов)**. Он показывает общую картину: где мы вылезаем за лимиты.
* **Секция 2 (Остальное):** Сетка твоих карточек бюджетов.

#### 2. Мобильная версия (Stack)
Тут важно не заставлять юзера скроллить график каждый раз, чтобы увидеть свои кошельки.
* **Хедер:** Название "Бюджеты" + Кнопка "+" (или используем глобальный FAB).
* **Секция Аналитики (Складная):**
    * Используй паттерн **Collapsible (Аккордеон)**.
    * Заголовок: `📊 Анализ расходов [v]`.
    * По умолчанию: **Свернуто** (или показывается только 1 ключевая цифра, например "Общий лимит исчерпан на 40%").
    * При клике: Раскрывается Бар-чарт.
* **Секция Списка:** Твои прямоугольные карточки идут списком ниже сеткой 2  в ряд

---

### 📋 Чеклист для AI-IDE (Refactoring Budgets Page)

Скопируй этот блок. Здесь описан перенос графика и адаптация лейаута.

#### 🏗 Structure & Routing
* [ ] **No Analytics Page:** Do not create a separate `/analytics` route.
* [ ] **Move Component:** Move the `BudgetComparisonChart` (Bar Chart) component from the Dashboard/Analytics folder to the `Budgets` page module.

#### 📱 UI Layout (Mobile)
* [ ] **Collapsible Analytics:**
    * Wrap the `BudgetComparisonChart` in a `Collapsible` or `Accordion` component (shadcn).
    * **Default State:** Collapsed (Closed).
    * **Trigger:** A button/row text "📊 Show Analytics" or "Budget Overview".
* [ ] **Budget List:**
    * Render the existing budget cards below the collapsible section.
    * Ensure `pb-20` (padding bottom) to account for the Bottom Navigation Bar/FAB.

#### 🖥 UI Layout (Desktop)
* [ ] **Grid Layout:** Use a grid or flex-col layout.
    * Top Section: `BudgetComparisonChart` (Full width or contained).
    * Bottom Section: Grid of Budget Cards (2 cards per row).

#### 📊 Chart Refinement
* [ ] **Visual Consistency:**
    * Ensure the bars in the chart match the colors of the budget cards (if budgets have specific colors).
    * If not, use standard logic: Green (under limit), Yellow (close to limit), Red (over limit).
* [ ] **Interaction (Optional):**
    * Hovering over a bar in the chart could highlight the corresponding card in the list (if on Desktop).

