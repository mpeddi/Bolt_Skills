# Data Prep

Prepare all data inputs before passing them to agents or transformations. Raw data from external sources is never trusted directly.

---

## Rules

**Validate shape at the boundary.** Before using any API response, database row, or user input, confirm the required fields are present and have the expected types. Surface a typed error if validation fails — don't let undefined propagate silently.

**Normalize before comparing.** Dates to ISO 8601, strings trimmed and lowercased where appropriate, numeric strings to numbers. Apply these transforms in one place, not scattered across consumers.

**Separate fetch from transform.** A function that fetches data should return raw results. A separate function handles cleaning and normalization. Mixing the two makes both harder to test and reuse.

**Document the schema.** For any dataset used across more than one agent, write the expected shape as a TypeScript type or interface. This is the contract — both producer and consumer must conform to it.

**Handle empty and partial cases explicitly.** An empty array is not an error. A missing optional field is not an error. Design transforms to handle these gracefully rather than guarding with fallbacks that hide real problems.

---

## Handoff Contract

Output from this stage is a typed, normalized dataset conforming to the documented schema. Any downstream agent can assume the data is clean. If it isn't, that's a bug in data-prep, not in the consumer.
