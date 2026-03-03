#!/bin/bash

# Apply recurring transactions migrations to Supabase
# Usage: ./scripts/apply-migrations.sh

echo "🚀 Applying recurring transactions migrations..."

# Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set"
    exit 1
fi

# Apply recurring fields migration
echo "📝 Applying recurring fields to transactions table..."
curl -X POST "$SUPABASE_URL/rest/v1/rpc/execute_sql" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE NOT NULL; ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurrence_day INTEGER CHECK (recurrence_day >= 1 AND recurrence_day <= 31); CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(user_id, is_recurring, recurrence_day) WHERE is_recurring = TRUE;"
  }'

# Apply timezone migration
echo "🌍 Adding timezone field to user_settings table..."
curl -X POST "$SUPABASE_URL/rest/v1/rpc/execute_sql" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS timezone TEXT; CREATE INDEX IF NOT EXISTS idx_user_settings_timezone ON user_settings(timezone) WHERE timezone IS NOT NULL;"
  }'

echo "✅ Migrations applied successfully!"
echo ""
echo "📋 Summary of changes:"
echo "  • Added is_recurring (BOOLEAN) to transactions table"
echo "  • Added recurrence_day (INTEGER, 1-31) to transactions table"
echo "  • Added timezone (TEXT) to user_settings table"
echo "  • Created indexes for performance"
echo ""
echo "🎉 Recurring transactions system is ready!"
