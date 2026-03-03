-- Migration: Patch main_budget_state schema drift (add missing columns)
-- Date: 2026-03-03

ALTER TABLE public.main_budget_state
  ADD COLUMN IF NOT EXISTS income_confirmed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.main_budget_state
  ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMPTZ;

COMMENT ON COLUMN public.main_budget_state.income_confirmed IS 'Whether user confirmed income for current cycle';
COMMENT ON COLUMN public.main_budget_state.snooze_until IS 'Timestamp until which income confirmation banner is snoozed';
