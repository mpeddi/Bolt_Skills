# Task Intake

Before any implementation starts, establish a shared understanding of what is being built and why. Ambiguous intake produces rework. Clear intake produces focused output.

---

## What to Establish

**Goal** — One sentence: what user problem does this solve, or what capability does it add?

**Acceptance criteria** — Concrete, testable conditions. "The user can X" is a criterion. "It works well" is not.

**Affected surfaces** — Which files, components, routes, or database tables are in scope?

**Out of scope** — What is explicitly not being changed in this task? Naming exclusions prevents scope creep.

**Dependencies** — Does this task depend on another task being done first? Does anything depend on this?

---

## Clarification Before Proceeding

If the goal is ambiguous, ask one focused clarifying question before starting. Don't ask multiple questions at once. Don't start implementation while the goal is unclear — rework is more expensive than a short pause.

If the acceptance criteria are missing, propose them and confirm before proceeding.

---

## Handoff Format

```
Goal: [one sentence]
Criteria:
  - [testable condition 1]
  - [testable condition 2]
Scope: [files / components / tables]
Out of scope: [explicit exclusions]
Blocked by: [task name or "nothing"]
```

Pass this to the implementation agent as-is. Don't summarize or paraphrase — the original criteria are the contract.
