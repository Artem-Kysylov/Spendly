-- Migration: Create main_budget_state table for cycle tracking
-- Date: 2026-03-03

-- Create main_budget_state table
CREATE TABLE IF NOT EXISTS main_budget_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_start_date DATE NOT NULL,
  carryover NUMERIC DEFAULT 0,
  last_base_budget NUMERIC DEFAULT 0,
  income_confirmed BOOLEAN DEFAULT false,
  snooze_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE main_budget_state IS 'Tracks budget cycle state and rollover for each user';
COMMENT ON COLUMN main_budget_state.cycle_start_date IS 'Current cycle start date (YYYY-MM-DD)';
COMMENT ON COLUMN main_budget_state.carryover IS 'Rollover amount from previous cycle (positive or negative)';
COMMENT ON COLUMN main_budget_state.last_base_budget IS 'Previous cycle target budget for accurate carryover calculation';
COMMENT ON COLUMN main_budget_state.income_confirmed IS 'Whether user confirmed income for current cycle';
COMMENT ON COLUMN main_budget_state.snooze_until IS 'Timestamp until which income confirmation banner is snoozed';

-- Enable RLS
ALTER TABLE main_budget_state ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own row
CREATE POLICY "Users can view their own budget state"
  ON main_budget_state
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own row
CREATE POLICY "Users can insert their own budget state"
  ON main_budget_state
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own row
CREATE POLICY "Users can update their own budget state"
  ON main_budget_state
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_main_budget_state_user_id ON main_budget_state(user_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_main_budget_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_main_budget_state_updated_at
  BEFORE UPDATE ON main_budget_state
  FOR EACH ROW
  EXECUTE FUNCTION update_main_budget_state_updated_at();
