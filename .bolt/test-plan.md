# Test Plan — Expense Tracker — 2026-06-24

## Summary
4 feature areas | 35 test cases

---

## Auth

**Contract:** Users can create an account with email and password, sign in to access their data, and sign out. The session persists across page reloads.

### Golden Path
- [ ] TC-001: Sign up with valid email + strong password → user created, dashboard loads
- [ ] TC-002: Sign in with existing credentials → dashboard loads with existing expenses visible
- [ ] TC-003: Sign out via header button → auth screen shown, dashboard unmounts

### Edge Cases
- [ ] TC-004: Sign in, close tab, reopen same URL → session persists, dashboard loads without re-auth prompt
- [ ] TC-005: Sign up with an email already registered → error message shown (not a silent failure)

### Error States
- [ ] TC-006: Submit sign-in form with email field empty → "Email is required." shown inline
- [ ] TC-007: Submit sign-in form with password field empty → "Password is required." shown inline
- [ ] TC-008: Sign up with password shorter than 6 characters → "Password must be at least 6 characters." shown
- [ ] TC-009: Sign in with correct email but wrong password → Supabase error message shown (not a crash)
- [ ] TC-010: Submit sign-in with non-email value in email field (e.g. "notanemail") → error shown

### Regressions
- (none — auth is standalone)

---

## Expense CRUD

**Contract:** Authenticated users can create, read, update, and delete their own expense entries. Each expense has amount, category, date, and optional note. Changes persist across page reloads. Users cannot access other users' expenses.

### Golden Path
- [ ] TC-011: Add expense with all fields filled → entry appears in list with correct amount, category, date, note
- [ ] TC-012: Add expense with note field left empty → entry appears without note (no crash, no "null" text)
- [ ] TC-013: Edit an existing expense (change amount and note) → list row updates, old values gone
- [ ] TC-014: Delete an expense → row removed from list, running totals update
- [ ] TC-015: Add 3 expenses across 2 different months → both month groups appear with correct subtotals

### Edge Cases
- [ ] TC-016: Add expense with note containing apostrophe (e.g. "O'Brien's Cafe") → saves and displays correctly
- [ ] TC-017: Add expense with note `<script>alert(1)</script>` → renders as literal text, no alert fires
- [ ] TC-018: Add expense with amount 0.01 (minimum valid) → saves and displays as $0.01
- [ ] TC-019: Add expense with amount 99999.99 → saves and displays as $99,999.99
- [ ] TC-020: Click "Add Expense" submit button rapidly twice → only one entry created
- [ ] TC-021: Add expense with a date from a prior month → grouped under the correct prior-month heading

### Error States
- [ ] TC-022: Submit expense form with amount field empty → "Amount is required." shown, no submission
- [ ] TC-023: Submit expense form with amount = 0 → "Amount must be a positive number." shown
- [ ] TC-024: Submit expense form with amount = -5 → "Amount must be a positive number." shown
- [ ] TC-025: Submit expense form with date field cleared → "Date is required." shown
- [ ] TC-026: Type letters into the amount field → "Amount must be a positive number." shown

### Regressions
- [ ] TC-027: After adding an expense, reload the page → expense still in list (persistence check)

---

## Expense List & Filter

**Contract:** Expenses are displayed grouped by month (newest first). A category filter narrows the list. An empty state is shown when no matching expenses exist.

### Golden Path
- [ ] TC-028: Select a category in the filter dropdown → only expenses of that category displayed
- [ ] TC-029: Switch filter from a category back to "All categories" → all expenses restored

### Edge Cases
- [ ] TC-030: Filter by a category that has no expenses → empty state shown (no crash, no blank space)
- [ ] TC-031: Expense with a very long note → note truncates with ellipsis, does not break row layout

### Error States
- (filter is a client-side operation with no error states)

### Regressions
- [ ] TC-032: Add an expense, then filter by its category → new expense appears in filtered view

---

## Summary Tab

**Contract:** The Summary tab shows a total of all expenses, a this-month subtotal, and a breakdown by category with proportional bars. All values stay in sync as expenses are added or removed.

### Golden Path
- [ ] TC-033: Switch to Summary tab → "Total" card equals sum of all expenses
- [ ] TC-034: "This Month" card shows only expenses with dates in the current calendar month
- [ ] TC-035: Category breakdown section lists only categories that have at least one expense

### Edge Cases
- [ ] TC-036: View Summary with no expenses → Total shows $0.00, "This Month" shows $0.00, no category bars rendered

### Error States
- (summary is computed client-side with no error states)

### Regressions
- [ ] TC-037: Add an expense, stay on Summary tab → totals update immediately without tab switch

---

## Gaps (Not Testable in Browser)

- Email delivery: sign-up confirmation emails (email confirmation is disabled in this project, so not applicable)
- Session token expiry behavior (requires waiting for token TTL — not feasible in a live test session)
- RLS enforcement for cross-user access (requires two simultaneous user sessions — partial workaround: test direct Supabase API calls with a different user's auth token)
