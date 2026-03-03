-- Add timezone field to user_settings table
-- This is needed to process recurring transactions at 9am local time

-- Add timezone column (text, nullable, will be auto-detected on first recurring transaction)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Add index for efficient timezone-based queries
CREATE INDEX IF NOT EXISTS idx_user_settings_timezone 
ON user_settings(timezone) 
WHERE timezone IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_settings.timezone IS 'User timezone (IANA format, e.g. "America/New_York") for processing recurring transactions at 9am local time';
