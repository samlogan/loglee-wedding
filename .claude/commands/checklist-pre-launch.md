# Pre-Launch Checklist

Runs through a 32-item checklist to ensure the project is ready for production launch. Persists progress to `docs/checklist-pre-launch.md` and syncs to a Linear issue.

## Arguments

`$ARGUMENTS`

First argument should be a Linear project URL (e.g. `https://linear.app/team-name/project/project-name-abc123`). Required on first run, optional on subsequent runs if the state file already has an issue ID.

Optional flags:

- `--reset` — Recreate the checklist file and Linear issue from scratch
- `--status` — Show current progress without processing any items

---

## Step 0: Linear Sync Setup

### If state file exists and contains `<!-- linear:ISSUE_ID -->`

1. Extract the issue ID from the comment
2. Fetch via `mcp__linear__get_issue` to confirm it exists
3. If the issue is missing, treat as "no issue" below

### If no issue exists (first run or `--reset`)

1. A Linear project URL **must** be provided as an argument. If missing, ask the user with `AskUserQuestion`: "Provide your Linear project URL (e.g. https://linear.app/team-name/project/project-name-abc123)"
2. Extract the project slug from the URL — the last path segment (e.g. `project-name-abc123`)
3. Use `mcp__linear__list_projects` and match by slug to get the project ID
4. Use `mcp__linear__get_project` to get the project's team IDs
5. Create a new issue via `mcp__linear__save_issue` with:
   - **Title:** "Pre-Launch Checklist"
   - **Team:** the project's team
   - **Project:** the project ID
   - **Description:** the full checklist markdown (all items unchecked — same as the state file content below)
6. Store the returned issue ID in the state file as `<!-- linear:ISSUE_ID -->` on line 3
7. Report: "Created Linear issue: {ISSUE_ID}"

---

## Step 1: Initialise State File

**State file path:** `docs/checklist-pre-launch.md`

### If `--reset` flag is passed

Delete the existing state file (if any) and proceed as if it doesn't exist.

### If state file exists (and no `--reset`)

1. Read `docs/checklist-pre-launch.md`
2. Parse all `- [x]` (completed) and `- [ ]` (pending) items
3. Count completed vs total
4. Display progress summary: "Pre-Launch Checklist: X/32 complete"

### If state file does not exist

Create `docs/checklist-pre-launch.md` with all items unchecked:

```markdown
# Pre-Launch Checklist

<!-- linear: -->

> **Progress:** 0/32 complete | **Last updated:** {today's date YYYY-MM-DD}

## Code Quality

_Delegates to existing audit commands._

- [ ] TypeScript, ESLint, Prettier pass (`/check`)
- [ ] Accessibility audit (`/audit-a11y --all`)
- [ ] JSON-LD schema validation (`/audit-schema`)

## Content & Assets

- [ ] CMS content audit passed (`/audit-content`)
- [ ] No placeholder text in codebase
- [ ] Contact details verified (phone, email, addresses)
- [ ] All forms tested and delivering to correct recipients
- [ ] Form validation styling complete and legible
- [ ] Success/thank-you page redirects tested

## Keys & Environment

- [ ] Google API keys replaced with client's and restricted to production domain
- [ ] All frontend-facing non-sensitive keys prefixed with `NEXT_PUBLIC_`
- [ ] No sensitive keys exposed with `NEXT_PUBLIC_` prefix
- [ ] Netlify environment variables set for production

## IP & Licensing

- [ ] All third-party graphics, images, icons from approved licensed sources
- [ ] All fonts licensed for web use
- [ ] All libraries/packages use permissible open-source licences

## Performance & SEO

- [ ] Open Graph passes social preview validators
- [ ] Favicon renders correctly in all browsers
- [ ] Sitemap generates at /sitemap.xml
- [ ] Sitemap reviewed — no unwanted links
- [ ] robots.txt correct (`NEXT_PUBLIC_IS_STAGING` removed from production env)
- [ ] 301 redirects working
- [ ] Redirect audit completed (`/audit-redirects`)
- [ ] Canonical tags match address bar
- [ ] Heading structure (single H1 per page, no skipped levels)
- [ ] HTML5 Outliner scan — no "Untitled SECTION" on any page
- [ ] Security headers configured

## Analytics & Tracking

- [ ] GTM container ID set in Netlify production env
- [ ] GTM fires correctly on page load

## Testing & Infrastructure

- [ ] Browser testing completed (Chrome, Firefox, Safari, Edge, iOS Safari, Android Chrome)
- [ ] Uptime monitoring configured (UptimeRobot or equivalent)
- [ ] Uptime Robot Slack notification configured

## Notes
```

