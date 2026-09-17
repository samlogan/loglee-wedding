# Batch Components

Autonomous pipeline that generates a component manifest from Linear tickets, then creates, reviews, commits, and merges each component — one at a time, sequentially. Each step runs in a separate Agent to keep context fresh.

## Arguments

`$ARGUMENTS`

**Expected format:** A Linear parent ticket URL/ID (with sub-issues) OR multiple Linear ticket URLs/IDs separated by spaces.

**Examples:**

- `/batch-components MAM-260` — parent ticket, process all sub-issues
- `/batch-components MAM-261 MAM-262 MAM-263` — individual tickets
- `/batch-components --from 2` — resume from index 2 (uses existing components.json)
- `/batch-components --only 0` — run only the first component (uses existing components.json)

**Optional flags:**

- `--from {index}` — Start from component index (0-based), skip earlier components
- `--only {index}` — Run only one component by index
- `--skip-reviews` — Skip review-design and review-code, only create + commit + PR
- `--generate-only` — Generate components.json and stop (do not execute)

**Manifest location:** `${CLAUDE_SKILL_DIR}/components.json`

---

## Phase 1: Generate components.json

**Skip this phase if `--from` or `--only` is passed** — these flags assume components.json already exists.

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
3. If no sub-issues, treat it as a single component

**If multiple tickets are provided:**

1. Fetch each via `mcp__linear__get_issue`

### 1b. Extract component data from each ticket

For each ticket, extract:

- **name** — Parse the component name from the title. The title usually follows "Build {Name} component (...)" or "Create {Name} component (...)". Extract the PascalCase name (e.g. "Build Badge component (variants, sizes)" → "Badge")
- **linearId** — The ticket identifier (e.g. "MAM-261")
- **linearUrl** — The ticket URL
- **branch** — The git branch name from Linear (`gitBranchName` field)
- **desktop** — Extract the `--desktop=` URL from the `/create-component` command in the Technical Notes. If not found, look for a line labelled "Desktop:" in the Figma section
- **mobile** — Extract the `--mobile=` URL from the `/create-component` command in the Technical Notes. If not found, look for a line labelled "Mobile:" in the Figma section
- **additionalFigma** — Any other Figma URLs in the description that are NOT the desktop or mobile URLs. Store as an array where each entry is either:
  - A string (just the URL) if no label is evident
  - An object `{ "name": "...", "url": "..." }` if the URL has a label/description near it in the markdown
- **ticketDescription** — The full ticket description, verbatim. This is the primary context carrier — it contains requirements, approach notes, acceptance criteria, and anything else the developer wrote

### 1c. Write components.json

Write the array to `.claude/skills/batch-components/components.json`:

```json
[
  {
    "name": "Badge",
    "linearId": "MAM-261",
    "linearUrl": "https://linear.app/mammoth/issue/MAM-261/...",
    "branch": "feature/mam-261-build-badge-component",
    "desktop": "https://figma.com/design/...?node-id=...",
    "mobile": "https://figma.com/design/...?node-id=...",
    "additionalFigma": [],
    "ticketDescription": "## Overview\n\nBuild the Badge component..."
  },
  {
    "name": "Tooltip",
    "linearId": "MAM-262",
    "linearUrl": "https://linear.app/mammoth/issue/MAM-262/...",
    "branch": "feature/mam-262-build-tooltip-component",
    "desktop": "https://figma.com/design/...?node-id=...",
    "mobile": "https://figma.com/design/...?node-id=...",
    "additionalFigma": [
      "https://figma.com/design/...?node-id=...",
      { "name": "Tooltip alt state (hover)", "url": "https://figma.com/design/...?node-id=..." }
    ],
    "ticketDescription": "## Overview\n\nBuild the Tooltip component..."
  }
]
```

### 1d. Preview and confirm

Display the manifest:

```
components.json generated — {count} components:

  0: {name} ({linearId}) — desktop: ✓  mobile: ✓  extras: {count}
  1: {name} ({linearId}) — desktop: ✓  mobile: ✗  extras: {count}
  ...

Proceed with execution? (y/n)
```

If `--generate-only` was passed, stop here (do NOT delete components.json — the user may want to edit it before running again with `--from`).

Wait for user approval before proceeding to Phase 2.

---

## Phase 2: Execute Pipeline

### Prerequisites check

Before starting execution, verify:

1. Storybook is running — check with `curl -s -o /dev/null -w "%{http_code}" http://localhost:6006/iframe.html` (expect 200). If not running, start it once at the top of the run with `yarn storybook > /tmp/storybook.log 2>&1 &` and wait for it to respond.
2. Working tree is clean — `git status --porcelain` should be empty
3. Currently on `main` — `git branch --show-current` should output `main`
4. Figma MCP is available — check for `mcp__figma__get_design_context` via ToolSearch
5. `FIGMA_PERSONAL_ACCESS_TOKEN` is set in `.env.development`
6. Playwright MCP is available — check for `mcp__playwright__browser_navigate` via ToolSearch (only if `--skip-reviews` is NOT set)

