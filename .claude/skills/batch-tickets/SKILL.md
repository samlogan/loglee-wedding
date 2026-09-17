# Batch Tickets

Autonomous pipeline that generates a ticket manifest from Linear, then implements, reviews, commits and merges each ticket — **one at a time, in order**. Each step runs in a separate Agent to keep context fresh.

Sequential is the point, not a limitation: every ticket branches from a `main` containing its predecessors, so each one can reuse and extend what came before. For concurrency, see `/batch-parallel`, which trades that for wall-clock and rebuilds the reuse with a shared-surface pre-pass and a closing sweep.

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

**Optional flags:**

- `--from {index}` — Start from ticket index (0-based), skip earlier tickets
- `--only {index}` — Run only one ticket by index
- `--skip-reviews` — Skip review-design and review-code for every ticket, whatever its `reviews` flag says
- `--generate-only` — Generate tickets.json and stop (do not execute)
- `--no-consolidate` — Skip the closing `/consolidate` pass (Phase 3)

**Manifest location:** `${CLAUDE_SKILL_DIR}/tickets.json`

---

## Phase 1: Generate tickets.json

Follow `.claude/shared/ticket-manifest.md` in full — ticket resolution, field extraction (including
`reviews` / `reviewName`), the JSON shape, and the preview-and-confirm gate.

Write the result to `.claude/skills/batch-tickets/tickets.json`.

**Skip this phase if `--from` or `--only` is passed** — those flags assume the manifest exists.

---

## Phase 2: Execute Pipeline

### Prerequisites check

Before starting execution, verify:

1. Storybook is running — check with `curl -s -o /dev/null -w "%{http_code}" http://localhost:6006/iframe.html` (expect 200). If not running, start it once at the top of the run with `yarn storybook > /tmp/storybook.log 2>&1 &` and wait for it to respond.
2. Working tree is clean — `git status --porcelain` should be empty
3. Currently on `main` — `git branch --show-current` should output `main`
4. **Conditional checks** — only required if any ticket in the manifest has `reviews: true` (and `--skip-reviews` is not set):
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

Run these commands directly (not in an agent):

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

If any step fails, log a warning and continue to the next ticket. Always return to `main`.

---

#### Step F: Log result

Print: `[{index+1}/{total}] {ticket.linearId}: {ticket.name} ({ticket.type}) — DONE`

---

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
```

## Error Handling

- If Step B (execute) fails → skip Steps C-E for that ticket, mark as failed, continue to next
- If Step C or D (reviews) fail → log warning, continue to Step E (the work is still usable)
- If Step E (PR/merge) fails → log warning, continue to next ticket
- Always return to `main` before starting the next ticket
- If `git checkout main` fails (dirty tree), run `git stash` then `git checkout main`
- On fatal/unrecoverable error → do NOT delete tickets.json (user can resume with `--from`)
- If any ticket failed in this run → do NOT delete tickets.json (user can investigate and resume with `--from {failed-index}` or `--only {failed-index}`)
