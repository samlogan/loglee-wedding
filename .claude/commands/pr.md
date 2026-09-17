# PR

Create a pull request for the current branch with an auto-generated title and description.

## Arguments

`$ARGUMENTS`

Optional: a PR description hint or additional context. If provided, incorporate it into the PR description.

---

## No interactive prompts

---

## Step 1: Pre-flight Checks

### 1a. Verify `gh` CLI is available

Run `gh --version`. If not installed, stop and tell the user:

> "The GitHub CLI (`gh`) is not installed. Install it with `brew install gh` and authenticate with `gh auth login`."

### 1b. Check for uncommitted changes

Run `git status --porcelain`. If there are uncommitted changes, stop and tell the user:

> "You have uncommitted changes. Run `/commit` first, then re-run `/pr`."

### 1c. Run code checks + gather context in parallel

Spawn **all of the following in parallel** using the Agent tool in a single message:

1. **Agent**: `typescript-checker` — prompt: "Run TypeScript type checking."
2. **Agent**: `lint-checker` — prompt: "Run Ultracite lint check."
3. **Agent**: `story-freshness-checker` — prompt: "Check Storybook story freshness for all component and section files changed since the base branch. Use `git diff --no-renames --name-only {base}..HEAD --diff-filter=AM | grep -E '^(components|sections)/.*/index\.tsx?$'` to build the input list." (Keep this byte-identical to the command in `commit.md` and the agent file. `\\.` is a literal backslash in ERE and matches nothing — this gate reported pass on every branch until it was fixed. `--no-renames` is needed because `--diff-filter=AM` drops rename entries.)
4. **Agent**: `story-fixture-checker` — prompt: "Refresh Storybook fixtures (page sections and the site-wide globals). Build the changed-file list with `git diff --name-only {base}..HEAD` and pass `--mode=pr`. Best-effort; report whether any fixtures were stale." (Pass the unfiltered list and let the agent apply its own scope — that is the shape that cannot drift from the agent's list.)
5. **Agent**: `test-freshness-checker` — prompt: "Check test freshness for changed logic. Build the input list with `git diff --no-renames --name-only {base}..HEAD --diff-filter=AM` filtered to `^tools/.*\.tsx?$`, excluding `\.test\.tsx?$`, `\.d\.ts$` and `^tools/storybook/fixtures/`. `.tsx` is in scope deliberately — `tools/storybook/sectionStory.tsx` holds branching logic that gates section theming at runtime. Keep this scope identical to the agent file and to `commit.md` Step 2.8."
6. **Agent**: `context-gatherer` — prompt: "Fetch Linear ticket context. {ticket ID or branch name details}." (see 1c-ii below for how to determine the ticket ID)
7. **In the main thread** (concurrently): Run `yarn audit:groups` and `yarn test` (both Vitest projects — the unit suite, and every story as a component test in a real browser), then `git log {base}..HEAD --oneline` and `git diff {base}..HEAD --stat`

#### 1c-i. Determine base branch

Infer from the current branch name using Gitflow conventions (all patterns map to `main`). Verify it exists, fall back to `main`.

#### 1c-ii. Determine Linear ticket for context-gatherer

Look for a Linear ticket ID in the branch name (e.g., `feature/sam-123-some-title` -> `SAM-123`). Pass this to the `context-gatherer` agent.

If no ticket ID found, pass the branch name and instruct the agent to check if `LINEAR_TEAM_ID` and `LINEAR_PROJECT_ID` are set in `.env.development`. If both are set, the agent should create a new Linear issue via `mcp__linear__save_issue` with a title derived from the branch/commits, then return the ticket context.

If env vars are missing or Linear MCP is unavailable, the agent returns no ticket context — proceed without it.

#### 1c-iii. Handle check results

When all agents return, parse the `<!-- RESULT: ... -->` lines from `typescript-checker`, `lint-checker`, `story-freshness-checker`, `story-fixture-checker`, and `test-freshness-checker`. Handle each:

- **`yarn test` non-zero exit**: **hard-block PR creation.** Report which project failed — `unit` names the pure-logic assertion, `storybook` names the story file and the story.
- **`test-freshness-checker` `missing` entries**: **hard-block PR creation.** Name the modules that changed without a test and offer to write them, deriving cases from documented intent and never from observed output. `untested` entries are a warning for the PR description, not a block.
- **`yarn audit:groups` non-zero exit**: **hard-block PR creation.** A story title uses an unknown sidebar group, or a section story has lost its `Sections/` prefix. The second case silently disables section theming, the error boundary and the full-width docs preview at runtime, so it must not reach a PR. Fix the title and re-run.
- **`typescript-checker` errors**: fix them before proceeding.
- **`lint-checker` errors**: fix them before proceeding. If files were auto-fixed, commit them with the message "Fix lint and formatting issues".
- **`story-freshness-checker` missing entries**: **hard-block PR creation**. Stop and tell the user:

  > "Cannot open PR — N component/section files are missing Storybook stories. Run `/commit` (which auto-generates missing stories) or create them manually using the templates in `.claude/commands/create-component.md` / `create-section.md`, then re-run `/pr`."
  >
  > {list missing files from the agent output}

- **`story-freshness-checker` stale entries**: do NOT block. Surface them as warnings to be included in the PR description (Step 5b) so the reviewer is aware.
- **`story-fixture-checker` `status=refreshed`**: do NOT block. The fixtures were stale; commit the refreshed `tools/storybook/fixtures/` onto the branch with the message "Refresh Storybook fixtures from Sanity" before pushing, and note it in the PR description. `status=skip`/`status=fresh` → nothing to do.

If any agent fails to return a parseable result, surface the raw output and stop.

### 1d. Push the branch

```bash
git push -u origin HEAD
```

---

## Step 2: Determine Base Branch

Already determined in Step 1c-i.

---

## Step 3: Gather Context

Already gathered in parallel in Step 1c. Use the results from:

- Git log/diff (from main thread)
- Linear ticket context (from `context-gatherer` agent)

---

## Step 4: Update Linear Ticket Status

**This must happen before creating the PR** so the ticket is already "In Review" when the PR link attaches.

If a Linear ticket was detected and the Linear MCP tools are available:

1. Fetch the available statuses for the ticket's team using the Linear MCP
2. Find the status that represents "In Review" (look for status names like "In Review", "Review", or similar)
3. Update the ticket status to "In Review" via the Linear MCP

If Linear MCP is not available, skip this step silently.

---

## Step 5: Create the PR

### 5a. Generate PR title

- If a Linear ticket was found: `{TICKET-ID}: {ticket title}`
- Otherwise: derive from the branch name or commit messages — use a clear, concise imperative title

### 5b. Generate PR description

Write a markdown PR description with these sections:

```markdown
## Summary

{1-3 sentence overview of what this PR does, informed by commits, diff, and Linear ticket if available}

## Changes

- {bulleted list of key changes, grouped logically}

## Linear

{TICKET-ID} (only if a ticket was detected, otherwise omit this section entirely)

## Story freshness warnings

{Only include this section if the story-freshness-checker reported `stale` entries. List each stale story file plus the prop diff so the reviewer can decide whether to require a fix in this PR. Omit the section entirely if no stale entries.}
```

If the user provided `$ARGUMENTS`, incorporate that context into the summary.

### 5c. Create the PR

**Important:** Do NOT include any "Generated with Claude Code", "Co-Authored-By", or any other AI attribution in the PR title or body.

```bash
gh pr create --base {base_branch} --title "{title}" --body "{body}"
```

---

## Step 6: Summary

Report to the user:

- **PR:** {link to the created PR}
- **Base:** {base branch}
- **Title:** {PR title}
- **Linear:** {ticket ID updated to "In Review"} (if applicable, otherwise omit)
