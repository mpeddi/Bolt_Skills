# Project Constraints

Capture hard limits that govern the project before implementation begins. Constraints that aren't written down get forgotten, violated, and rediscovered the hard way.

---

## Categories

**Technical constraints** — Stack decisions that are fixed: runtime, framework, database, hosting, package manager. Don't propose solutions outside these unless the constraint itself is being revisited.

**Data constraints** — What data can be stored, where, and under what retention rules. Relevant for compliance, privacy, and cost.

**Performance constraints** — Latency budgets, throughput requirements, bundle size limits. Make these concrete numbers, not "fast" or "small."

**Security constraints** — Auth requirements, data access rules, third-party service policies. RLS policies, CORS rules, and API key handling fall here.

**Scope constraints** — What is explicitly out of scope for this phase. Naming these prevents scope creep and avoids building features the user didn't ask for.

---

## How to Use This Skill

At the start of a task, identify which categories are relevant and state the specific constraints. An agent working under constraints it doesn't know about will violate them. An agent working under constraints it does know about will respect them.

When a constraint changes, update it here and re-brief any active agents.

---

## Template

```
Technical: [list fixed stack decisions]
Data: [storage, retention, location rules]
Performance: [specific budgets]
Security: [auth, access, key handling rules]
Out of scope: [explicit exclusions for this phase]
```

---

## Boot-time Project Profile

In addition to manually declared constraints above, derive a **project profile** automatically at session start by reading `package.json` and the file tree. This prevents two failure modes: suggesting a library that isn't installed, and placing a file where the project doesn't expect it.

### Derivation

**From `package.json`:**
- `dependencies` + `devDependencies` → available libraries and their major versions
- `scripts` → how the project is built, tested, previewed
- `type: "module"` → ESM vs CJS

**From the file tree:**
- Framework: React / Vue / Svelte / plain TS (inferred from deps + entry files)
- Build tool: Vite / webpack / Next (inferred from devDeps + config files)
- Component convention: where components live (`src/components/`, `app/`, etc.)
- Lib convention: where utilities live (`src/lib/`, `src/utils/`, etc.)
- DB / auth: Supabase client present? Auth wired up?
- CSS approach: Tailwind / CSS modules / plain CSS / styled-components

**From config files** (`tsconfig.json`, `vite.config.*`):
- Path aliases (`@/` → `src/`, etc.)
- Strict mode on/off

### Profile shape

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

### Persistence

Store the profile in Supabase with an MD5 hash of `package.json` as a staleness check. Re-derive only when the hash changes — not on every session.

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
CREATE POLICY "select_own_profiles" ON project_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_profiles" ON project_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_profiles" ON project_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
```

### Conflict resolution

Manual constraints declared in the sections above always win over inferred profile fields. When a manual constraint requires something not in `package.json`, surface the discrepancy ("X is required by a constraint but not installed — add it?") rather than silently ignoring either side.

### Session-start injection

Absorb the profile silently — do not recite it. Apply it:
- Never suggest a library in `missing_common` without noting it needs to be installed first.
- Place new files in the directories from `file_conventions`.
- Use `path_aliases` in import paths.
- Use `build_command` when building; note if `test_command` is null when asked to test.

If the user asks "what are my constraints?" or "what's my stack?", surface the full profile in readable form.
