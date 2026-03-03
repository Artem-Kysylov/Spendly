# Database Migrations

## How to Apply Migrations

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/gzqrfzfhbqrqsqnwqbqm
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `20260303_add_budget_reset_day.sql`
   - `20260303_create_main_budget_state.sql`

## Migration Files

### 20260303_add_budget_reset_day.sql
Adds `budget_reset_day` and `enable_income_confirmation` columns to the `profiles` table.

### 20260303_create_main_budget_state.sql
Creates the `main_budget_state` table for tracking budget cycles and rollover amounts.

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
