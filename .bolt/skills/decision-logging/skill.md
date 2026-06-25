# Decision Logging

Record significant decisions during implementation so future agents and collaborators understand not just what was built, but why.

---

## When to Log

Log a decision when:
- A non-obvious trade-off was made (e.g., chose approach A over B for a specific reason)
- An assumption was made that could be wrong or is likely to change
- A constraint was imposed by the environment rather than by preference
- An alternative was explicitly ruled out

Don't log decisions that are obvious from the code or that follow directly from stated requirements.

---

## Format

```
Decision: <one sentence describing what was decided>
Reason: <one to three sentences on why — the constraint, trade-off, or evidence>
Alternatives considered: <what else was evaluated, if anything>
```

Keep entries short. If the reasoning runs longer than three sentences, it probably needs to be a design doc, not a log entry.

---

## Where to Put It

- In the PR description for decisions that affect reviewers
- In a `DECISIONS.md` file at the project root for persistent architectural decisions
- As a single-line comment inline when the decision is local to one function and the "why" is genuinely non-obvious

Never duplicate decision logs. One canonical location per decision.
