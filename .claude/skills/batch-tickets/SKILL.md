# Batch Tickets

Autonomous pipeline that generates a ticket manifest from Linear, then implements, reviews, commits, and merges each ticket — one at a time, sequentially. Each step runs in a separate Agent to keep context fresh.

This is the generalised cousin of `/batch-sections` and `/batch-components`. It handles arbitrary tickets — sections, components, bug fixes, refactors, content changes — by delegating each one to `/ticket`, which routes to the right slash command (`/create-section`, `/create-component`) or executes the work directly.

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
- `--skip-reviews` — Skip review-design and review-code, even for section/component tickets
- `--generate-only` — Generate tickets.json and stop (do not execute)

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

  0: [section]    {name} ({linearId}) — desktop: ✓  mobile: ✓
  1: [component]  {name} ({linearId}) — desktop: ✓  mobile: ✓
  2: [other]      {name} ({linearId})
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
4. **Conditional checks** — only required if the manifest contains any `section` or `component` tickets:
   - Figma MCP is available — check for `mcp__figma__get_design_context` via ToolSearch
   - `FIGMA_PERSONAL_ACCESS_TOKEN` is set in `.env.development`
   - Playwright MCP is available — check for `mcp__playwright__browser_navigate` via ToolSearch (only if `--skip-reviews` is NOT set)

Report ALL failures in a single message. Do not proceed until all checks pass.

### Parse flags

- `--from {index}` — Skip tickets before this index
- `--only {index}` — Only run the ticket at this index
- `--skip-reviews` — Skip Steps C and D for ALL tickets (even sections/components)

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

#### Step C: Review design (Agent) — only for `section` and `component` types, skip if `--skip-reviews`

For `type: "other"`, skip this step entirely (design review only applies to visual UI work tied to a Figma reference).

**For `type: "section"`:**

```
Run /review-design {ticket.name}Section

Desktop Figma: {ticket.desktop}
Mobile Figma: {ticket.mobile}

Complete all phases autonomously:
- Do NOT use AskUserQuestion — make decisions based on the Figma design
- Fix all issues found
- Verify fixes with screenshots and re-measurement
- Clean up the review page when done
- Do NOT run /commit — that happens after this agent completes
```

**For `type: "component"`:**

```
Run /review-design {ticket.name}

Desktop Figma: {ticket.desktop}
Mobile Figma: {ticket.mobile}

Complete all phases autonomously:
- Do NOT use AskUserQuestion — make decisions based on the Figma design
- Fix all issues found
- Verify fixes with screenshots and re-measurement
- Clean up the review page when done
- Do NOT run /commit — that happens after this agent completes
```

Wait for the agent to complete. If it fails, log a warning but continue.

After the agent completes, run `/commit` directly (not in an agent) if there are changes.

---

#### Step D: Review code (Agent) — only for `section` and `component` types, skip if `--skip-reviews`

For `type: "other"`, skip this step entirely. Code review of arbitrary ticket work is too open-ended for this autonomous pipeline — leave it for human review on the PR.

**For `type: "section"`:**

```
Run /review-code {ticket.name}Section

Complete all phases autonomously:
- Do NOT use AskUserQuestion — make decisions based on best practices
- Fix all issues found
- Do NOT run /commit — that happens after this agent completes
```

**For `type: "component"`:**

```
Run /review-code {ticket.name}

Complete all phases autonomously:
- Do NOT use AskUserQuestion — make decisions based on best practices
- Fix all issues found
- Do NOT run /commit — that happens after this agent completes
```

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
```

## Error Handling

- If Step B (execute) fails → skip Steps C-E for that ticket, mark as failed, continue to next
- If Step C or D (reviews) fail → log warning, continue to Step E (the work is still usable)
- If Step E (PR/merge) fails → log warning, continue to next ticket
- Always return to `main` before starting the next ticket
- If `git checkout main` fails (dirty tree), run `git stash` then `git checkout main`
- On fatal/unrecoverable error → do NOT delete tickets.json (user can resume with `--from`)
- If any ticket failed in this run → do NOT delete tickets.json (user can investigate and resume with `--from {failed-index}` or `--only {failed-index}`)