Report ALL failures in a single message. Do not proceed until all checks pass.

### Parse flags

- `--from {index}` — Skip components before this index
- `--only {index}` — Only run the component at this index
- `--skip-reviews` — Skip Steps C and D

### Read manifest

Read `.claude/skills/batch-components/components.json` and determine which components to process based on flags.

### For each component (sequentially):

---

#### Step A: Setup branch

Run these git commands directly (not in an agent):

```bash
git checkout main
git pull origin main
git checkout -b {component.branch}
```

Update the Linear ticket status to **In Progress** via `mcp__linear__save_issue`.

---

#### Step B: Create component (Agent)

Launch a `general-purpose` Agent with this prompt:

```
**Ticket context:**
{component.ticketDescription}

**Additional Figma references:**
{for each entry in component.additionalFigma, list them}

---

Create a new reusable UI component called "{component.name}" for the Next.js project.

Read and follow the /create-component command at .claude/commands/create-component.md with these arguments:
  {component.name} --no-plan --desktop={component.desktop} --mobile={component.mobile}

IMPORTANT:
- Do NOT use AskUserQuestion at any point — all context is provided above
- Do NOT enter plan mode — --no-plan is set
- Skip Interactive Prompting — infer everything from the Figma design and ticket context
- After creating all files, run: yarn fix && yarn ts:check
- Fix any errors before completing
- Do NOT run /review-design or /review-code — those are separate steps
- Do NOT run /commit — that happens after this agent completes
```

Wait for the agent to complete. If it fails, log the error, skip Steps C-E, and continue to the next component.

After the agent completes, run `/commit` directly (not in an agent).

---

#### Step C: Review design (Agent) — skip if `--skip-reviews`

Launch a `general-purpose` Agent with this prompt:

```
Run /review-design {component.name}

Desktop Figma: {component.desktop}
Mobile Figma: {component.mobile}

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

#### Step D: Review code (Agent) — skip if `--skip-reviews`

Launch a `general-purpose` Agent with this prompt:

```
Run /review-code {component.name}

Complete all phases autonomously:
- Do NOT use AskUserQuestion — make decisions based on best practices
- Fix all issues found
- Do NOT run /commit — that happens after this agent completes
```

Wait for the agent to complete. If it fails, log a warning but continue.

After the agent completes, run `/commit` directly (not in an agent) if there are changes.

---

#### Step E: Push, PR, and merge

Run these commands directly (not in an agent):

```bash
# Push
git push -u origin HEAD

# Create PR
gh pr create --base main \
  --title "{component.linearId}: Add {component.name} component" \
  --body "$(cat <<'EOF'
## Summary
Add {component.name} component built from Figma design.

## Linear
{component.linearUrl}
EOF
)"

# Merge (squash)
gh pr merge --squash --delete-branch

# Return to main
git checkout main
git pull origin main
```

Update the Linear ticket status to **Done** via `mcp__linear__save_issue`.

If any step fails, log a warning and continue to the next component. Always return to `main`.

---

#### Step F: Log result

Print: `[{index+1}/{total}] {component.linearId}: {component.name} — DONE`

---

### Cleanup

After all components have been processed (or if only `--only` was used and that component completed), **delete the manifest**:

```bash
rm -f .claude/skills/batch-components/components.json
```

This prevents accidentally re-running the pipeline against a stale manifest. If the user needs to re-run, they should generate a fresh manifest from Linear.

**Do NOT delete components.json if:**

- The pipeline was interrupted by a fatal error (the user may want to resume with `--from`)
- `--generate-only` was passed (the user explicitly wants to keep it)

---

### Summary

After all components complete, print:

```
========================================
 Batch Components — Complete
 Passed: {count}
 Failed: {count}
 Skipped: {count}
========================================

Results:
  ✓ Badge (MAM-261)
  ✓ Tooltip (MAM-262)
  ✗ Modal (MAM-263) — failed at: create
  ⊘ Tabs (MAM-264) — skipped (--from)

components.json has been deleted.
```

## Error Handling

- If Step B (create) fails → skip Steps C-E for that component, mark as failed, continue to next
- If Step C or D (reviews) fail → log warning, continue to Step E (the component is still usable)
- If Step E (PR/merge) fails → log warning, continue to next component
- Always return to `main` before starting the next component
- If `git checkout main` fails (dirty tree), run `git stash` then `git checkout main`
- On fatal/unrecoverable error → do NOT delete components.json (user can resume with `--from`)
