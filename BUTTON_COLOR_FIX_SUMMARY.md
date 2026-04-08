# Fix: Remove expense/income color logic from buttons

**Date:** 8 April 2026  
**Request:** Remove expense/income color logic from budget creation/editing modals and use primary colors only

## Problem
Buttons and tabs were changing colors based on transaction/budget type:
- **Expense:** Red colors (`bg-error`, `text-error-foreground`)
- **Income:** Green colors (`bg-success`, `text-success-foreground`)

**Request:** Always use primary colors regardless of type, respecting the theme.

## Files Changed

### 1. BudgetForm.tsx
**Changes:**
- Removed `data-[state=active]:bg-error` and `data-[state=active]:bg-success` from TabsTrigger
- Removed `type === "expense" ? "bg-error text-error-foreground" : "bg-success text-success-foreground"` from submit button
- Now uses default primary colors

### 2. EditTransactionModal.tsx
**Changes:**
- Removed `data-[state=active]:bg-error` and `data-[state=active]:bg-success` from TabsTrigger
- Removed `type === "expense" ? "bg-error text-error-foreground" : "bg-success text-success-foreground"` from submit button
- Now uses default primary colors

### 3. chunks/Form.tsx
**Changes:**
- Changed expense radio button from `bg-error text-error-foreground border-error` to `bg-primary text-primary-foreground border-primary`
- Changed income radio button from `bg-success text-success-foreground border-success` to `bg-primary text-primary-foreground border-primary`
- Now both use primary colors when selected

### 4. TransactionForm.tsx
**Changes:**
- Removed `data-[state=active]:bg-error` and `data-[state=active]:bg-success` from TabsTrigger
- Now uses default primary colors

### 5. ui-elements/RadioButton.tsx
**Changes:**
- Removed conditional logic: `variant === "expense" ? "bg-error..." : "bg-success..."`
- Now always uses `bg-primary text-primary-foreground border-primary` when selected
- Works for any variant (expense/income) with same primary colors

## Before vs After

### Before
```tsx
// Tabs
className="data-[state=active]:bg-error data-[state=active]:text-error-foreground" // expense
className="data-[state=active]:bg-success data-[state=active]:text-success-foreground" // income

// Buttons
className={`w-full ${type === "expense" ? "bg-error text-error-foreground" : "bg-success text-success-foreground"}`}

// Radio buttons
variant === "expense" ? "bg-error text-error-foreground border-error" : "bg-success text-success-foreground border-success"
```

### After
```tsx
// Tabs - no custom colors, uses default primary
className="" // uses default primary colors

// Buttons - no custom colors
className="w-full" // uses default primary colors

// Radio buttons - always primary
className="bg-primary text-primary-foreground border-primary"
```

## Result

All buttons, tabs, and radio buttons now:
- Use primary colors when active/selected
- Respect the current theme (light/dark)
- No longer show red for expense or green for income
- Consistent UI across all forms and modals

## Files for Commit

```
src/components/budgets/BudgetForm.tsx
src/components/modals/EditTransactionModal.tsx
src/components/chunks/Form.tsx
src/components/transactions/TransactionForm.tsx
src/components/ui-elements/RadioButton.tsx
BUTTON_COLOR_FIX_SUMMARY.md
```

---

**Status:** Ready for commit  
**Files changed:** 5  
**Lines modified:** ~15
