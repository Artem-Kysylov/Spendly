-- Migration: Add budget_reset_day and enable_income_confirmation to profiles
-- Date: 2026-03-03

-- Add budget_reset_day column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS budget_reset_day INTEGER DEFAULT 1 CHECK (budget_reset_day >= 1 AND budget_reset_day <= 31);

-- Add enable_income_confirmation column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS enable_income_confirmation BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN profiles.budget_reset_day IS 'Day of month when budget cycle resets (1-31)';
COMMENT ON COLUMN profiles.enable_income_confirmation IS 'Enable income confirmation banner on cycle reset';

-- Update existing users to have budget_reset_day = 1 (safe default)
UPDATE profiles 
SET budget_reset_day = 1 
WHERE budget_reset_day IS NULL;
