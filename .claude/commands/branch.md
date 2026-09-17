# Branch

Create a new git branch following Gitflow conventions, optionally creating a Linear issue to track the work.

## Arguments

`$ARGUMENTS`

Optional: a short description of the work (e.g., "add testimonials section", "fix header nav on mobile"). If provided, skip the description question in Step 1.

---

## Step 0: Prerequisites

### 0a. Check for uncommitted changes

Run `git status --porcelain`. If there are uncommitted or untracked changes, ask the user with `AskUserQuestion`:

> You have uncommitted changes. How would you like to handle them?
>
> - `commit` — commit them now (runs `/commit`), then continue
> - `stash` — stash them and bring them to the new branch
> - `cancel` — stop and let me handle it manually

**If `commit`:** Run `/commit` using the Skill tool. After it completes, continue to Step 0b.

**If `stash`:** Run `git stash --include-untracked`. After the branch is created (end of Step 3c), run `git stash pop` to restore the changes on the new branch.

**If `cancel`:** Stop.

### 0b. Linear MCP (optional)

Use `ToolSearch` to check for `mcp__linear__save_issue`. If unavailable, note that Linear integration will be skipped — this is not a blocker.

### 0c. Linear environment variables (optional)

If Linear MCP is available, read `.env.development` and check for `LINEAR_TEAM_ID` and `LINEAR_PROJECT_ID`. If either is missing, note that Linear issue creation will be skipped — this is not a blocker.

---

## Step 1: Gather Information

Ask all questions in a single `AskUserQuestion` call. Skip questions that can be inferred from `$ARGUMENTS`.

### Questions

**1. Branch type** (required):

> What type of work is this?
>
> - `feature` — new functionality
> - `bugfix` — fixing a bug
> - `hotfix` — urgent production fix
> - `updates` — config, dependency, or maintenance changes

**2. Description** (required, skip if `$ARGUMENTS` provided):

> Briefly describe the work (e.g., "add testimonials section").

---

## Step 2: Create Linear Issue

**Skip this step entirely if:**

- Linear MCP is unavailable, OR
- `LINEAR_TEAM_ID` or `LINEAR_PROJECT_ID` is missing in `.env.development`

### Create the issue

Use `mcp__linear__save_issue` with:

- **Title:** derived from the description — concise, imperative, under 80 chars (e.g., "Add testimonials section")
- **Team:** the `LINEAR_TEAM_ID` value
- **Project:** the `LINEAR_PROJECT_ID` value
- **Priority:** 3 (Normal) — except `hotfix` branches which use 1 (Urgent)

Store the returned ticket identifier (e.g., `MAM-40`) for the branch name.

---

## Step 3: Create the Branch

### 3a. Start from the correct base

```bash
git checkout main
git pull origin main
```

### 3b. Construct the branch name

Format: `{type}/{ticket-id}-{slug}`

- **type:** from Step 1 (feature, bugfix, hotfix, updates)
- **ticket-id:** the Linear issue identifier in lowercase (e.g., `mam-40`). Omit if no issue was created.
- **slug:** kebab-case from the description, max 5 words (e.g., `add-testimonials-section`)

Examples:

- `feature/mam-40-add-testimonials-section`
- `bugfix/mam-41-fix-header-nav-mobile`
- `hotfix/fix-broken-checkout` (no Linear)
- `updates/mam-42-upgrade-dependencies`

### 3c. Create and push

```bash
git checkout -b {branch}
git push -u origin {branch}
```

---

## Step 4: Summary

Report to the user:

- **Branch:** `{branch name}`
- **Base:** `{base branch}`
- **Linear:** `{TICKET-ID}` (if created, otherwise omit)
