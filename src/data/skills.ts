export interface Skill {
  slug: string
  name: string
  description: string
  content: string
}

export const skills: Skill[] = [
  {
    slug: 'task-intake',
    name: 'Task Intake',
    description: 'Establish shared understanding before implementation begins.',
    content: `# Task Intake

Before any implementation starts, establish a shared understanding of what is being built and why. Ambiguous intake produces rework. Clear intake produces focused output.

## What to Establish

**Goal** — One sentence: what user problem does this solve, or what capability does it add?

**Acceptance criteria** — Concrete, testable conditions. "The user can X" is a criterion. "It works well" is not.

**Affected surfaces** — Which files, components, routes, or database tables are in scope?

**Out of scope** — What is explicitly not being changed in this task? Naming exclusions prevents scope creep.

**Dependencies** — Does this task depend on another task being done first? Does anything depend on this?

## Clarification Before Proceeding

If the goal is ambiguous, ask one focused clarifying question before starting. Don't ask multiple questions at once. Don't start implementation while the goal is unclear — rework is more expensive than a short pause.

If the acceptance criteria are missing, propose them and confirm before proceeding.

## Handoff Format

\`\`\`
Goal: [one sentence]
Criteria:
  - [testable condition 1]
  - [testable condition 2]
Scope: [files / components / tables]
Out of scope: [explicit exclusions]
Blocked by: [task name or "nothing"]
\`\`\`

Pass this to the implementation agent as-is. Don't summarize or paraphrase — the original criteria are the contract.`,
  },
  {
    slug: 'project-constraints',
    name: 'Project Constraints',
    description: 'Capture hard limits that govern the project before implementation begins.',
    content: `# Project Constraints

Capture hard limits that govern the project before implementation begins. Constraints that aren't written down get forgotten, violated, and rediscovered the hard way.

## Categories

**Technical constraints** — Stack decisions that are fixed: runtime, framework, database, hosting, package manager. Don't propose solutions outside these unless the constraint itself is being revisited.

**Data constraints** — What data can be stored, where, and under what retention rules. Relevant for compliance, privacy, and cost.

**Performance constraints** — Latency budgets, throughput requirements, bundle size limits. Make these concrete numbers, not "fast" or "small."

**Security constraints** — Auth requirements, data access rules, third-party service policies. RLS policies, CORS rules, and API key handling fall here.

**Scope constraints** — What is explicitly out of scope for this phase. Naming these prevents scope creep and avoids building features the user didn't ask for.

## How to Use This Skill

At the start of a task, identify which categories are relevant and state the specific constraints. An agent working under constraints it doesn't know about will violate them. An agent working under constraints it does know about will respect them.

When a constraint changes, update it here and re-brief any active agents.

## Template

\`\`\`
Technical: [list fixed stack decisions]
Data: [storage, retention, location rules]
Performance: [specific budgets]
Security: [auth, access, key handling rules]
Out of scope: [explicit exclusions for this phase]
\`\`\``,
  },
  {
    slug: 'data-prep',
    name: 'Data Prep',
    description: 'Validate and normalize data inputs before passing them to agents or transformations.',
    content: `# Data Prep

Prepare all data inputs before passing them to agents or transformations. Raw data from external sources is never trusted directly.

## Rules

**Validate shape at the boundary.** Before using any API response, database row, or user input, confirm the required fields are present and have the expected types. Surface a typed error if validation fails — don't let undefined propagate silently.

**Normalize before comparing.** Dates to ISO 8601, strings trimmed and lowercased where appropriate, numeric strings to numbers. Apply these transforms in one place, not scattered across consumers.

**Separate fetch from transform.** A function that fetches data should return raw results. A separate function handles cleaning and normalization. Mixing the two makes both harder to test and reuse.

**Document the schema.** For any dataset used across more than one agent, write the expected shape as a TypeScript type or interface. This is the contract — both producer and consumer must conform to it.

**Handle empty and partial cases explicitly.** An empty array is not an error. A missing optional field is not an error. Design transforms to handle these gracefully rather than guarding with fallbacks that hide real problems.

## Handoff Contract

Output from this stage is a typed, normalized dataset conforming to the documented schema. Any downstream agent can assume the data is clean. If it isn't, that's a bug in data-prep, not in the consumer.`,
  },
  {
    slug: 'execution-agents',
    name: 'Execution Agents',
    description: 'Split implementation work across three focused agents that run in sequence.',
    content: `# Execution Agents

Split implementation work across three focused agents that run in sequence. Each agent has a single responsibility and a defined handoff contract.

## Agent A — Implementation

Builds the feature. Reads relevant files before touching anything. Edits only what the task requires. Leaves no orphaned files, dead exports, or commented-out code. Reports: files changed, what each change does, any assumptions made.

## Agent B — Build + Type Check

Runs \`npm run build\` (or the project's build command). Reports the full output verbatim. If it fails, diagnoses the root cause and fixes it — does not retry blindly. Only marks this step done when the build exits clean.

## Agent C — UI Verification

**Before doing anything, check whether the browser MCP tool is available** by attempting a minimal navigation call.

**If browser MCP is available:**
- Navigate to the running dev server.
- Exercise the golden path for the feature end-to-end.
- Check at least one edge case (empty state, error state, or boundary condition).
- Report what was tested, what passed, and any visual or functional regressions observed.

**If browser MCP is NOT available:**
- Run \`npm run build\` if Agent B has not already done so.
- Read the component files touched by Agent A and trace the golden path through props, state, and event handlers manually.
- Confirm data flows from source to render with no dead ends (missing handlers, unrendered branches, unhandled async states).
- End the report with the explicit statement: **"UI not verified in browser — browser tool unavailable. Code-path analysis performed instead."**
- Do NOT claim the UI works. Do NOT omit the disclaimer.

## Handoff Rules

- Agent B must not start until Agent A reports success.
- Agent C must not start until Agent B reports a clean build.
- If any agent fails, stop the chain and surface the failure with the full output. Do not paper over failures with optimistic summaries.`,
  },
  {
    slug: 'test-architect',
    name: 'Test Architect',
    description: 'Design the test strategy before writing tests.',
    content: `# Test Architect

Design the test strategy before writing tests. Tests written without a plan tend to cover the happy path twice and miss the cases that actually break.

## Test Layers

**Unit tests** cover a single function or module in isolation. Mock all external dependencies. These should be fast, numerous, and focused on logic branches — not on implementation details.

**Integration tests** cover how two or more modules interact. Use real implementations where practical, mocks only at true system boundaries (network, file I/O, time).

**End-to-end tests** cover a user-facing flow from start to finish. One test per meaningful user journey. These are slow and should be few.

## What to Test

For each feature, identify:
1. The golden path — the expected flow when everything works
2. Error cases — what happens when upstream fails, input is invalid, or state is missing
3. Boundary conditions — empty collections, zero values, maximum lengths, concurrent operations

Don't test framework behavior. Don't test getters and setters. Test the logic your code owns.

## Test Design Rules

- One assertion per test. If a test has five assertions, it's five tests.
- Name tests as statements: \`"returns empty array when no expenses exist"\` not \`"test expenses"\`.
- Arrange, Act, Assert — set up state, invoke the unit under test, assert the result. No interleaving.
- Tests must be independent. Running them in any order must produce the same result.

## Handoff Contract

Deliver a test plan that lists: test layer, scenario name, what is being asserted, and which edge cases are explicitly covered. The implementation agent writes tests to this plan.`,
  },
  {
    slug: 'decision-logging',
    name: 'Decision Logging',
    description: 'Record significant decisions during implementation for future reference.',
    content: `# Decision Logging

Record significant decisions during implementation so future agents and collaborators understand not just what was built, but why.

## When to Log

Log a decision when:
- A non-obvious trade-off was made (e.g., chose approach A over B for a specific reason)
- An assumption was made that could be wrong or is likely to change
- A constraint was imposed by the environment rather than by preference
- An alternative was explicitly ruled out

Don't log decisions that are obvious from the code or that follow directly from stated requirements.

## Format

\`\`\`
Decision: <one sentence describing what was decided>
Reason: <one to three sentences on why — the constraint, trade-off, or evidence>
Alternatives considered: <what else was evaluated, if anything>
\`\`\`

Keep entries short. If the reasoning runs longer than three sentences, it probably needs to be a design doc, not a log entry.

## Where to Put It

- In the PR description for decisions that affect reviewers
- In a \`DECISIONS.md\` file at the project root for persistent architectural decisions
- As a single-line comment inline when the decision is local to one function and the "why" is genuinely non-obvious

Never duplicate decision logs. One canonical location per decision.`,
  },
  {
    slug: 'verification-report',
    name: 'Verification Report',
    description: 'Write a verification report before marking any task done.',
    content: `# Verification Report

After a feature is built and tested, write a verification report before marking the task done. The report is the evidence that acceptance criteria were met — not a summary of what was intended.

## Structure

**Feature:** Name of the feature or task.

**Criteria verified:** For each acceptance criterion from task intake, state whether it passed, failed, or was not tested — and why.

**How it was verified:** For each criterion, describe the method: browser test, automated test, code review, or build check. "Looks right" is not a method.

**Regressions checked:** List any adjacent features that could have been affected and confirm they still work.

**Known gaps:** Anything that wasn't verified and why. Be honest — unknown gaps are worse than acknowledged ones.

## Rules

- Never write "all criteria met" without listing them individually.
- Never claim browser verification if the browser tool was unavailable — use the explicit fallback disclaimer from the execution-agents skill.
- A failing criterion means the task is not done. Mark it in-progress, not complete.
- If a regression was found, log it as a new task before closing this one.

## Template

\`\`\`
Feature: [name]

Criteria:
  [criterion 1]: PASS / FAIL / NOT TESTED — [method used]
  [criterion 2]: PASS / FAIL / NOT TESTED — [method used]

Regressions: [what was checked and the result]

Gaps: [what wasn't verified and why]
\`\`\``,
  },
]
