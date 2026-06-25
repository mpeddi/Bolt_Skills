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
