# Test Architect

Design the test strategy before writing tests. Tests written without a plan tend to cover the happy path twice and miss the cases that actually break.

---

## Test Layers

**Unit tests** cover a single function or module in isolation. Mock all external dependencies. These should be fast, numerous, and focused on logic branches — not on implementation details.

**Integration tests** cover how two or more modules interact. Use real implementations where practical, mocks only at true system boundaries (network, file I/O, time).

**End-to-end tests** cover a user-facing flow from start to finish. One test per meaningful user journey. These are slow and should be few.

---

## What to Test

For each feature, identify:
1. The golden path — the expected flow when everything works
2. Error cases — what happens when upstream fails, input is invalid, or state is missing
3. Boundary conditions — empty collections, zero values, maximum lengths, concurrent operations

Don't test framework behavior. Don't test getters and setters. Test the logic your code owns.

---

## Test Design Rules

- One assertion per test. If a test has five assertions, it's five tests.
- Name tests as statements: `"returns empty array when no expenses exist"` not `"test expenses"`.
- Arrange, Act, Assert — set up state, invoke the unit under test, assert the result. No interleaving.
- Tests must be independent. Running them in any order must produce the same result.

---

## Handoff Contract

Deliver a test plan that lists: test layer, scenario name, what is being asserted, and which edge cases are explicitly covered. The implementation agent writes tests to this plan.