---

### If `--status` flag is passed

After showing the progress summary, stop here. Do not process any items.

---

## Linear Sync (applies throughout)

If `mcp__linear__save_status_update` is available **and** `LINEAR_PROJECT_ID` is set in `.env.development`, sync the checklist to Linear as a single project status update that gets updated over time.

### How it works

1. **First sync** — Call `mcp__linear__save_status_update` with `type: "project"`, `project: LINEAR_PROJECT_ID`, `health: "onTrack"`, and `body` containing the full checklist Markdown (progress line + all items with their current checked/unchecked state). Store the returned status update ID in the state file as a metadata line:

   ```
   <!-- linear-status-id: {id} -->
   ```

   Place this on the line immediately after the `# Pre-Launch Checklist` heading.

2. **Subsequent syncs** — Read the `linear-status-id` from the state file. Call `mcp__linear__save_status_update` with the same parameters plus the existing ID to **update** the same status update rather than creating a new one. Update `health` based on progress:
   - All items complete → `"completed"`
   - Any items failed/blocked → `"atRisk"`
   - Otherwise → `"onTrack"`

3. **When to sync** — Once, after all items have been processed (at the end of Step 2). Do not sync to Linear during processing.

If Linear MCP or `LINEAR_PROJECT_ID` is unavailable, skip all syncing silently.

---

## Step 2: Process Items

**Processing order:** Handle all manual/semi-auto items first (Phase 1), then all automated/delegated items (Phase 2). This lets the user answer all questions upfront before automated checks run. **Skip items that are already checked.**

After each phase, update the progress line at the top of the file:

1. Update the progress line at the top of the file:
   ```
   > **Progress:** X/32 complete | **Last updated:** {today's date}
   ```
2. Append any notes about the results to the `## Notes` section at the bottom
3. **Sync to Linear:**
   - Update the Linear issue description (via `mcp__linear__save_issue`) with the current state file content (the full checklist markdown with updated check marks)
   - Post a status update (via `mcp__linear__save_status_update`) on the issue: "Pre-Launch Checklist: X/32 complete — {group name} processed"

---

### Phase 1: Manual & Semi-Auto Items

Process all items that require user input first. Gather context for semi-auto items before asking, then batch questions together.

#### Pre-flight checks for semi-auto items

Run these checks silently before asking questions — results inform which questions to ask:

- **Item 16** (Libraries): Read `package.json`, list `dependencies`, flag any with known restrictive licences (GPL, AGPL, SSPL, BSL)
- **Item 19** (Sitemap): Check that `app/sitemap.ts` or `app/sitemap.xml` exists. If missing: keep `[ ]`, skip the question
- **Item 22** (Redirects): Read `config/redirects.ts` — note whether it has entries
- **Item 23** (Redirect audit): Check if `docs/screaming-frog.csv` exists. If not available, note this
- **Item 24** (Canonical tags): Read `tools/sanity/helpers/generateSanityMetadata.ts`, check for canonical/alternates/url patterns. If missing: keep `[ ]`, skip the question
- **Item 25** (Heading structure): Search `sections/**/*.tsx` for heading patterns (`as="h1"`, `as="h2"`, etc.), note the usage found

#### Now batch all manual and semi-auto questions into `AskUserQuestion` calls (max 4 questions per call):

**First call** — Content & Assets manual items:

- Item 6: "Have contact details been verified (phone, email, addresses)?"
- Item 7: "Have all forms been tested and confirmed delivering to correct recipients?"
- Item 8: "Is form validation styling complete and legible?"
- Item 9: "Have success/thank-you page redirects been tested?"

**Second call** — Keys, Environment & Licensing:

- Item 10: "Have Google API keys been replaced with the client's and restricted to the production domain?"
- Item 13: "Have all environment variables from `.env.template` been set in Netlify for production?" (list the variables for reference)
- Item 14: "Are all third-party graphics, images, and icons from approved licensed sources?"
- Item 15: "Are all fonts licensed for web use?"

**Third call** — Licensing confirmation + Performance & SEO:

- Item 16: "Please confirm all package licences are permissible (MIT, Apache 2.0, BSD, ISC)." (include the dependency list and any flagged packages)
- Item 17: "Has Open Graph been validated at opengraph.xyz?"
- Item 18: "Does the favicon render correctly in all browsers?"
- Item 19: "Does the sitemap generate correctly at `/sitemap.xml`?" (if sitemap file exists; otherwise skip and note missing)

**Fourth call** — Performance & SEO continued:

