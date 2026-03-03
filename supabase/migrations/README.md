# Database Migrations

## How to Apply Migrations

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/rukjecqqejjeswarzvam
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `20260303_add_budget_reset_day.sql`
   - `20260303_create_main_budget_state.sql`
   - `20260303_patch_main_budget_state_schema_drift.sql`

## Migration Files

### 20260303_add_budget_reset_day.sql
Adds `budget_reset_day` and `enable_income_confirmation` columns to the `profiles` table.

### 20260303_create_main_budget_state.sql
Creates the `main_budget_state` table for tracking budget cycles and rollover amounts.

### 20260303_patch_main_budget_state_schema_drift.sql
Adds missing columns to `main_budget_state` if the table already existed from an older version.

## Verification

After running migrations, verify with:

```sql
-- Check profiles columns
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('budget_reset_day', 'enable_income_confirmation');

-- Check main_budget_state table
SELECT * FROM main_budget_state LIMIT 1;
```
