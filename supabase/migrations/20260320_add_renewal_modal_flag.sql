-- Migration: Add has_seen_renewal_modal to main_budget_state
-- Date: 2026-03-20
-- Purpose: Track if user has seen the budget renewal modal for current cycle

-- Add has_seen_renewal_modal column to main_budget_state table
ALTER TABLE main_budget_state 
ADD COLUMN IF NOT EXISTS has_seen_renewal_modal BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN main_budget_state.has_seen_renewal_modal IS 'Whether user has seen the budget renewal modal for the current cycle';

-- Update existing rows to set has_seen_renewal_modal = false (safe default)
UPDATE main_budget_state 
SET has_seen_renewal_modal = false 
WHERE has_seen_renewal_modal IS NULL;
