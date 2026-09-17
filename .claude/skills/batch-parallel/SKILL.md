# Batch Parallel

Builds many Linear tickets **concurrently** in isolated git worktrees, then integrates them one at a
time. Runs unattended from a single approval to a finished `main`.

`/batch-tickets` is the sequential cousin and remains the safer default. Use this when the batch is
long enough that wall-clock matters — at roughly an hour per section, nineteen tickets is a
multi-day serial run and about four hours here.

## What it trades, and how it buys it back

Sequential mode's real advantage is not safety, it is **compounding reuse**: every ticket branches
from a `main` containing its predecessors, so ticket 7 can extend a component ticket 3 built. Running
concurrently forfeits that — N agents that cannot see each other will solve the same problem N ways.

Two phases buy it back, one at each end:

- **The pre-pass (Phase 2)** reads every ticket's Figma frames _together_, builds the shared surface
  they will all need, and merges it before anything fans out. Sequential gives ticket 7 the benefit of
  tickets 1–6; the pre-pass gives every ticket the benefit of all of them.
- **The sweep (Phase 6)** catches what the pre-pass could not predict.

The pre-pass matters more than the sweep. It is cheaper to share a component up front than to
extract it from seven copies afterwards, and it removes most integration conflicts by making the
shared-file edits once instead of N times concurrently.

## Arguments

`$ARGUMENTS`

A Linear parent ticket (sub-issues are expanded) or several ticket URLs/IDs.

```
/batch-parallel MAM-260
/batch-parallel MAM-1907 MAM-1908 MAM-1909 MAM-1910 MAM-1911
/batch-parallel MAM-260 --workers=6
```

**Flags**

- `--workers={N}` — concurrent worktrees, default **4**. Each is a full checkout at roughly 1.6 GB
- `--no-prepass` — skip Phase 2. Only for batches with no shared surface (unrelated bug fixes)
- `--no-consolidate` — skip Phase 6. **Refused** unless `--no-prepass` is also set: with both recovery
  phases off this is just N disconnected branches
- `--from {i}` / `--only {i}` — reuse the existing manifest
- `--yes` — skip the Phase 1 confirmation and run start to finish with no input at all

## Unattended contract

**Never call `AskUserQuestion`, in this skill or in any agent it launches.** Every decision below has
a defined default, and anything genuinely undecidable is deferred to Phase 5 rather than asked about.
The only interactive moment is the Phase 1 manifest preview, which `--yes` removes.

Everything auto-merges, including the pre-pass and the sweep. Each is a single squashed commit on
`main` and therefore a single `git revert` if you dislike the result.

---

## Phase 0: Prerequisites

Report **all** failures in one message; do not proceed until they pass.

1. Working tree clean, on `main`, `git pull` succeeds
2. `gh auth status` succeeds
3. `FIGMA_PERSONAL_ACCESS_TOKEN` in `.env.development`; Figma MCP available
4. `playwright` resolves in `node_modules` — Phase 3 drives it from Bash, not the MCP
5. `git worktree list` shows no leftovers. If any exist, report each with
   `git -C {path} status --porcelain`; remove the clean ones and **stop** if any holds uncommitted
   work
6. Free disk ≥ `1.6 GB × workers` plus headroom

---

## Phase 1: Manifest

Follow `.claude/shared/ticket-manifest.md` in full. Write to
`.claude/skills/batch-parallel/tickets.json`.

Preview and confirm as that document describes, unless `--yes`.

---

## Phase 2: Shared-surface pre-pass

Skip with `--no-prepass`.

### 2a. Decide the shared surface (one agent, serial)

Launch one agent with **every** ticket's description and Figma URLs at once:

