# Batch Tickets

Autonomous pipeline that generates a ticket manifest from Linear, then implements, reviews, commits and merges each ticket. Sequential by default; `--parallel` fans implementation out across isolated git worktrees and keeps the merges serial. Each step runs in a separate Agent to keep context fresh.

It handles arbitrary tickets — sections, components, bug fixes, refactors, content changes — routing each to the right slash command (`/create-section`, `/create-component`) or executing the work directly.

This replaced `/batch-sections` and `/batch-components`, which were the same pipeline with one word substituted. Nothing was lost: a `type: "section"` ticket here runs the identical Step B prompt, the identical reviews and the identical PR title those commands used.

## Arguments

`$ARGUMENTS`

**Expected format:** A Linear parent ticket URL/ID (with sub-issues) OR multiple Linear ticket URLs/IDs separated by spaces.

**Examples:**

- `/batch-tickets MAM-260` — parent ticket, process all sub-issues
- `/batch-tickets MAM-261 MAM-262 MAM-263` — individual tickets
- `/batch-tickets --from 2` — resume from index 2 (uses existing tickets.json)
- `/batch-tickets --only 0` — run only the first ticket (uses existing tickets.json)
- `/batch-tickets MAM-260 --parallel=4` — implement four at a time in worktrees, merge serially

**Optional flags:**

- `--from {index}` — Start from ticket index (0-based), skip earlier tickets
- `--only {index}` — Run only one ticket by index
- `--skip-reviews` — Skip review-design and review-code for every ticket, whatever its `reviews` flag says
- `--generate-only` — Generate tickets.json and stop (do not execute)
- `--parallel[={N}]` — Implement tickets concurrently in isolated git worktrees, then merge them one at a time. Default `N` is 4. See Phase 2-P.
- `--no-consolidate` — Skip the closing `/consolidate` pass (Phase 3). **Refused together with `--parallel`** — see Phase 3

**Manifest location:** `${CLAUDE_SKILL_DIR}/tickets.json`

---

## Phase 1: Generate tickets.json

**Skip this phase if `--from` or `--only` is passed** — these flags assume tickets.json already exists.

### 1a. Resolve tickets

Parse `$ARGUMENTS` to get Linear ticket IDs/URLs.

**If no arguments are provided (or only flags like `--skip-reviews`):**

Prompt the user using `AskUserQuestion`:

> **Linear tickets?** Paste one of the following:
>
> - A **parent ticket** URL or ID (e.g. `MAM-260`) — I'll process all its sub-issues
> - **Multiple ticket** URLs or IDs, one per line — I'll process each one
>
> Paste below:

Parse the response — split by newlines and/or spaces, extract all ticket IDs/URLs.

**If a single ticket is provided:**