- Item 20: "Has the sitemap been reviewed for unwanted links?"
- Item 21: "Is robots.txt correct? Reminder: `NEXT_PUBLIC_IS_STAGING` must be removed from Netlify production env." (note whether `app/robots.ts` exists)
- Item 22: "Are 301 redirects working correctly?" (note the redirect entries found, or ask if redirects are needed)
- Item 23: If `docs/screaming-frog.csv` is missing: "Please provide a Screaming Frog crawl CSV at `docs/screaming-frog.csv` for the redirect audit." If available: run `/audit-redirects` (use the Skill tool) and report results

**Fifth call** — SEO continued + Analytics:

- Item 24: "Do canonical tags match the address bar on key pages?" (if canonical logic was found; otherwise skip and note missing)
- Item 25: "Does each page have exactly one H1 with no skipped heading levels?" (include the heading usage report)
- Item 26: "Has an HTML5 Outliner scan been run? Check for 'Untitled SECTION' entries on any page."
- Item 28: "Has the GTM container ID been set in Netlify production environment?"

**Sixth call** — Analytics + Testing & Infrastructure:

- Item 29: "Does GTM fire correctly on page load?"
- Item 30: "Has browser testing been completed across: Chrome, Firefox, Safari, Edge, iOS Safari, Android Chrome?"
- Item 31: "Has uptime monitoring been configured (UptimeRobot or equivalent)?"
- Item 32: "Has UptimeRobot Slack notification been configured?"

**Save the state file after Phase 1.**

---

### Phase 2: Automated & Delegated Items

Run automated checks and delegated audits without user interaction. Use agents for simple checks (in parallel) and the main thread for complex audits (sequentially).

#### Phase 2a: Spawn parallel agents

Spawn **all 4 agents in parallel** using the Agent tool in a single message:

1. **Agent**: `typescript-checker` — prompt: "Run TypeScript type checking."
2. **Agent**: `lint-checker` — prompt: "Run Ultracite lint check."
3. **Agent**: `placeholder-scanner` — prompt: "Scan for placeholder content in config/, tools/, app/, components/, and sections/ directories."
4. **Agent**: `env-security-checker` — prompt: "Run all three environment security checks."

#### Phase 2b: Run complex audits in main thread (while agents run)

While waiting for agents, run these sequentially in the main thread:

**Item 2: Accessibility audit — DELEGATE**

- Run `/audit-a11y --all` (use the Skill tool to invoke the `audit-a11y` skill with `--all`)
- If no failures → mark `[x]`
- If failures found → keep `[ ]`, note the failure count

**Item 3: JSON-LD schema validation — DELEGATE**

- Run `/audit-schema` (use the Skill tool to invoke the `audit-schema` skill)
- If validation passes → mark `[x]`
- If issues found → keep `[ ]`, note the issues

**Item 4: CMS content audit passed — DELEGATE**

- Run `/audit-content` (use the Skill tool to invoke the `audit-content` skill)
- If the audit reports 0 issues → mark `[x]`
- If issues found → keep `[ ]`, note the issue/warning counts from the audit summary

#### Phase 2c: Collect agent results

When all 4 agents return, parse the `<!-- RESULT: ... -->` lines and update the checklist:

**From `typescript-checker` + `lint-checker` → Item 1:**

- If both pass → mark `[x]`
- If any fail → keep `[ ]`, note which checks failed

**From `placeholder-scanner` → Item 5:**

- If status=pass → mark `[x]`
- If status=fail → keep `[ ]`, list files and lines containing placeholders

**From `env-security-checker` → Items 11, 12, 27:**

- Item 11 (NEXT*PUBLIC* prefixes): check1 result
- Item 12 (sensitive key exposure): check2 result
- Item 27 (security headers): check3 result
- For each: pass → mark `[x]`, fail → keep `[ ]` with details

**Save the state file after Phase 2. Then sync to Linear (see Linear Sync section).**

---

## Step 3: Final Summary

After all groups are processed:

1. **Sync to Linear one final time:**
   - Update the issue description with the final checklist state
   - Post a final status update: "Pre-Launch Checklist: X/32 complete — all groups processed" (or "All 32 items passed — ready for launch" if complete)
   - If all 32 items pass, update the issue status to "Done" (find the done status via `mcp__linear__list_issue_statuses` for the team)

2. **Display:**

```
## Pre-Launch Checklist Complete

**Result:** X/32 items passed
**Linear:** {ISSUE_ID}

### Remaining Items
- [ ] Item description (reason)

Checklist saved to `docs/checklist-pre-launch.md`
```

If all 32 items pass: "All pre-launch checks complete. Ready for launch."
