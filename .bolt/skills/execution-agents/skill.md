# Execution Agents

Split implementation work across three focused agents that run in sequence. Each agent has a single responsibility and a defined handoff contract.

---

## Agent A — Implementation

Builds the feature. Reads relevant files before touching anything. Edits only what the task requires. Leaves no orphaned files, dead exports, or commented-out code. Reports: files changed, what each change does, any assumptions made.

## Agent B — Build + Type Check

Runs `npm run build` (or the project's build command). Reports the full output verbatim. If it fails, diagnoses the root cause and fixes it — does not retry blindly. Only marks this step done when the build exits clean.

## Agent C — UI Verification

**Before doing anything, check whether the browser MCP tool is available** by attempting a minimal navigation call.

**If browser MCP is available:**
- Navigate to the running dev server.
- Exercise the golden path for the feature end-to-end.
- Check at least one edge case (empty state, error state, or boundary condition).
- Report what was tested, what passed, and any visual or functional regressions observed.

**If browser MCP is NOT available:**
- Run `npm run build` if Agent B has not already done so.
- Read the component files touched by Agent A and trace the golden path through props, state, and event handlers manually.
- Confirm data flows from source to render with no dead ends (missing handlers, unrendered branches, unhandled async states).
- End the report with the explicit statement: **"UI not verified in browser — browser tool unavailable. Code-path analysis performed instead."**
- Do NOT claim the UI works. Do NOT omit the disclaimer.

---

## Handoff Rules

- Agent B must not start until Agent A reports success.
- Agent C must not start until Agent B reports a clean build.
- If any agent fails, stop the chain and surface the failure with the full output. Do not paper over failures with optimistic summaries.