1. Fetch it via `mcp__linear__get_issue`
2. Check if it has sub-issues (it's a parent). If yes, fetch all sub-issues via `mcp__linear__list_issues` filtered by `parentId`
3. If no sub-issues, treat it as a single ticket

**If multiple tickets are provided:**

1. Fetch each via `mcp__linear__get_issue`

### 1b. Extract ticket data and detect type

For each ticket, extract:

- **name** — A short label for logging. Derive from the title:
  - "Build {Name} section (...)" → `{Name}` (e.g. `Hero`)
  - "Build {Name} component (...)" / "Create {Name} component (...)" → `{Name}` (e.g. `Badge`)
  - Anything else → use the full title (truncate to 60 chars for display)
- **type** — Detect the ticket category for routing:
  - `section` — title matches `Build {Name} section` OR description mentions `/create-section`
  - `component` — title matches `Build {Name} component` / `Create {Name} component` OR description mentions `/create-component`
  - `other` — anything else (bug fix, refactor, content, config, etc.)
- **linearId** — The ticket identifier (e.g. "MAM-261")
- **linearUrl** — The ticket URL
- **branch** — The git branch name from Linear (`gitBranchName` field). If missing, construct one as `feature/{lowercase-id}-{slugified-title}`
- **desktop** / **mobile** / **additionalFigma** — Only for `section` and `component` types. Extract the `--desktop=` and `--mobile=` URLs from the slash command in the Technical Notes (or "Desktop:" / "Mobile:" labels). Other Figma URLs go into `additionalFigma` (string or `{name, url}` object). For `other` type, set all three to `null` / `[]`.
- **ticketDescription** — The full ticket description, verbatim. This is the primary context carrier — it contains requirements, approach notes, acceptance criteria, and anything else the developer wrote
- **commands** — Comments on the ticket (if any) appended to description for full context
- **reviews** — Boolean. Whether Steps C and D run for this ticket. Default to `true` when a `desktop` Figma URL was found, `false` otherwise
- **reviewName** — The argument Steps C and D pass to `/review-design` / `/review-code`, or `null` when `reviews` is `false`. For `section` this is `{Name}Section`; for `component` it is `{Name}`; for `other` it is whatever the work actually produced (a route ticket that builds a `Hero` sets `Hero`)

**`reviews` drives the reviews, not `type`.** These are separate on purpose. Type detection is a
title-pattern guess — `section` needs a title matching `Build {Name} section` or a description
mentioning `/create-section` — and plenty of real tickets that produce reviewable UI don't match it.
"Build the home route — hero, character select and CTA" is `type: "other"` and still yields a `Hero`
worth reviewing against Figma. Gating reviews on `type` would silently skip it. Gating on `reviews`
means a mis-detected `type` costs you the wrong Step B prompt, which is visible, rather than a
silently skipped review, which is not.

Check the `type` column in the Phase 1d preview before approving — it is the one field a wrong guess
makes expensive.

### 1c. Write tickets.json

Write the array to `.claude/skills/batch-tickets/tickets.json`:

```json
[
  {
    "name": "Hero",
    "type": "section",
    "linearId": "MAM-261",
    "linearUrl": "https://linear.app/mammoth/issue/MAM-261/...",
    "branch": "feature/mam-261-build-hero-section",
    "reviews": true,
    "reviewName": "HeroSection",
    "desktop": "https://figma.com/design/...?node-id=...",
    "mobile": "https://figma.com/design/...?node-id=...",
    "additionalFigma": [],
    "ticketDescription": "## Overview\n\nBuild the Hero section..."
  },
  {
    "name": "Badge",
    "type": "component",
    "linearId": "MAM-262",
    "linearUrl": "https://linear.app/mammoth/issue/MAM-262/...",
    "branch": "feature/mam-262-build-badge-component",
    "reviews": true,
    "reviewName": "Badge",
    "desktop": "https://figma.com/design/...?node-id=...",
    "mobile": "https://figma.com/design/...?node-id=...",
    "additionalFigma": [],
    "ticketDescription": "## Overview\n\nBuild the Badge component..."
  },
  {
    "name": "Fix mobile menu close on route change",
    "type": "other",
    "linearId": "MAM-263",
    "linearUrl": "https://linear.app/mammoth/issue/MAM-263/...",
    "branch": "bugfix/mam-263-mobile-menu-close",
    "reviews": false,
    "reviewName": null,
    "desktop": null,
    "mobile": null,
    "additionalFigma": [],
    "ticketDescription": "## Overview\n\nThe mobile menu stays open when..."
  }
]
```

### 1d. Preview and confirm

Display the manifest grouped by type:

```
tickets.json generated — {count} tickets:

  0: [section]    {name} ({linearId}) — desktop: ✓  mobile: ✓  reviews: {reviewName}
  1: [component]  {name} ({linearId}) — desktop: ✓  mobile: ✓  reviews: {reviewName}
  2: [other]      {name} ({linearId}) — reviews: —
  ...

Proceed with execution? (y/n)
```

If `--generate-only` was passed, stop here (do NOT delete tickets.json — the user may want to edit it before running again with `--from`).

Wait for user approval before proceeding to Phase 2.

---

## Phase 2: Execute Pipeline

### Prerequisites check

Before starting execution, verify:

1. Storybook is running — check with `curl -s -o /dev/null -w "%{http_code}" http://localhost:6006/iframe.html` (expect 200). If not running, start it once at the top of the run with `yarn storybook > /tmp/storybook.log 2>&1 &` and wait for it to respond.
2. Working tree is clean — `git status --porcelain` should be empty
3. Currently on `main` — `git branch --show-current` should output `main`
4. **`--parallel` only** — `git worktree list` shows no leftovers from an earlier run. Report any that exist, with whether each holds uncommitted work (`git -C {path} status --porcelain`), and let the user decide before creating more. They are locked and roughly 1.6 GB each, so a few stale ones are both invisible and expensive.
5. **Conditional checks** — only required if any ticket in the manifest has `reviews: true` (and `--skip-reviews` is not set):
   - Figma MCP is available — check for `mcp__figma__get_design_context` via ToolSearch
   - `FIGMA_PERSONAL_ACCESS_TOKEN` is set in `.env.development`
   - Playwright MCP is available — check for `mcp__playwright__browser_navigate` via ToolSearch

Report ALL failures in a single message. Do not proceed until all checks pass.

### Parse flags

- `--from {index}` — Skip tickets before this index
- `--only {index}` — Only run the ticket at this index
- `--skip-reviews` — Skip Steps C and D for ALL tickets, overriding each ticket's `reviews` flag

### Read manifest

Read `.claude/skills/batch-tickets/tickets.json` and determine which tickets to process based on flags.

### For each ticket (sequentially):

---

#### Step A: Setup branch

Run these git commands directly (not in an agent):

```bash
git checkout main
git pull origin main
git checkout -b {ticket.branch}
```

Update the Linear ticket status to **In Progress** via `mcp__linear__save_issue`.

---

#### Step B: Execute ticket (Agent)

The agent prompt depends on `ticket.type`:

**For `type: "section"`:**

```
**Ticket context:**
{ticket.ticketDescription}

**Additional Figma references:**
{for each entry in ticket.additionalFigma, list them}

---

Create a new Sanity section called "{ticket.name}" for the Next.js page builder.

Read and follow the /create-section command at .claude/commands/create-section.md with these arguments:
  {ticket.name} --no-plan --desktop={ticket.desktop} --mobile={ticket.mobile}

IMPORTANT:
- Do NOT use AskUserQuestion at any point — all context is provided above
- Do NOT enter plan mode — --no-plan is set
- Skip Interactive Prompting — infer everything from the Figma design and ticket context
- After creating all files, run: yarn fix && yarn ts:check
- Fix any errors before completing
- Do NOT run /review-design or /review-code — those are separate steps
- Do NOT run /commit — that happens after this agent completes
```

**For `type: "component"`:**

```
**Ticket context:**
{ticket.ticketDescription}

**Additional Figma references:**
{for each entry in ticket.additionalFigma, list them}

---

Create a new reusable UI component called "{ticket.name}" for the Next.js project.

Read and follow the /create-component command at .claude/commands/create-component.md with these arguments:
  {ticket.name} --no-plan --desktop={ticket.desktop} --mobile={ticket.mobile}

IMPORTANT:
- Do NOT use AskUserQuestion at any point — all context is provided above
- Do NOT enter plan mode — --no-plan is set
- Skip Interactive Prompting — infer everything from the Figma design and ticket context
- After creating all files, run: yarn fix && yarn ts:check
- Fix any errors before completing
- Do NOT run /review-design or /review-code — those are separate steps
- Do NOT run /commit — that happens after this agent completes
```

**For `type: "other"`:**

```
**Ticket:** {ticket.linearId} — {ticket.name}
**Branch:** {ticket.branch} (already checked out)

**Ticket description:**
{ticket.ticketDescription}

---

Implement the work described in the ticket above. The branch is already set up — start directly with implementation.

Process:
1. Read the ticket description carefully and identify the type of work (bug fix, feature, refactor, content change, config change, etc.)
2. Identify which files/areas of the codebase are affected
3. Read the relevant files
4. Implement the changes following all conventions in CLAUDE.md
5. After each logical unit of work, run: yarn fix && yarn ts:check
6. Fix any errors before completing

IMPORTANT:
- Do NOT use AskUserQuestion at any point — make decisions based on the ticket description and codebase conventions
- Do NOT enter plan mode — execute directly
- Do NOT switch branches — you are already on the correct branch
- Do NOT run /commit — that happens after this agent completes
- If the ticket is ambiguous or genuinely cannot be implemented without clarification, stop and report what is missing rather than guessing wildly. The pipeline will mark the ticket as failed and continue to the next.
```

Wait for the agent to complete. If it fails, log the error, skip Steps C-E, and continue to the next ticket.

After the agent completes, run `/commit` directly (not in an agent).

---

#### Step C: Review design (Agent) — when `ticket.reviews` is `true`, skip if `--skip-reviews`

Skip entirely when `ticket.reviews` is `false`. Note this is **not** keyed on `ticket.type` — see
"`reviews` drives the reviews" in Phase 1b.

Launch a `general-purpose` Agent:

```
Run /review-design {ticket.reviewName}

Desktop Figma: {ticket.desktop}
Mobile Figma: {ticket.mobile}

Complete all phases autonomously:
- Do NOT use AskUserQuestion — make decisions based on the Figma design
- Fix all issues found
- Verify fixes with screenshots and re-measurement
- Do NOT run /commit — that happens after this agent completes
```

`/review-design` resolves the target itself (`sections/{Name}Section/` then `components/{Name}/`), so
`reviewName` carries the full name — `HeroSection`, not `Hero`. It degrades gracefully when the story
has no `parameters.design` bound: token/compliance review instead of the pixel comparison.

Wait for the agent to complete. If it fails, log a warning but continue.

After the agent completes, run `/commit` directly (not in an agent) if there are changes.

---

#### Step D: Review code (Agent) — when `ticket.reviews` is `true`, skip if `--skip-reviews`

```
Run /review-code {ticket.reviewName}

Complete all phases autonomously:
- Do NOT use AskUserQuestion — make decisions based on best practices
- Fix all issues found
- Do NOT run /commit — that happens after this agent completes
```

**This step reviews the ticket in isolation, and that is deliberate.** Cross-section duplication is
not its job and it cannot do that job here: `code-quality-reviewer` only recommends extracting a
pattern found in 3+ places, and at ticket _n_ the sections from tickets _n+1…_ do not exist yet. The
threshold cannot fire for anything this batch is introducing. Phase 3 runs once at the end, when they
all exist, and owns that question.

Wait for the agent to complete. If it fails, log a warning but continue.

After the agent completes, run `/commit` directly (not in an agent) if there are changes.

---

#### Step E: Push, PR, and merge

Determine the PR title prefix based on `ticket.type`:

- `section` → `Add {name} section`
- `component` → `Add {name} component`
- `other` → use the ticket title (the value stored in `name` for non-section/component tickets)

Run these commands directly (not in an agent). In `--parallel` mode every command runs with `-C
{worktree}` until the worktree is removed:

```bash
# Push
git push -u origin HEAD

# Create PR (title and body adapted per type)
gh pr create --base main \
  --title "{ticket.linearId}: {pr title prefix}" \
  --body "$(cat <<'EOF'
## Summary
{For section/component: "Add {name} {type} built from Figma design."}
{For other: "Implements ticket {linearId}. See Linear for details."}

## Linear
{ticket.linearUrl}
EOF
)"

# Merge (squash)
gh pr merge --squash --delete-branch

# Return to main
git checkout main
git pull origin main
```

Update the Linear ticket status to **Done** via `mcp__linear__save_issue`.

##### Worktree teardown (`--parallel` only)

**Nothing cleans this up for you.** A worktree created with the Agent tool's `isolation: "worktree"`
is auto-removed only when it is _unchanged_, and a ticket agent always leaves changes. It is also
created **locked**, which `git worktree remove` refuses on — hence `--force` twice below (git's
manual: a locked worktree needs `--force` specified twice; a single `-f` only covers dirty).

**Check for uncommitted work before removing anything.** By this point Step E has merged the branch,
so the worktree should be clean — if it is not, something did not get committed, and `--force` would
destroy it silently:

```bash
# 1. Refuse to discard work. If this prints anything, keep the worktree and
#    report it in the summary instead of removing it.
git -C {worktree} status --porcelain

# 2. Only when the above is empty. Twice, because the worktree is locked.
git worktree remove --force --force {worktree}

# 3. Drop the administrative entry if the directory was already gone.
git worktree prune

# 4. Only now can the local branch go — git refuses while a worktree holds it
#    checked out. `--delete-branch` on the merge above removed the remote one.
git branch -D {ticket.branch} 2>/dev/null || true
```

Do this for failed tickets too — a failed ticket's worktree is still a full checkout costing a
`node_modules`, and at ~1.6 GB each they are not free. But apply the same rule: if it holds
uncommitted work, keep it and name it in the summary so the user knows it is there and why.

**Orphaned worktrees are the default failure mode here, not an edge case.** An interrupted run leaves
its worktrees registered, locked, and invisible unless you go looking. Start every `--parallel` run
with `git worktree list` and report anything already present before creating more.

If any step fails, log a warning and continue to the next ticket. Always return to `main`, and always
tear the worktree down.

---

#### Step F: Log result

Print: `[{index+1}/{total}] {ticket.linearId}: {ticket.name} ({ticket.type}) — DONE`

---

---

## Phase 2-P: Parallel execution (`--parallel[={N}]`)

Same steps, regrouped. Implementation fans out across isolated git worktrees; everything that touches
a browser or `main` stays serial.

**What can and cannot be parallelised.** Step B is pure codegen and filesystem work — it parallelises
cleanly. Steps C and D cannot: Storybook is a single instance on a hardcoded port 6006 (8 references
in `review-design.md`, 4 in `review-code.md`, 3 in `design-visual-comparer.md`), so N concurrent
reviews would all measure whichever worktree owns the port and return confidently wrong numbers. The
Playwright MCP is also one browser shared across the session, so concurrent `browser_navigate` calls
interleave in the same tab. Neither fails loudly. Keep them serial.

So `--parallel` buys the implementation phase — Figma reads, five-file scaffolds, iterate-to-green —
which is the long pole, but it is not an N× speedup.

### 2-P a. Fan out (concurrent, `N` at a time)

For each ticket, launch a `general-purpose` Agent with `isolation: "worktree"` running **Step A + Step
B only**, plus `yarn fix && yarn ts:check` and a `/commit`. No reviews, no Storybook, no Playwright.

Each worktree needs bootstrapping before the agent can build — a fresh worktree is a clean checkout:

```bash
cp .env.development {worktree}/.env.development   # gitignored, so the checkout has none
(cd {worktree} && yarn install --immutable)        # nodeLinker is node-modules, not PnP
```

Both are load-bearing. `vitest.config.ts` loads `.env.development` explicitly, `generate-fixtures.ts`
needs it, and `next.config.js` calls `fetchSanityRedirects()` in its `redirects()` hook, which throws
`Configuration must contain projectId` without it.

Give the agent its ticket's branch name so it does not invent one, and tell it not to push.

### 2-P b. Merge train (serial, manifest order)

For each ticket **in manifest order**, one at a time:

```bash
git -C {worktree} fetch origin main
git -C {worktree} rebase origin/main
```

**Resolve conflicts by tier — do not hand-resolve tier 1 or 2.**

**Tier 1 — derivable.** The four section registration files (`sections/index.ts`,
`tools/sanity/helpers/sections.ts`, `tools/sanity/schema/index.ts`,
`tools/sanity/projections/common/sections.groq.ts`). Both sides appended to a short sorted list and
git's three-line context made them overlap; the union is recomputable:

```bash
git -C {worktree} checkout --ours {conflicted registration files}
(cd {worktree} && yarn sections:register)
git -C {worktree} add {those four files}
```

**Tier 2 — additive only.** Both sides add distinct lines and neither modifies a line the other
touched. This is the common case in `tools/sass/global/_variables.scss` and shared components: two
branches appending different tokens, or different props. Take both sides, in manifest order:

```bash
# keep both hunks, drop the conflict markers, then prove it
(cd {worktree} && yarn fix && yarn ts:check && yarn test)
```

`yarn test` is the verifier that makes this safe — 227 story tests render every component in a real
browser, so a bad union fails rather than merging quietly.

**Tier 3 — modify/modify.** Both sides changed the same lines. Stop, report it, leave that ticket for
a human. Do not guess which intent wins.

```bash
git -C {worktree} rebase --continue   # after tier 1 or 2
```

Then run Steps C, D and E for that ticket exactly as in sequential mode — reviews against the single
Storybook, then PR, merge, and worktree teardown — before starting the next ticket's rebase.

### 2-P c. Failure handling

A ticket that fails in 2-P a is dropped from the merge train, its worktree torn down, and the rest
continue. A ticket that fails its rebase keeps its worktree (say so in the summary) so the conflict
can be inspected.

---

## Phase 3: Consolidate (skip with `--no-consolidate`)

Run once, after every ticket has merged and `main` is up to date:

```bash
git checkout main && git pull origin main
```

Then run `/consolidate` with the names of everything this batch produced — the `reviewName` of every
ticket that succeeded, plus any section or component folder created along the way:

```
/consolidate {name} {name} {name} …
```

**Why this is a separate pass rather than part of Step D.** `code-quality-reviewer` only recommends
extracting a pattern it finds in 3+ places. During the batch, ticket _n_ is reviewed when the work
from tickets _n+1…_ does not exist, so that threshold cannot fire for anything the batch itself is
introducing — and batch-introduced duplication is the most likely kind, because every section comes
from one design system and one Figma file. This is the only point in the run where they all coexist.

**After a `--parallel` run this phase is mandatory, not optional** — `--parallel --no-consolidate`
is refused. Serial mode gets reuse for free, because each ticket branches from a `main` containing
its predecessors and can extend a shared component and retrofit earlier adopters (MAM-1906 did
exactly that: it extended `TextBlock` and removed overrides from HeaderDisplay and Schedule). Parallel
forfeits that, so the sweep is where it comes back. Skipping it ships the duplication and cancels the
cleanup.

Expect a **larger PR after a parallel run**, and say so when opening it. N agents that could not see
each other will have solved the same problem N ways, so the sweep rewrites many sections at once
rather than the incremental drip serial produces. That is the trade, not a defect — and it carries
one advantage serial lacks: serial hides demand (once ticket 2 adds a `Text` variant, tickets 3–7 use
it silently), whereas parallel surfaces all N instances, which is a far better signal for what the
shared API should be.

`/consolidate` opens a PR and **does not merge it**. Every other PR in this pipeline is a
self-contained addition; this one rewrites already-merged, already-reviewed code across many files.
It has a real safety net — every story is a browser component test, so `yarn test` exercises each
section's render — but it is the one PR in the run that a human should look at.

Report the PR URL in the summary. If `/consolidate` finds nothing worth extracting, it says so and
opens no PR — that is a normal outcome for a small batch.

---

### Cleanup

After all tickets have been processed (or if only `--only` was used and that ticket completed), **delete the manifest**:

```bash
rm -f .claude/skills/batch-tickets/tickets.json
```

This prevents accidentally re-running the pipeline against a stale manifest. If the user needs to re-run, they should generate a fresh manifest from Linear.

**Do NOT delete tickets.json if:**

- The pipeline was interrupted by a fatal error (the user may want to resume with `--from`)
- `--generate-only` was passed (the user explicitly wants to keep it)
- Any tickets failed (the user may want to investigate and resume)

---

### Summary

After all tickets complete, print:

```
========================================
 Batch Tickets — Complete
 Passed: {count}
 Failed: {count}
 Skipped: {count}
========================================

Results:
  ✓ [section]    Hero (MAM-261)
  ✓ [component]  Badge (MAM-262)
  ✗ [other]      Fix mobile menu close (MAM-263) — failed at: execute
  ⊘ [section]    Footer (MAM-264) — skipped (--from)

tickets.json has been deleted.

Consolidation: {PR url — awaiting human review} / {nothing to extract} / {skipped}
Worktrees removed: {count}  (kept for inspection: {list or none})
```

## Error Handling

- If Step B (execute) fails → skip Steps C-E for that ticket, mark as failed, continue to next
- If Step C or D (reviews) fail → log warning, continue to Step E (the work is still usable)
- If Step E (PR/merge) fails → log warning, continue to next ticket
- Always return to `main` before starting the next ticket
- If `git checkout main` fails (dirty tree), run `git stash` then `git checkout main`
- On fatal/unrecoverable error → do NOT delete tickets.json (user can resume with `--from`)
- If any ticket failed in this run → do NOT delete tickets.json (user can investigate and resume with `--from {failed-index}` or `--only {failed-index}`)