```
You are reading {N} tickets that will be built concurrently by agents that cannot see each other's
work. Your job is to decide what they should share, before any of them starts.

Tickets:
{for each: linearId, name, ticketDescription, desktop, mobile}

1. Read every Figma frame via the Figma MCP.
2. Inventory what already exists — components/, tools/helpers/, tools/hooks/, tools/sass/,
   tools/sass/global/_variables.scss. Prefer extending something over adding something.
3. Identify what two or more tickets will need in common: a layout primitive, a card, a numbering or
   formatting helper, a design token, a Text/Link variant.
4. For each, decide: extend an existing thing, or create a new one.

Propose only what at least two tickets need. A single-consumer component built here is worse than
one built inside the ticket that needs it — it is speculative API design with no second example to
check it against.

Return a JSON array: [{ name, kind: component|token|helper|hook|variant, action: extend|create,
target, consumers: [linearId], figma: url|null, dependsOn: [name], rationale }]
```

Write the result to `.claude/skills/batch-parallel/prepass.json`.

**The `dependsOn` field is load-bearing.** If the pre-pass yields both `Card` and a `CardGrid` that
composes it, they are not independent and cannot be built concurrently.

### 2b. Build it

Treat each entry as a miniature ticket and run **Phases 3 and 4 over `prepass.json`** — same
worktrees, same ports, same reviews, same integration train.

Two differences:

- **Respect `dependsOn`.** Build in dependency order; only entries with no unbuilt dependency run
  concurrently. Chains here are short (1–3 items).
- **Reviews are not optional.** Every entry gets a story — that is how anything acquires a test in
  this repo — plus `/review-code`, and `/review-design` where `figma` is non-null. A defect in a
  section affects one page; a defect here is inherited by every consumer.

### 2c. Gate

**Every pre-pass entry must be merged to `main` before Phase 3 starts.** The entire purpose is that
sections build _against_ it. Then:

```bash
git checkout main && git pull origin main
yarn fix && yarn ts:check && yarn test
```

If the suite is red, **stop the run**. Fanning out onto a broken foundation multiplies one failure by
N.

---

## Phase 3: Parallel build

For each ticket, at most `--workers` at a time, launch a `general-purpose` Agent with
`isolation: "worktree"`.

### 3a. Bootstrap each worktree

```bash
cp .env.development {worktree}/.env.development
(cd {worktree} && yarn install --immutable)
(cd {worktree} && yarn storybook --port {PORT} > /tmp/storybook-{PORT}.log 2>&1 &)
until curl -s -o /dev/null http://localhost:{PORT}/iframe.html; do sleep 1; done
```

`{PORT}` is `6100 + slot`, where `slot` is the worker slot, not the ticket index — so ports are reused
as slots free up, and 6006 stays clear for whatever Storybook you have open.

Both copies are load-bearing. `.env.development` is gitignored, so a fresh checkout has none;
`vitest.config.ts` loads it explicitly, `generate-fixtures.ts` needs it, and `next.config.js` calls
`fetchSanityRedirects()` in `redirects()`, which throws `Configuration must contain projectId`
without it. `nodeLinker` is `node-modules`, so each worktree needs a real install.

### 3b. Run the whole ticket

Inside the worktree the agent runs **Steps A, B, C and D of `/batch-tickets`** — branch, implement,
`/review-design`, `/review-code` — then `yarn fix && yarn ts:check && yarn test` and `/commit`.

Pass to both review commands:

```
--storybook-port={PORT} --browser=bash
```

**Both are required and neither fails loudly if omitted.** A shared port means every concurrent
review measures whichever worktree owns 6006 and returns confidently wrong numbers. The Playwright
MCP is one browser for the whole session, so concurrent `browser_navigate` calls interleave in a
single tab. Each agent needs its own Storybook and its own browser process.

The agent must **not** push, must not open a PR, and must not touch `main`.

### 3c. Teardown on failure

A ticket that fails here is dropped from the integration train. Tear its worktree down (Phase 4d) and
continue; the rest are unaffected.

---

## Phase 4: Integration train

