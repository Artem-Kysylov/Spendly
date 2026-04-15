# CLAUDE.md | Project Intelligence & Constraints

## Project-Specific Mission: Spendly
- **Primary Goal:** Secure, localized AI financial tracking.
- **Priority:** Strict adherence to RLS (Row Level Security) and PWA mobile-first standards.
- **Localization:** 7-language sync is MANDATORY. Never update one locale without the others.
- **DB Focus:** Use `supabase-spendly` MCP for transaction schemas and AI-insights data.

## Token Efficiency & Economy
- **Context Limit:** Never read the entire directory. Only request specific files relevant to the current task.
- **Surgical Output:** Provide only the changed lines of code. Do not output unchanged parts of a file.
- **Think First:** Spend more tokens on "Thinking Process" to avoid expensive code-generation retries.

## Environment & Tech
- **Stack:** Next.js (App Router), TS, Tailwind, Supabase.
- **Hardware:** MacBook Air M1 (8GB RAM). Avoid memory-intensive background processes.
- **Strict Rules:** No `any` types. Strict TS only. Functional components only.

## Build & Dev Commands
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Type Check: `npm run type-check`

## Code Style Mandates
- **Surgical Edits:** Use precise line replacements.
- **Reuse:** Audit `@/components` before creating new ones.
- **Localization:** For Spendly, if UI text changes, you MUST update all 7 JSON files in `/messages/`.
