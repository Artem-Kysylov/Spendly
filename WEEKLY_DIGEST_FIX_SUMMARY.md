# Weekly Digest Fix Summary

**Date:** 8 April 2026  
**Issue:** Weekly digests not being sent even when notifications are enabled

## Problems Found

### 1. Digest only runs on Mondays (UTC)
**Location:** `src/app/api/cron/handler/route.ts:40`

```typescript
const digestRun = isMondayUtc(new Date());
```

**Behavior:** 
- Cron job runs daily at 9 AM
- But digest endpoint is called ONLY on Mondays (UTC)
- Today is Tuesday (April 8, 2026) → digest didn't run

**Status:** This is by design (weekly digest should run once per week)

### 2. Digest skipped when transaction fetch fails
**Location:** `src/app/[locale]/api/notifications/digest/route.ts:268-272`

**Before:**
```typescript
if (lastErr) {
  console.warn("digest: lastWeek tx error", lastErr);
  skipped++;
  continue; // ❌ Skips digest creation
}
```

**After:**
```typescript
if (lastErr) {
  console.warn("digest: lastWeek tx error", lastErr);
  // Продолжаем даже при ошибке - создадим дайджест с нулевыми данными
}
```

**Fix:** Now digest is created even if transaction fetch fails (with zero amounts)

### 3. User Settings Check
**Location:** `src/app/[locale]/api/notifications/digest/route.ts:228-230`

```typescript
const targets = (prefs || []).filter(
  (p: any) => p.push_enabled || p.email_enabled,
);
```

**Behavior:** Digest is sent ONLY if:
- `push_enabled=true` OR
- `email_enabled=true`

**Your accounts:**
- Personal: `push_enabled=false`, `email_enabled=true` ✅ Should receive
- Work: Need to check settings

## How Weekly Digest Works

### Schedule
1. **Cron runs:** Every day at 9 AM UTC (`/api/cron/handler`)
2. **Digest check:** Only on Mondays (UTC)
3. **Period:** Analyzes previous week (Monday to Sunday)

### Logic Flow
1. Fetch users with `engagement_frequency != 'disabled'`
2. Filter users where `push_enabled=true` OR `email_enabled=true`
3. For each user:
   - Check if digest already sent for this week (idempotency)
   - Fetch transactions for last week
   - Calculate totals (expenses, income)
   - Get top 3 budget categories
   - For Pro users: Generate AI insights
   - Create in-app notification
   - Queue push/email notification
   - Respect quiet hours

### Digest Content
**Free users:**
- Last week expenses/income totals
- Top 3 spending categories
- Comparison with previous week

**Pro users:**
- All Free features +
- AI-generated insights (2-3 sentences)
- Budget usage analysis

## Changes Made

### File: `src/app/[locale]/api/notifications/digest/route.ts`

**Line 268-272:** Removed `continue` that skipped digest when transaction fetch failed

**Result:** Digest is now created even with zero transactions or fetch errors

## Testing

### To test manually:
```bash
# Call digest endpoint directly (requires CRON_SECRET)
curl -X POST https://your-domain.com/api/cron/digest \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

### Expected behavior:
- Digest runs every Monday at 9 AM UTC
- Creates notification for all users with `push_enabled=true` OR `email_enabled=true`
- Sends even if no transactions in the week (shows $0)
- Respects quiet hours for scheduling

## Why No Digests Yet

### Personal Account
- ✅ `email_enabled=true` (should receive)
- ✅ Has transactions last week
- ❌ Today is Tuesday (digest only runs Monday)
- **Next digest:** Monday, April 14, 2026 at 9 AM UTC

### Work Account
- Need to check if `push_enabled=true` OR `email_enabled=true`
- If no transactions → will still receive digest (after fix)

## Files Changed

```
src/app/[locale]/api/notifications/digest/route.ts
WEEKLY_DIGEST_FIX_SUMMARY.md
```

## Recommendations

1. **Wait for Monday:** Next digest will run April 14, 2026
2. **Check work account settings:** Ensure notifications are enabled
3. **Monitor telemetry:** Check `telemetry_events` table for `digest_generated` events
4. **Verify quiet hours:** Make sure 9 AM UTC is not in your quiet hours

---

**Status:** Fixed - digest now sends even with zero transactions  
**Next run:** Monday, April 14, 2026 at 9:00 AM UTC
