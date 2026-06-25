# Verification Report

After a feature is built and tested, write a verification report before marking the task done. The report is the evidence that acceptance criteria were met — not a summary of what was intended.

---

## Structure

**Feature:** Name of the feature or task.

**Criteria verified:** For each acceptance criterion from task intake, state whether it passed, failed, or was not tested — and why.

**How it was verified:** For each criterion, describe the method: browser test, automated test, code review, or build check. "Looks right" is not a method.

**Regressions checked:** List any adjacent features that could have been affected and confirm they still work.

**Known gaps:** Anything that wasn't verified and why. Be honest — unknown gaps are worse than acknowledged ones.

---

## Rules

- Never write "all criteria met" without listing them individually.
- Never claim browser verification if the browser tool was unavailable — use the explicit fallback disclaimer from the execution-agents skill.
- A failing criterion means the task is not done. Mark it in-progress, not complete.
- If a regression was found, log it as a new task before closing this one.

---

## Template

```
Feature: [name]

Criteria:
  [criterion 1]: PASS / FAIL / NOT TESTED — [method used]
  [criterion 2]: PASS / FAIL / NOT TESTED — [method used]

Regressions: [what was checked and the result]

Gaps: [what wasn't verified and why]
```
