---
name: project-constraints
description: On first boot (or when package.json / project structure changes), derive a semantic project profile from the manifest and file tree, merge it with any manually declared constraints, and persist it to Supabase. At session start, inject the profile silently so Bolt never suggests unavailable libraries or places files in the wrong location. Also invoke when the user says "set a constraint", "don't use X", "always use Y", or describes a project-wide rule.
---

# Project Constraints

Two failure modes this skill prevents:
1. Bolt suggests a library that isn't installed.
2. Bolt places a file where the project doesn't expect it.

It solves both by deriving a **project profile** at boot from what's actually on disk, caching it, and injecting it as silent context at the start of every session. Manual declarations override anything inferred.

## Schema

```sql
CREATE TABLE IF NOT EXISTS project_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL UNIQUE,
  package_hash text NOT NULL,
  profile jsonb NOT NULL,
  manual_constraints jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_profiles" ON project_profiles FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_profiles" ON project_profiles FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_profiles" ON project_profiles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
```

`package_hash` is an MD5 of the raw `package.json` content. When the hash at boot matches the stored hash, skip re-derivation and use the cached profile.

## Boot-time derivation

On first session for a project, or when `package_hash` has changed, read and interpret:

**From `package.json`:**
- `dependencies` + `devDependencies` → available libraries and their major versions
- `scripts` → how the project is built, tested, previewed
- `type: "module"` → ESM vs CJS

**From the file tree:**
- Framework: React / Vue / Svelte / plain TS etc. (inferred from deps + entry files)
- Build tool: Vite / webpack / esbuild / Next (inferred from devDeps + config files)
- Component convention: where components live (`src/components/`, `app/`, etc.)
- Lib convention: where utilities live (`src/lib/`, `src/utils/`, etc.)
- DB / auth: Supabase client present? Auth wired up?
- CSS approach: Tailwind / CSS modules / plain CSS / styled-components

**From config files** (`tsconfig.json`, `vite.config.*`, `.eslintrc`):
- Path aliases (`@/` → `src/`, etc.)
- Strict mode on/off
- Target environments

The output is a structured profile object:

```jsonc
{
  "framework": "react@18",
  "build_tool": "vite",
  "language": "typescript",
  "esm": true,
  "available_libraries": ["@supabase/supabase-js@2", "react-dom@18"],
  "missing_common": ["routing", "state_management", "form_library", "component_library"],
  "file_conventions": {
    "components": "src/components/",
    "lib": "src/lib/",
    "pages": null,
    "styles": "src/index.css"
  },
  "path_aliases": { "@": "src/" },
  "db": "supabase",
  "auth": "supabase_email_password",
  "css": "plain_css",
  "build_command": "tsc && vite build",
  "test_command": null
}
```

## Manual constraint declarations

When the user says "don't use X", "always use Y", or declares a project-wide rule, append to `manual_constraints`:

```jsonc
[
  { "type": "forbid", "subject": "axios", "reason": "use fetch" },
  { "type": "require", "subject": "zod", "reason": "all external data must be validated" },
  { "type": "convention", "subject": "no_default_exports", "reason": "team preference" }
]
```

Manual constraints are never overwritten by re-derivation. To remove one, the user must explicitly say so.

## Conflict resolution

When a manual constraint contradicts an inferred profile field, the manual constraint wins. Example: if `zod` is not in `package.json` but a manual constraint requires it, flag the discrepancy to the user ("zod is required by a constraint but not installed — add it to package.json?") rather than silently ignoring one side.

## Session-start injection

At session start, load the profile and inject it as silent context. Bolt should absorb and apply it without reciting it back. Concretely:

- Never suggest a library in `missing_common` unless the user explicitly asks and you note it needs to be installed.
- Place new files in the directories specified by `file_conventions`.
- Use path aliases from `path_aliases` in imports.
- Use `build_command` when asked to build; note if `test_command` is null when asked to test.

If the user asks "what are my constraints?" or "what's my stack?", surface the full profile in a readable format.

## Re-derivation triggers

Re-derive and update the stored profile when:
- `package_hash` at boot differs from the stored value (dependencies changed)
- The user runs `npm install <pkg>` or modifies `package.json`
- The user adds a new top-level directory that changes file conventions

Do not re-derive on every session — only when something has actually changed.
