# Dashboard Refactor Checklist

## 1. Header: Dynamic Greeting
- [ ] Implement time-based logic (Morning: 05-12, Afternoon: 12-18, Evening: 18-05).
- [ ] Create localization keys: `greeting.morning`, `greeting.afternoon`, `greeting.evening`.
- [ ] Replace static header with dynamic greeting: "{Greeting}, {UserName} 👋".
- [ ] Ensure responsive font sizes and animations match design.

## 2. KPI Cards Refactor (`CompactKPICard`)
- [ ] Create `CompactKPICard` component.
- [ ] Implement mobile layout: Horizontal scroll (`flex-row`, `overflow-x-auto`, `snap-x`).
- [ ] Implement desktop layout: Grid system (`grid-cols-3 gap-4`).
- [ ] **Card 1: Total Budget**
    - [ ] Show Title, Large Amount, Thin Progress Bar, "Spent / Total" text.
    - [ ] Remove redundant percentage text if visual bar is sufficient.
- [ ] **Card 2: Total Expenses**
    - [ ] Show Title, Large Amount, Trend Icon (e.g., "↘ 12%" in green/red).
    - [ ] Remove detailed descriptions like "vs last month".
- [ ] **Card 3: Daily Safe-to-Spend (NEW)**
    - [ ] Replace "Income" card.
    - [ ] Implement formula: `(Budget Limit - Total Expenses) / Days Left in Month`.
    - [ ] Handle negative values (red text, $0 floor if needed per requirements, but req says show negative).

## 3. AI Insight Teaser
- [ ] Create `useInsightHeuristics` hook.
    - [ ] Logic 1 (Critical): Budget > 90% spent -> Alert.
    - [ ] Logic 2 (Positive): Weekly expenses < last week -> Praise.
    - [ ] Logic 3 (Quiet Day): `today_transactions === 0` -> Savings.
    - [ ] Default: "Analyze your finances with Spendly Pal".
- [ ] Create `AiInsightTeaser` component.
    - [ ] Use `useInsightHeuristics` result.
    - [ ] Design: Compact banner, gradient border/bg, Sparkles icon.
    - [ ] Interaction: Click -> `router.push('/ai-assistant')`.
    - [ ] Add entrance animation.

## 4. Charts: Spending Dynamics
- [ ] Refactor `ChartsContainer` or create new simplified chart component.
- [ ] Remove Bar Charts ("Budget Comparison").
- [ ] Keep Single Line Chart (Spending Dynamics).
- [ ] Style: Sparkline aesthetic, hide grid lines (`CartesianGrid`), hide axes ticks if possible.
- [ ] Set minimal height (e.g., `h-[150px]`).

## 5. Recent Activity List
- [ ] Update `DashboardClient` to slice last 5 transactions.
- [ ] Refactor list item design: Icon + Title/Date + Amount.
- [ ] Remove table headers for this view.
- [ ] Ensure "Show all" button links to `/transactions`.
- [ ] Verify mobile vs desktop behavior (req says simplified list view, check if table is still needed for desktop or if this replaces it entirely. *Correction based on req*: "Mobile: ... Desktop: Grid system". Wait, req point 5 says "Use simplified list view...". Point 2 mentions desktop grid for cards. Point 5 doesn't explicitly separate mobile/desktop for the list, but current code has a split. I will assume simplified list for both or check if desktop needs full table. *Re-reading req*: "Desktop: Grid system" was for Cards. For List: "Use simplified list view". I will assume this applies to the dashboard widget, while full history is at `/transactions*).

## 6. Cleanup & Polish
- [ ] Verify all strings are localized (`t('key')`).
- [ ] Check Dark/Light mode contrast.
- [ ] Verify responsive behavior (mobile slider vs desktop grid).
- [ ] Ensure no unused code remains (old charts, old cards).
