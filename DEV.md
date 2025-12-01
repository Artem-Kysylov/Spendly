LLM Debug:
- Set LLM_DEBUG=1 to enable console diagnostics for OpenAI/Gemini calls.
- Pre-call: requestId, provider, model, promptLengthChars, approxTokens, parts lengths.
- Post-call: candidates count, parts lengths, blockReason, safetyRatings (Gemini), SSE lines and total text length (OpenAI).

Health-check:
- GET /api/llm/health responds with { ok, provider, model, durationMs, requestId, error?, blockReason? }.
- Chooses provider based on AI_PROVIDER and available API keys.

Block handling:
- Gemini empty candidates inject a readable message including Blocked: <reason>.
- Client replaces provider technical text with a friendly tip.

Canonical empty replies:
- If the user asks for "this week" or "last week" and no expenses recorded, reply immediately:
  - "No expenses recorded this week." / "No expenses recorded last week."
- Logged under [LLM_DEBUG canonical] with period and totals.

Mini-metrics:
- Usage rows include success/failure, prompt and response length.
- Additional LLM_DEBUG logs include durationMs (health-check) and requestId to correlate.

Risks and rollback:
- If provider instability leads to frequent blocks: fallback to canonical or reduce prompt complexity.
- Toggle AI_PROVIDER to switch providers quickly.
- Disable limits by setting enableLimits=false for debugging, or reduce FREE_DAILY_LIMIT for stricter throttling.


## Recurring Rules / DB

- Ensure `pgcrypto` and `recurring_rules` exist (run SQL in Supabase SQL Editor).
- RLS is required for client-side CRUD; policies enforce `user_id = auth.uid()`.
- Unique key: `(user_id, title_pattern)`, so upsert will overwrite by pattern.
- Client UI: see `src/components/user-settings/RecurringRulesSettings.tsx`.

## Tests / Perf

- Unit tests for recurring heuristics: `src/lib/ai/__tests__/recurring.test.ts`.
- To set up a runner quickly: add Vitest and run `npm run test` (optional).
- Health-check endpoint `/api/llm/health` logs duration and provider.
- For perf, enable `LLM_DEBUG=1` and inspect SSE length, durations.

## Stacked Sheets (Drawer vs Dialog)

- Mobile: формы транзакций/бюджетов рендерим как full‑screen `Sheet` (`h-[95dvh]`, `overflow-y-auto`, `pb-[env(safe-area-inset-bottom)]`, `z-[10000]`).
- Desktop: сохраняем `Dialog` без изменений.
- Вложенный календарь в `HybridDatePicker`:
  - Mobile: отдельная шторка `Sheet` поверх формы (`z-[10010]`), lazy‑load `Calendar`.
  - Desktop: `Popover` рядом с модалкой, календарь грузится лениво при открытии.
- Фокус: при открытии вложенной шторки переносим фокус внутрь, при закрытии — возвращаем на поле даты.
- Фича‑флаг: `NEXT_PUBLIC_ENABLE_MOBILE_SHEETS=true|false` — быстро отключить drawer‑режим на мобайле.
- d/vh: используем `dvh` для корректного поведения с мобильной клавиатурой.