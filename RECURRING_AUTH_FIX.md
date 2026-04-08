# Fix: RecurringSync "Not authenticated" Error

**Date:** 8 April 2026  
**Issue:** RecurringSync component shows "Not authenticated" error on app load

## Problem

### Error in Console
```
[RecurringSync] Errors occurred: Array(1)
  0: "Not authenticated"
```

### Toast Error
```
Error
Not authenticated
```

### Root Cause

`RecurringSync` component was calling `processUserRecurringTransactions()` server action **immediately on mount**, before the user session was ready.

**Flow:**
1. App loads → `RecurringSync` mounts
2. `useEffect` runs immediately
3. Calls `processUserRecurringTransactions()` server action
4. Server action checks `supabase.auth.getUser()`
5. ❌ Session not ready yet → returns "Not authenticated"
6. Client shows error toast

## Solution

### Added Session Check

**File:** `src/components/recurring/RecurringSync.tsx`

**Changes:**
1. Import `UserAuth` context
2. Get `session` from context
3. Check `session?.user?.id` before calling server action
4. Add `session` to useEffect dependencies

### Before
```typescript
export function RecurringSync() {
  const { toast } = useToast();
  
  useEffect(() => {
    const syncRecurringTransactions = async () => {
      const result = await processUserRecurringTransactions(); // ❌ Called immediately
      // ...
    };
    
    syncRecurringTransactions();
  }, [toast, t, tCommon]);
}
```

### After
```typescript
export function RecurringSync() {
  const { toast } = useToast();
  const { session } = UserAuth(); // ✅ Get session
  
  useEffect(() => {
    const syncRecurringTransactions = async () => {
      // ✅ Wait for session
      if (!session?.user?.id) {
        console.log("[RecurringSync] No session yet, skipping sync");
        return;
      }
      
      console.log("[RecurringSync] Starting sync for user:", session.user.id);
      const result = await processUserRecurringTransactions();
      // ...
    };
    
    syncRecurringTransactions();
  }, [session, toast, t, tCommon]); // ✅ Added session dependency
}
```

## How It Works Now

1. **App loads** → `RecurringSync` mounts
2. **Session not ready** → Skip sync, log message
3. **Session becomes available** → useEffect re-runs (dependency changed)
4. **Session check passes** → Call server action
5. **Server action succeeds** → Generate recurring transactions
6. **Show toast** (if needed)

## Benefits

✅ No more "Not authenticated" errors  
✅ Sync waits for session to be ready  
✅ Proper logging for debugging  
✅ Clean user experience

## Testing

### Expected Behavior
1. Open app (logged in)
2. No error toast
3. Console shows: `[RecurringSync] Starting sync for user: <user_id>`
4. If recurring transactions are due: Toast shows count
5. Transactions created in database

### Expected Console Output
```
[RecurringSync] Starting sync for user: 068d444a-6dc0-41b1-9bcb-6c9a573d60cf
[RecurringSync] Result: {
  generated: 3,
  skipped: 0,
  shouldShowToast: true,
  errors: []
}
[RecurringSync] Showing multiple transactions toast: 3
```

## Files Changed

```
src/components/recurring/RecurringSync.tsx
RECURRING_AUTH_FIX.md
```

---

**Status:** Fixed  
**Ready to test:** Yes  
**Ready to commit:** Yes
