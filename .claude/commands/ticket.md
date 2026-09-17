# Ticket

**IMPORTANT: If you are already in plan mode, exit plan mode first using ExitPlanMode, then tell the user to re-run `/ticket` with the relevant arguments. This command manages its own plan mode and will not work correctly if already in plan mode.**

Fetch or create a Linear ticket, then action the work.

## Arguments

`$ARGUMENTS`

- `SAM-123` or `https://linear.app/team/issue/SAM-123/...` — fetch this ticket directly, skip to Step 2
- _(no argument)_ — start the interactive flow at Step 1
- `--worktree` — create a sibling git worktree for this ticket and exit so the developer can open a fresh Claude session inside it. Combine with a ticket ID, e.g. `/ticket SAM-123 --worktree`. Lets multiple tickets be worked on in parallel without branch-switching conflicts. See **Step 1C** below.

---

## Step 0: Prerequisites

Check all prerequisites at once. Report ALL missing items in a single message — do not stop at the first failure.

### 0a: MCP Availability

Check for tools from all three required MCP servers:

| MCP    | How to check             | Required? | Setup guidance if missing                                           |
| ------ | ------------------------ | --------- | ------------------------------------------------------------------- |
| Linear | `mcp__linear__get_issue` | Yes       | "Add Linear MCP in `.claude/mcp.json` — see https://mcp.linear.app" |
| Slack  | Any `mcp__slack__*` tool | Yes       | "Add Slack MCP in `.claude/mcp.json` — see Slack MCP docs"          |
| Coda   | Any `mcp__coda__*` tool  | Yes       | "Add Coda MCP in `.claude/mcp.json` — see Coda MCP docs"            |
| Jira   | Any `mcp__jira__*` tool  | Optional  | Jira URLs included verbatim, not fetched                            |
| Asana  | Any `mcp__asana__*` tool | Optional  | Asana URLs included verbatim, not fetched                           |

Use `ToolSearch` to check for each MCP's tools. If any **required** servers are missing, stop with a consolidated message listing ALL missing servers. Note which optional servers are available for use in later steps.

### 0b: Environment Variables

Read `.env.development` and check for:JY0BVGBYMK

| Variable            | Required for    | Action if missing                                                   |
| ------------------- | --------------- | ------------------------------------------------------------------- |
| `LINEAR_TEAM_ID`    | Ticket creation | Ask user, tell them to find it in Linear Team Settings              |
| `LINEAR_PROJECT_ID` | Ticket creation | Ask user, tell them to find it in Linear Project Settings > General |

Only enforce these if entering the creation flow, not when fetching an existing ticket.

### 0c: Validate Linear Project

If entering the creation flow, call `mcp__linear__get_project` with the `LINEAR_PROJECT_ID` value to confirm it exists. Stop if invalid.

---

## Step 1: Route

### If `$ARGUMENTS` matches a ticket ID/URL

Matches `XXX-123` pattern or contains `linear.app/` → go straight to **Step 2** (fetch existing ticket).

### If no argument provided

Ask one question using `AskUserQuestion`:

> **Linear ticket?** Paste a ticket ID or URL, or press Enter to create a new one.

- If the response matches a ticket ID/URL → **Step 2**
- If empty or not a ticket ID → **Step 1B** (create new ticket)

---

## Step 1B: Create New Ticket

Run 0b/0c prerequisite checks first if not already done.

### Context Gathering

Ask each question one at a time using `AskUserQuestion`. Each prompt is a single open text field. No numbered choice lists. No categorisation questions. No asking what type of work this is.

**Prompt 1 — Slack** (primary context source):

> **Slack link?** Paste below, or press Enter to skip.

Parse for Slack URLs (`*.slack.com/*`). The user can paste one or multiple URLs. Empty = skip.

**Prompt 2 — Coda** (optional):

> **Coda link?** Paste below, or press Enter to skip.

Parse for Coda URLs (`*.coda.io/*`). One or multiple URLs. Empty = skip.

**Prompt 3 — External references** (optional):

> **External references?** Paste Asana, Jira, Loom links or content — or press Enter to skip.