Serial, in manifest order, one ticket at a time. No reviews run here — they already have — so this is
minutes per ticket, not an hour.

### 4a. Rebase

```bash
git -C {worktree} fetch origin main
git -C {worktree} rebase origin/main
```

### 4b. Resolve by tier

**Tier 1 — derivable.** The four section registration files. Both sides appended to a short sorted
list and git's three-line context made them overlap; the union is recomputable:

```bash
git -C {worktree} checkout --ours {the four files}
(cd {worktree} && yarn sections:register)
git -C {worktree} add {the four files}
```

**Tier 2 — additive only.** Both sides add distinct lines; neither modifies a line the other touched.
Common in `_variables.scss` and shared components — two branches appending different tokens or props.
Keep both hunks in manifest order, then prove it:

```bash
(cd {worktree} && yarn fix && yarn ts:check && yarn test)
```

The story tests are what make this safe: a bad union fails to render rather than merging quietly.

**Tier 3 — same lines changed on both sides.** Do not guess which intent wins. Abort the rebase,
requeue the ticket to Phase 5, tear down its worktree, and carry on:

```bash
git -C {worktree} rebase --abort
```

### 4c. Ship

Push, open the PR, squash-merge, set Linear to Done — exactly as `/batch-tickets` Step E.

### 4d. Teardown

```bash
git -C {worktree} status --porcelain     # must be empty; if not, keep it and report
git worktree remove --force --force {worktree}
git worktree prune
git branch -D {ticket.branch} 2>/dev/null || true
```

`--force` twice because agent worktrees are created locked; a single `-f` only covers dirty. Check
for uncommitted work first — forcing unconditionally destroys it silently.

---

## Phase 5: Serial tail

Any ticket requeued by a tier-3 conflict is rebuilt **from current `main`**, sequentially, via
`/batch-tickets --only {index}`.

This is the whole reason the run needs no supervision. A genuine conflict is not resolved by
guessing; it is resolved by rebuilding that one ticket against a `main` that now contains whatever it
collided with — which is exactly what sequential mode would have done, and costs that ticket its hour
rather than your attention.

Expect this to be rare once the pre-pass is doing its job, since the shared files it would collide in
were edited once, up front.

---

## Phase 6: Sweep

Skip only with `--no-consolidate` (refused unless `--no-prepass` is also set).

```bash
git checkout main && git pull origin main
```

Run `/consolidate` over the `reviewName` of every ticket that landed, plus every pre-pass entry.

**Auto-merge it**, gated on all of:

- `yarn fix && yarn ts:check` clean
- `yarn test` green
- story-test count **not lower** than before the sweep — an extraction that deletes a story has
  removed a test, not simplified one

If any gate fails, discard the sweep branch and report it. The batch still succeeded; only the
tidy-up did not.

Expect a larger PR than after a sequential run: agents that could not see each other will have solved
the same problem several ways, so the sweep rewrites several sections at once.

---

## Phase 7: Report

```
========================================
 Batch Parallel — Complete
========================================
Pre-pass:    {n} shared items merged ({list})
Built:       {n} parallel / {n} rebuilt in the serial tail
Failed:      {n} ({list with the phase each failed in})
Sweep:       {merged — n extractions} / {gate failed} / {nothing to extract} / {skipped}
Worktrees:   {n} removed  (kept: {list or none})
Wall clock:  {duration}   Sequential estimate: {n tickets × slowest ticket}
```

Delete `tickets.json` and `prepass.json` unless anything failed — a failed run is resumable with
`--from`.

## Error handling

- Phase 2 gate red → **stop the run**. Everything downstream builds on it
- Phase 3 ticket fails → drop from the train, tear down, continue
- Tier-3 conflict → requeue to Phase 5, tear down, continue
- Phase 4 push/merge fails → log, keep the worktree, continue
- Sweep gate fails → discard the sweep branch only
- Always return to `main`; never leave a worktree holding uncommitted work without naming it
