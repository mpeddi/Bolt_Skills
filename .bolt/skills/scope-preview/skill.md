---
name: scope-preview
description: Before making changes on any non-trivial task, output a short numbered plan of what will be built and explicitly list what is being skipped, then wait for confirmation. Use whenever a task involves more than one file, has multiple reasonable interpretations, or could grow in scope beyond what was asked. Also use when the user says "plan this out", "what would you do", or "before you start". Do not use for single-file fixes or clearly scoped one-liners.
---

# Scope Preview

Before touching any files on a non-trivial task, show the user a short plan and get a confirmation. This prevents building the wrong thing, avoids scope creep in either direction, and gives the user a chance to redirect before any work is done.

## The preview format

```
I'll:
1. <concrete action — file name + what it does>
2. <concrete action>
3. <concrete action>

I'll skip for now: <comma-separated list of related things not being built>

Confirm or adjust?
```

Then stop. Do not write any code until the user confirms, adjusts the plan, or says "go ahead."

## Rules

- **Be concrete about files.** "Create `Dashboard.tsx`" is useful. "Add a dashboard" is not. Name the files and routes whenever known.
- **The skip list is mandatory.** Explicitly naming what you're leaving out prevents the user from assuming it's included. It also surfaces assumptions — if the user says "wait, I do need permissions", you find out before writing ten files.
- **Keep the plan to 4–6 items.** If you need more, the task should be broken into phases (see the `intermediate-snapshots` skill). A longer list is a sign the scope needs trimming, not that the plan needs more bullets.
- **Don't ask clarifying questions in the plan.** If you need information to proceed, ask one focused question before showing the plan, not inside it. The plan is a statement of intent, not a dialogue.
- **Adjust on feedback.** If the user modifies the plan, restate the updated version before starting. Never silently fold in a change and proceed — confirm the revised plan explicitly.

## When to skip the preview

- Single-file changes with no ambiguity (e.g., "fix the typo in the button label")
- The user already gave a detailed spec that covers all files and behavior
- The user explicitly says "just do it" or "no need to confirm"

## Example

**Task:** "Add a user dashboard"

**Good preview:**
```
I'll:
1. Add `/dashboard` route to App.tsx
2. Create src/pages/Dashboard.tsx with basic layout
3. Wire up to existing Supabase auth session (redirect to login if unauthenticated)
4. Add "Dashboard" link to the nav in Header.tsx

I'll skip for now: analytics widgets, role-based permissions, mobile-specific layout

Confirm or adjust?
```

**Bad:** Jump straight into creating files, then explain what was built after the fact.

## Why this works

Users rarely describe every detail they want upfront. A scope preview externalizes your interpretation of the task so the user can correct it cheaply — before any files change. The skip list is especially valuable: it converts invisible assumptions into explicit decisions.