Parse for fetchable URLs (see "Fetch Context from Sources" below). Non-fetchable URLs and plain text included verbatim. Empty = skip.

**Prompt 4 — Additional context** (optional):

> **Anything else?** Free text — or press Enter to skip.

Include verbatim. Empty = skip.

That is the entire intake. Four prompts maximum. Do NOT add extra questions.

### Fetch Context from Sources

Delegate all context fetching to the `context-gatherer` agent. Spawn the agent with a prompt listing all collected URLs:

```
Fetch content from these sources:
- Slack: {slack URLs from Prompt 1}
- Coda: {coda URLs from Prompt 2}
- External: {URLs and text from Prompt 3}
```

The agent will fetch from all MCP sources in parallel and return structured context. Non-fetchable URLs will be returned verbatim.

Wait for the agent to return, then use the structured context for synthesis below.

### Synthesise and Preview

Combine all gathered context into a structured ticket. Claude infers the title, type, and priority silently from the content — do NOT ask the user about these.

**Title:** Concise, imperative, under 80 chars (derived from Slack content and other context).

**Description:** Be thorough — include all relevant detail. Do not summarise or truncate context.

```markdown
## Overview

{Detailed description drawn from all context sources. The Slack messages are the primary source. Include background, motivation, and scope.}

## Acceptance Criteria

- {Extracted or inferred from context — be specific and measurable}

## Context Sources

- **Slack:** {relevant discussion content} ([link])
- **Coda:** {doc title and relevant content} ([link])
- {any external reference content — include in full}

## Additional Notes

{Free text provided by the user — include verbatim, do not summarise}
```

Only include sections that have content. Omit empty sections entirely.

**Preview to user before creating:**

> **Title:** {title}
> **Project:** {project name}
> **Priority:** {inferred, default Normal}
> **Labels:** {inferred from context}
>
> {full description}
>
> Does this look right?

Wait for approval. Revise if requested.

### Create in Linear

Use `mcp__linear__save_issue`:

- `title`, `description`, `team` (from `LINEAR_TEAM_ID`), `project` (from `LINEAR_PROJECT_ID`)
- `priority` (inferred, default 3/Normal)
- `labels` (inferred from context)

Store the returned ticket identifier and continue to Step 2 using the new ticket.

---

## Step 1C: Set Up Worktree (only if `--worktree` flag was passed)

This step is **only** executed when `$ARGUMENTS` contains the `--worktree` flag. It is a one-shot setup step — once the worktree is ready, the command **stops** and instructs the developer to open a new Claude session inside it. Do not continue to Steps 2–6 in this session.

The flag must be combined with a ticket ID — if `--worktree` was passed without a resolved ticket (i.e., the user is also creating a new ticket via Step 1B), run Step 1B first, then return here once the new ticket exists.

### 1C-a. Fetch the ticket to determine the branch name

Call `mcp__linear__get_issue` for the resolved ticket ID. Read the Linear-generated `branchName` field. If Linear has not generated one, construct one in the same shape (e.g., `feature/sam-123-ticket-title-slug`).

### 1C-b. Determine the worktree path

The worktree lives in a **sibling directory** to the main repo, grouped under one parent so all worktrees stay together:

- Main repo: `/Users/samlogan/localhost/next-bolognese`
- Worktree parent: `/Users/samlogan/localhost/next-bolognese-worktrees/`
- This worktree: `/Users/samlogan/localhost/next-bolognese-worktrees/{branch-slug}`

The `{branch-slug}` is the branch name with `/` replaced by `-` (e.g., `feature/sam-123-hero-section` → `feature-sam-123-hero-section`).

Derive the main repo path from `git rev-parse --show-toplevel`. Do not hardcode it.

### 1C-c. Detect existing worktree

Run `git worktree list --porcelain` and check whether a worktree already exists at the target path or for the target branch.

If one exists, do not recreate it. Print:

> **Worktree already exists** for `{branch}` at `{path}`.
>
> Open a new terminal there and start a Claude session:
>
> ```bash
> cd {path}
> claude
> ```
>
> Then run `/ticket {ticket-id}` (without `--worktree`) inside that session to continue the work.

…and stop.

### 1C-d. Ensure main is clean and up to date

