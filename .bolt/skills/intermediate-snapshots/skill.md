---
name: intermediate-snapshots
description: For multi-file changes, create checkpoint markers after each logical group of changes so the user can review progress incrementally and decide to stop or continue. Use whenever a task spans more than two or three files, involves multiple phases (e.g., schema + backend + UI), or when the user asks to "do it step by step", "check in as you go", or "show me progress". Also use proactively on any large refactor, feature build, or migration where partial completion is meaningful.
---

# Intermediate Snapshots

When a task touches many files or unfolds in distinct phases, deliver it in checkpoints rather than one massive change. This gives the user a clear picture of where things stand, lets them course-correct early, and avoids burying a wrong decision under ten more files.

## When to apply

Apply this skill whenever a task:
- Creates or modifies more than ~3 files
- Has naturally distinct phases (e.g., database schema, then API, then UI)
- Involves work the user might want to pause partway through
- Is a refactor or migration where intermediate states are still functional

## The checkpoint format

After completing each logical phase, output a checkpoint block before proceeding:

```
.checkpoint-1:
  - created src/context/UserContext.tsx
  - added /users route to App.tsx
  - updated types/index.ts with User type
  status: builds cleanly, types pass

.next:
  - add UserEditForm component
  - wire form submit to PATCH /api/users/:id
  - add optimistic UI update
```

Then stop and ask: **"Continue to the next phase, or stop here?"**

Wait for an explicit signal before proceeding. "Continue" (or similar) moves forward. "Stop here" ends the task at the current checkpoint — leave the codebase in a working state at that point.

## Rules for checkpoints

- Each checkpoint should leave the codebase in a **buildable, non-broken state**. Never end a checkpoint mid-feature in a way that causes type errors or broken imports.
- List every file touched in the checkpoint — created, modified, or deleted. Be specific so the user knows exactly what changed.
- The `.next` block should be concrete and honest. If you're uncertain about scope, say so: `(scope TBD based on API shape)`.
- Number checkpoints sequentially: `.checkpoint-1`, `.checkpoint-2`, etc.
- The final checkpoint gets a `status: complete` instead of a `.next` block.

## Why this works

A large change delivered all at once gives the user no leverage. If the direction is wrong, everything needs to be undone. Checkpoints create decision points — the user can validate each phase, redirect early, and end up with exactly what they wanted rather than what was assumed.

## Example

**Bad:** Write 12 files, then present everything at once.

**Good:**

After phase 1 (schema + migrations):
```
.checkpoint-1:
  - supabase/migrations/20260101_create_users.sql
  - supabase/migrations/20260101_rls_users.sql
  status: migration applies cleanly, RLS verified

.next:
  - create useUsers() hook
  - build UserList component
  - add /users page to router
```
→ Pause. "Continue to the next phase, or stop here?"
