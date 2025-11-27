# AI Chat — чеклист задач (Markdown, Presets, Chips)

- [ ] Включить полноценный Markdown рендер (react-markdown + remark-gfm)
  - Заменить `renderMarkdownLite` в `src/components/ai-assistant/ChatMessages.tsx` на `ReactMarkdown`.
  - Добавить поддержку списков, таблиц, заголовков; безопасный рендер через `rehype-sanitize`.
  - Стилизовать элементы: маркеры списков, таблицы (`th`, `td`), ссылки и кодовые блоки, чтобы текст не выглядел «сплошняком».

- [ ] Пустой экран: 2x2 Grid пресетов по центру
  - Обновить `src/components/ai-assistant/ChatPresets.tsx` / `src/components/ui-elements/PresetButtons.tsx` на `grid grid-cols-2` с равными карточками.
  - Центрировать блок пресетов в пустом состоянии на обеих поверхностях: `AIChatWindow` и страница `ai-assistant`.

- [ ] Чипсы подсказок над инпутом при наличии истории
  - Вынести ряд чипсов из `src/components/ai-assistant/AIChatWindow.tsx` в общий компонент (например, `PresetChipsRow`).
  - Подключить чипсы на странице `src/app/[locale]/(protected)/ai-assistant/page.tsx` над полем ввода.
  - Оформить горизонтальный скролл (`overflow-x-auto`) или небольшой `ScrollArea`-обёртку для единообразного поведения.

- [ ] QA-проверка
  - Протестировать сообщения со списками и таблицами, убедиться, что читаемость «как в буллетах».
  - Проверить рендер 2x2 пресетов на мобильных и десктопах.
  - Убедиться, что чипсы появляются только при наличии истории и не ломают верстку.