Inside the main repo (current cwd):

```bash
git status --porcelain
```

If there are uncommitted changes, stop with:

> "You have uncommitted changes in the main repo. Commit or stash them before creating a worktree, then re-run `/ticket {ID} --worktree`."

If the working tree is clean, fast-forward main:

```bash
git fetch origin main
```

Do **not** check out main in the current repo — the developer may be on a different branch and `--worktree` should not disrupt that. The new worktree will be branched off `origin/main` directly.

### 1C-e. Create the worktree

Ensure the parent directory exists (`mkdir -p` the worktree parent), then:

- If the branch already exists locally or on the remote, attach to it:

  ```bash
  git worktree add {path} {branch}
  ```

- If the branch does not exist anywhere, create it from `origin/main`:

  ```bash
  git worktree add -b {branch} {path} origin/main
  ```

Decide which by checking `git rev-parse --verify {branch}` and `git ls-remote --heads origin {branch}`.

### 1C-f. Copy unversioned local files

Copy the following into the new worktree if they exist in the main repo (they're gitignored or not tracked, so the worktree won't have them automatically):

- `.env.development.local`
- `.env.production.local`
- `.env.local`
- `.mcp.json` (only if it is gitignored locally — check `git check-ignore .mcp.json`; if it is tracked, the worktree already has it)

Use `cp` for each; skip silently if the source does not exist.

### 1C-g. Install dependencies

Run `yarn install` inside the worktree. This is the slow part — warn the developer first:

> Installing dependencies in the worktree (this takes ~1–2 minutes)…

Use `yarn install --cwd {path}` so the install runs in the worktree without changing the current cwd.

If the install fails, leave the worktree in place and surface the error — the developer can re-run `yarn install` themselves once they cd into the worktree.

### 1C-h. Print instructions and stop

Once setup completes, print:

> **Worktree ready** for `{ticket-id} — {ticket-title}`
>
> - **Branch:** `{branch}`
> - **Path:** `{path}`
>
> Open a new terminal there and start a Claude session:
>
> ```bash
> cd {path}
> claude
> ```
>
> Then run `/ticket {ticket-id}` (without `--worktree`) inside that session to plan and execute the work.
>
> When you're done, clean up with `git worktree remove {path}` from the main repo.

**Stop here.** Do not continue to Step 2 in this session — the work happens in the new worktree session.

---

## Step 2: Fetch Ticket and Switch Branch

**Skipped entirely if `--worktree` was passed in this session** — Step 1C handled the branching, and this session has stopped.

### Fetch ticket data

Use the Linear MCP to retrieve:

- **Title**, **Description**, **Labels**, **Priority**, **Status**
- **Branch name** (Linear generates a git branch name for each ticket)
- **Comments** (may contain additional context or acceptance criteria)
- **Sub-issues** (if any)
- **Parent issue** (if this is a sub-issue, fetch the parent for broader context)

### Ticket not found

If the ticket does not exist in Linear, stop:

> "Ticket `{ID}` was not found. Re-run `/ticket` to create one, or check the ID."

### 2a. Start from latest main

Before creating or switching to the ticket branch, ensure the working tree is clean and up-to-date:

```bash
git checkout main
git pull origin main
```

If there are uncommitted changes on the current branch, stop and tell the user:

> "You have uncommitted changes. Run `/commit` first, then re-run `/ticket`."

### 2b. Determine branch name

Check if the ticket has a branch name from Linear.

1. If a branch name exists on the ticket, use it
2. Otherwise, construct one using the ticket ID (e.g., `feature/sam-123-ticket-title`)

### 2c. Create or switch to branch

- Check if the branch already exists locally (`git branch --list {branch}`)
- If it exists, switch to it: `git checkout {branch}` and merge latest main: `git merge main`
- If it doesn't exist, create it from main: `git checkout -b {branch}`

---

## Step 3: Assess Complexity and Plan

### 3a. Check for simple command delegation

Before entering plan mode, assess whether the ticket is a **simple command delegation** — i.e., the ticket's instructions boil down to running a slash command that has its own planning step.

A ticket qualifies as simple command delegation when **all** of these are true:

