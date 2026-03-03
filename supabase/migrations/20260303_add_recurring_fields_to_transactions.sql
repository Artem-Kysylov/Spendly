-- Add recurring transaction fields to transactions table
-- This migration adds support for recurring/subscription transactions

-- Add is_recurring column (boolean, default false)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE NOT NULL;

-- Add recurrence_day column (integer 1-31, nullable)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS recurrence_day INTEGER CHECK (recurrence_day >= 1 AND recurrence_day <= 31);

-- Add index for efficient recurring transaction queries
CREATE INDEX IF NOT EXISTS idx_transactions_recurring 
ON transactions(user_id, is_recurring, recurrence_day) 
WHERE is_recurring = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN transactions.is_recurring IS 'Indicates if this transaction is a recurring/subscription transaction';
COMMENT ON COLUMN transactions.recurrence_day IS 'Day of month (1-31) when recurring transaction should be processed. NULL if not recurring.';
