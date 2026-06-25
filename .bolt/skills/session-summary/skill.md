---
name: session-summary
description: At the end of a session, generate a structured summary and persist it to Supabase. At the start of a new session, retrieve and inject the most recent summary as context before responding. Use whenever the user says "end session", "wrap up", "summarize this session", or starts a new session in a project that has prior session records. Also trigger automatically when a session has produced meaningful changes and is winding down.
---

# Session Summary

Long sessions produce decisions, context, and open threads that vanish when the session ends. This skill captures that state in a compact, structured summary, stores it in Supabase, and retrieves it at the start of the next session so work resumes with full context rather than from zero.

## Schema

Before using this skill, ensure the `session_summaries` table exists:

```sql
CREATE TABLE IF NOT EXISTS session_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  summary text NOT NULL,
  embedding vector(1536)
);

ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_summaries" ON session_summaries FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_summaries" ON session_summaries FOR INSERT
  TO authenticated WITH CHECK (true);
```

The `embedding` column enables vector similarity search via `pgvector`. If `pgvector` is not available, fall back to recency-based retrieval (ORDER BY created_at DESC LIMIT 1).

## Session-end: generating the summary

When a session ends, produce a summary in this structure and write it to `session_summaries`:

```
project: <project name>
date: <YYYY-MM-DD>

## What changed
- <file or feature> — <one-line description of what was done and why>

## Decisions made
- <decision> — <the reasoning, including alternatives rejected>

## Current state
<2–3 sentences describing where the project stands right now — what works, what's wired up, what's been tested>

## Open threads
- <thing left unfinished or deferred, with enough context to resume>

## Next suggested steps
- <concrete next action>
```

Keep the whole summary under 400 words. Compress aggressively — this is machine-readable context, not prose. Omit sections that are empty.

## Session-start: injecting context

At the start of a session in a project with prior summaries, retrieve the most recent summary (or the most semantically relevant one if a query is available) and prepend it as silent context before responding.

Present it as a brief orientation block:

```
[Resuming session — last worked on <date>]
<current state sentence>
Open: <comma-separated open threads>
```

Then proceed normally. Don't recite the full summary back to the user — just absorb it and let it inform your responses. If the user asks "where were we?" or "what did we do last time?", surface the full summary.

## Embedding and retrieval

When storing a summary, generate an embedding of the `summary` text and store it in the `embedding` column. This allows semantic retrieval: if a new session starts with a task description, find the most relevant prior summary by cosine similarity rather than just recency.

Use Supabase's `pgvector` extension and the `match_session_summaries` RPC pattern:

```sql
SELECT id, summary, created_at,
       1 - (embedding <=> query_embedding) AS similarity
FROM session_summaries
ORDER BY embedding <=> query_embedding
LIMIT 1;
```

If embedding generation is unavailable, skip the vector column and retrieve by `ORDER BY created_at DESC LIMIT 1`.

## Rules

- **One summary per session.** Don't append or update — insert a new row each time. The history is the value.
- **Decisions must include reasoning.** "Used Supabase RLS" is weak. "Used Supabase RLS instead of app-layer filtering because the table is user-scoped and we can't trust the client" is useful context that survives the session.
- **Open threads must be actionable.** "Look into X" is not enough. "The `user_id` FK on expenses is nullable — decide whether to enforce NOT NULL before going to prod" is resumable.
- **The current state section is the most important.** A new session that reads it should be able to answer "what works right now?" without reading any code.