- The description or acceptance criteria directly maps to a single slash command (e.g., "Create a Hero section" → `/create-section`, "Create a Button component" → `/create-component`, "Import design tokens from Figma" → `/design-system-import`)
- There is minimal additional context beyond what the command itself will gather (e.g., a Figma URL, a section name)
- The delegated command enters its own plan mode or interactive flow

Common patterns:

| Ticket description pattern                                      | Maps to                 | Has own planning? |
| --------------------------------------------------------------- | ----------------------- | ----------------- |
| "Create {Name} section" / "Build the {Name} section from Figma" | `/create-section`       | Yes               |
| "Create {Name} component"                                       | `/create-component`     | Yes               |
| "Import design tokens" / "Sync design system"                   | `/design-system-import` | Yes (plan mode)   |
| "Set up project branding"                                       | `/project-setup`        | Yes               |
| "Generate project brief / tickets from proposal"                | `/project-brief`        | Yes (plan mode)   |

If the ticket matches this pattern, **skip plan mode** and recommend immediate delegation:

> **Ticket:** {ID} — {Title}
> **Recommendation:** This ticket maps directly to `/{command}` which has its own planning step. Skipping plan mode to avoid double-planning.
> **Running:** `/{command} {arguments extracted from ticket}`
>
> Skip to execution? (y/n)

If the user approves, skip to Step 4 and delegate to the command. If the user wants to plan anyway, fall through to 3b.

**IMPORTANT — Passing ticket context to delegated commands:**

The delegated command only sees its `$ARGUMENTS` (e.g. `--desktop=... --mobile=...`). It does NOT see the ticket description. All the context the developer put into the ticket — overview, requirements, approach notes, what to skip, extra Figma links, acceptance criteria, anything — will be lost unless you pass it through.

Before running the delegated command, output the **full ticket description** as a message prefixed with `**Ticket context:**`. Include everything from the ticket — do not restructure, summarise, or omit sections. Different tickets are structured differently; just pass through whatever is there verbatim.

This applies to ALL delegated commands, not just `/create-section` and `/create-component`.

### 3b. Enter plan mode for complex work

**Enter plan mode** using the `EnterPlanMode` tool before doing any analysis.

Analyse the ticket and determine:

1. **Type of work**: bug fix, new feature, refactor, content change, config change, etc.
2. **Scope**: which files/areas of the codebase are likely affected
3. **Acceptance criteria**: what "done" looks like

You may read files and explore the codebase during planning.

### Summarise understanding

> **Ticket:** {ID} — {Title}
> **Type:** {bug/feature/refactor/etc.}
> **Branch:** {branch name}
> **Summary:** {1-2 sentence description}
> **Affected areas:** {files/components/sections likely involved}
> **Acceptance criteria:** {bulleted list}

Propose an implementation plan, then ask: "Does this look right? Any additional context before I start?"

Stay in plan mode until the user approves.

---

## Step 4: Execute

**Exit plan mode** using the `ExitPlanMode` tool, then begin implementation.

Update the ticket status to **In Progress** via the Linear MCP.

Read the relevant files, then implement the changes. Follow all project conventions from CLAUDE.md.

If the ticket references Figma URLs (in description or comments), follow the Figma prerequisites from `/create-section` or `/create-component` as appropriate.

If the ticket maps to an existing slash command (e.g., "create a new section" maps to `/create-section`), first output the full ticket description as a `**Ticket context:**` message (see Step 3a), then delegate to the command with the relevant arguments. The delegated command will use this context to inform its decisions instead of asking interactive prompting questions.

After each logical unit of work, run `/check` to verify. Fix any errors before moving on.

---

## Step 5: Update the Ticket

Use the Linear MCP to add a comment on the ticket:

```
Changes implemented:

- {list of changes made}
- {files created/modified}

Ready for review.
```

Do NOT change the ticket status beyond "In Progress".

---

## Step 6: Summary

Report to the user:

- **Ticket:** {ID} — {Title}
- **Branch:** {branch name}
- **Changes made:** list of files created/modified
- **Verification:** confirm lint, format, and type checks pass
- Suggest running `/commit` to commit the changes
