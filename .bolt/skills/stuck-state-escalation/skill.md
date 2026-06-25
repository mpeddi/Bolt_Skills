---
name: stuck-state-escalation
description: When blocked, failing, or unable to proceed, produce a structured handoff message instead of dumping raw error text. Use whenever an attempt fails, an assumption turns out to be wrong, a required file or dependency is missing, or the right next step is ambiguous. Also use when the user says "you're stuck", "why isn't this working", or "what's the problem".
---

# Stuck-State Escalation Protocol

When something doesn't work and forward progress is blocked, the worst response is a wall of error output with no framing. The best response is a short, structured message that tells the user exactly what was expected, what was found instead, what was already tried, and what decision is needed from them.

## The handoff format

Use this structure whenever blocked:

```
[Blocked] I expected X but encountered Y.

What I tried:
- <specific action 1>
- <specific action 2>

What I need from you:
- <concrete question or decision 1>
- <concrete question or decision 2>
```

Keep the whole message under 10 lines. If error output is essential context, include a single relevant excerpt (2–4 lines max), not the full trace.

## Rules

- **One clear statement of the mismatch.** "I expected X but encountered Y" forces precision — it rules out vague complaints like "it didn't work" and makes the problem reproducible.
- **Only list things actually tried.** Don't pad the "What I tried" list with things that should be tried next. If you tried two things, list two things.
- **Make the questions answerable.** "What I need from you" should be specific options or yes/no decisions, not open-ended requests. Bad: "What should I do?" Good: "Should I proceed with a partial implementation, or wait until the full schema is available?"
- **Leave the codebase clean.** If a partial attempt left broken files, either fix them or document exactly what's incomplete. Don't strand the user in a broken state.
- **No apology prose.** Skip "I'm sorry for the confusion" or "Unfortunately...". State the situation and the options.

## When to trigger

- An import or dependency is missing and cannot be inferred
- A file that should exist doesn't (and can't be created without a decision)
- A migration, API call, or build step fails with an error not fixable by inspection
- Two reasonable approaches exist and the tradeoff affects the user's data or architecture
- A previous assumption (about schema shape, API contract, etc.) turns out to be wrong

## Example

**Bad:**
```
Error: Cannot find module './hooks/useAuth'
    at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1039:15)
    at Function.Module._load (node:internal/modules/cjs/loader:885:27)
    ... (40 more lines)
I'm not sure what's happening here. Let me try a different approach...
```

**Good:**
```
[Blocked] I expected a useAuth hook at src/hooks/useAuth.ts but the file doesn't exist.

What I tried:
- Searched src/hooks/ — directory exists but only contains useFetch.ts
- Checked for auth logic in App.tsx and index.tsx — not present

What I need from you:
- Should I create useAuth.ts from scratch using Supabase session state?
- Or is auth handled elsewhere (e.g., a different file or a third-party library)?
```
