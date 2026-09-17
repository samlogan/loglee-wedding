# Consolidate

Cross-cutting DRY pass over a set of sections and components built separately. Finds patterns that
repeat across them, extracts the ones worth extracting, and opens a PR **without merging it**.

This is the counterpart to `/review-code`, which reviews one target in isolation. Neither can do the
other's job: `/review-code` runs while the rest of a batch does not exist yet, so its 3+ occurrence
threshold can never fire for duplication the batch itself is introducing. `/consolidate` runs once,
at the end, when everything coexists.

## Arguments

`$ARGUMENTS`

**Expected format:** Space-separated section/component names in PascalCase. Sections take the full
folder name (`HeroSection`, not `Hero`).

**Examples:**

```
/consolidate HeroSection ScheduleSection TwoColumnListSection
/consolidate --since=MAM-1904          # everything merged since that ticket
/consolidate --all                     # every section and component (slow; for periodic use)
```

**Optional flags:**

- `--since={linearId|sha}` — Derive targets from `git log {ref}..main --name-only`
- `--all` — Every section and component. Use sparingly; it re-litigates the whole codebase
- `--dry-run` — Report proposals and stop; change nothing, open no PR

---

## Phase 0: Preconditions

1. Working tree clean — `git status --porcelain` must be empty. Stop if not; this pass rewrites
   existing files and must not mix with unrelated edits.
2. On `main` and current — `git checkout main && git pull origin main`.
3. Resolve targets. If a named target has no `sections/{Name}/` or `components/{Name}/`, stop and
   list what was not found rather than silently reviewing a subset.
4. Fewer than 3 targets → report that and stop. A consolidation pass over two things cannot reach
   its own threshold.

---

## Phase 1: Analysis (AGENT)

Launch the `reuse-consolidator` agent with the target list.

It reads every target, inventories what already exists in `components/`, `tools/helpers/`,
`tools/hooks/` and `tools/sass/`, then greps all of `sections/**` and `components/**` for repeats.
It returns proposals ranked by value, each with its adopters and its cost, plus the ones it rejected.

**Wait for it to complete.**

---

## Phase 2: Decide

Work through the proposals and keep only those that are clearly worth it:

- **Adopt existing** beats **extract new**, every time. If the agent found that three sections
  hand-rolled something `Card` or `Container` already does, that is the highest-value change in the
  run — do it first.
- Apply the threshold as stated: 3+ occurrences to extract, 2 is a `watch` and stays unchanged.
- Reject anything whose blast radius exceeds its saving. Rewriting eight files to remove twelve lines
  is a net loss; the agent is told to flag these and you should agree with it more often than not.
- Reject "configurable component with five booleans" shapes. If absorbing the third case requires a
  new flag that only one caller sets, the cases are not the same concept.

If nothing survives, say so and stop — no branch, no PR. That is a normal outcome.

If `--dry-run`, print the decisions and stop here.

---

## Phase 3: Apply

```bash
git checkout -b refactor/consolidate-{yyyy-mm-dd}
```

For each accepted proposal, in order of value:

1. Create the shared thing (component, mixin, helper, hook, or token).
2. Update **every** adopter the agent named. A half-applied extraction leaves the codebase worse than
   before — two callers on the new abstraction and three still duplicating it.
3. If a new component was created, write its story — that is how a component gets a test here.
4. If any section folder was added or removed, run `yarn sections:register`.
5. Run `yarn fix && yarn ts:check` after each proposal, not once at the end, so a failure names the
   change that caused it.

---

## Phase 4: Verify

```bash
yarn fix && yarn ts:check
yarn test
```

**The full `yarn test` matters here and is not optional.** Every story runs as a component test in a
real browser, so this is what actually catches a consolidation that changed rendering. A pass on
`test:unit` alone proves almost nothing about this kind of change — the duplication being removed is
mostly layout, and layout is exactly what the unit project cannot see.

If a story fails, fix it or revert that proposal. Do not weaken a story to make it pass.

---

## Phase 5: PR — open, do not merge

```bash
git push -u origin HEAD
gh pr create --base main --title "Consolidate shared patterns across {n} sections" --body "..."
```

Body should list, per proposal: what was extracted, every adopter, and the line delta.

**Do not merge.** Every other PR in the batch pipeline is a self-contained addition; this one
rewrites already-merged, already-reviewed code across many files. Leave it for a human, and say so
in the report.

---

## Phase 6: Report

```
## Consolidation

### Targets ({count})
{names}

### Applied ({count})
| Pattern | Kind | Adopters | Lines removed |
|---|---|---|---|

### Watch ({count}) — 2 occurrences, left alone
| Pattern | Files |
|---|---|

### Rejected ({count})
| Pattern | Why |
|---|---|

### Verification
- yarn ts:check: {pass/fail}
- yarn test: {n passed} ({n story tests})

### PR
{url} — open for review, not merged
```
