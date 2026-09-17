# Check

Run TypeScript + Ultracite (oxlint + oxfmt) checks in one command. Reports a clear summary.

## Arguments

`$ARGUMENTS`

Optional flags:

- `--fix` — Auto-fix lint and formatting issues (TypeScript errors always require manual fixes)
- `--ts-only` — Only run TypeScript check
- `--lint-only` — Only run Ultracite check
- `--tests-only` — Only run the Vitest suite
- `--no-browser` — Run the `unit` Vitest project only, skipping the browser-based story suite

---

## No interactive prompts

---

## Step 1: Run Checks

### If `--ts-only`

Spawn the `typescript-checker` agent and wait for results.

### If `--lint-only`

Spawn the `lint-checker` agent. If `--fix` flag is set, include `--fix` in the agent prompt.

### If `--tests-only`

Run `yarn test`, or `yarn test:unit` when `--no-browser` is set.

### Default (all three checks)

Spawn **both agents in parallel** using the Agent tool in a single message, and run the tests in the
main thread concurrently:

1. **Agent 1**: `typescript-checker` — prompt: "Run TypeScript type checking."
2. **Agent 2**: `lint-checker` — prompt: "Run Ultracite lint check." (add "Use --fix mode." if `--fix` flag is set)
3. **Main thread**: `yarn test` — both Vitest projects. Pass `--no-browser` to run `yarn test:unit`
   alone, which finishes in well under a second; the full run boots Storybook and takes roughly 30s.

Wait for both agents to return results.

---

## Step 2: Parse Results

Each agent returns a response starting with `<!-- RESULT: ... -->`. Parse the status, error counts, and warning counts from each.

---

## Step 3: Summary

Output a results table:

```
| Check      | Status | Details                         |
|------------|--------|---------------------------------|
| TypeScript | Pass   | No type errors                  |
| Ultracite  | Fail   | 3 errors, 1 warning             |
| Tests      | Pass   | N unit, M stories               |
```

Report the counts Vitest actually printed rather than a remembered figure — they move every time a
helper or a story is added.

For a test failure, name the project: `unit` points at pure logic in `tools/`, `storybook` names the
story file and the story that failed.

Include error details from the agent responses (file paths, line numbers, messages) below the table.

Then provide a final status message:

- **All pass** → "All checks passed. Ready to commit."
- **Lint or formatting failures in report mode** → "Run `/check --fix` to auto-fix lint and formatting issues."
- **TypeScript failures** → "TypeScript errors require manual fixes." List the errors with file paths and line numbers.
- **Test failures** → name the failing project and say what it means: `unit` is pure logic in `tools/`,
  `storybook` names the story file and story. "Tests require manual fixes — rerun `yarn test` once
  they pass." **Never point at `/check --fix` for these**, in either mode: `--fix` runs `ultracite fix`,
  which touches lint and formatting only and cannot make a failing assertion pass. Suggesting it sends
  someone to run a command that reports success while the test is still red.
- **Failures in fix mode** → Report what was fixed and what remains. Lint and formatting are the only
  things `--fix` resolves; TypeScript errors and failing tests both survive it and must be listed.

A failing test keeps the overall status failed. There is no auto-fix path for it, by design — the
checker never writes tests, and neither does this command.
