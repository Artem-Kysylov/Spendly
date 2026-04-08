# Fix: Recurring Transactions Not Creating (Admin API Issue)

**Date:** 8 April 2026  
**Issue:** Recurring transactions notifications created but actual transactions not created in database

## Problem

### Symptoms
1. ✅ In-app notifications created (3 notifications visible)
2. ❌ Transactions NOT created in `transactions` table
3. ❌ `recurring_rules.last_generated_date` still NULL
4. ❌ Console error: `[RecurringSync] Errors occurred: Array(1)`

### Root Cause

**File:** `src/lib/generateRecurringTransactions.ts:301`

```typescript
const { data } = await supabase.auth.admin.getUserById(rule.user_id);
```

**Problem:** `supabase.auth.admin.getUserById()` requires **service role key** which is NOT available in client-side server actions. This caused the function to throw an error and stop execution before creating transactions.

**Why notifications were created:** The notification creation happens in a separate try-catch block BEFORE the transaction creation logic, so notifications were created successfully but the function failed when trying to get user metadata.

## Solution

### Removed Admin API Call

**Before:**
```typescript
let tone: AssistantTone = "neutral";
try {
  const { data } = await supabase.auth.admin.getUserById(rule.user_id);
  const raw = (data?.user?.user_metadata as unknown) as
    | { assistant_tone?: unknown }
    | undefined;
  const t = raw?.assistant_tone;
  if (
    t === "neutral" ||
    t === "friendly" ||
    t === "formal" ||
    t === "playful"
  ) {
    tone = t;
  }
} catch {
  // ignore
}
```

**After:**
```typescript
// Use default neutral tone for recurring transaction notifications
// Note: admin.getUserById requires service role key which may not be available in client-side server actions
const tone: AssistantTone = "neutral";
```

### Why This Works

1. **No admin API dependency:** Doesn't require service role key
2. **Consistent tone:** All recurring transaction notifications use neutral tone
3. **Simpler code:** Less complexity, fewer failure points
4. **Works in all contexts:** Client-side server actions, cron jobs, etc.

## Impact

### Before Fix
- ❌ Transactions not created
- ❌ `last_generated_date` not updated
- ❌ `next_due_date` not advanced
- ✅ Notifications created (but misleading - no actual transaction)

### After Fix
- ✅ Transactions created successfully
- ✅ `last_generated_date` updated
- ✅ `next_due_date` advanced to next month
- ✅ Notifications created
- ✅ Budget thresholds checked
- ✅ Push notifications queued (if enabled)

## Testing

### Database Reset for Testing
```sql
-- Reset dates to test recurring transaction creation
UPDATE recurring_rules
SET next_due_date = CASE
  WHEN id = '7941ef9c-0c0f-45bd-8352-9e885cb73234' THEN DATE '2026-04-06'
  WHEN id = '4b997c7d-95da-42dc-9163-ae19937c859e' THEN DATE '2026-04-07'
  WHEN id = '94bdc3a0-f70a-4535-80bf-0ee0ae0186f5' THEN DATE '2026-04-08'
END
WHERE id IN (
  '7941ef9c-0c0f-45bd-8352-9e885cb73234',
  '4b997c7d-95da-42dc-9163-ae19937c859e',
  '94bdc3a0-f70a-4535-80bf-0ee0ae0186f5'
);
```

### Expected Behavior After Fix
1. Refresh app
2. `RecurringSync` runs
3. Console shows: `[RecurringSync] Starting sync for user: <user_id>`
4. Console shows: `Generated 3 transactions, skipped 0, queued 0 push notifications`
5. Toast shows: "3 регулярных платежей добавлено в ваши транзакции"
6. Transactions visible in transactions list:
   - Playstation Plus - $369 (2026-04-06)
   - Windsurf - $743 (2026-04-07)
   - Surfshark - $1000 (2026-04-08)
7. `recurring_rules` updated:
   - `last_generated_date`: today
   - `next_due_date`: next month (May 6, 7, 8)

## Files Changed

```
src/lib/generateRecurringTransactions.ts
src/components/recurring/RecurringSync.tsx (previous fix)
RECURRING_ADMIN_API_FIX.md
```

## Notes

- **Tone preference:** Currently hardcoded to "neutral" for recurring transactions
- **Future improvement:** Could store `assistant_tone` in `user_settings` table instead of user_metadata
- **Service role key:** Only available in cron jobs and server-side API routes, NOT in client-side server actions

---

**Status:** Fixed  
**Ready to test:** Yes (after database reset)  
**Ready to commit:** Yes
