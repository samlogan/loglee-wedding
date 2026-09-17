# Post-Launch Checklist

Runs through an 18-item checklist to verify everything is working correctly after a production launch. Persists progress to `docs/checklist-post-launch.md` and syncs to a Linear issue.

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
   - **Title:** "Post-Launch Checklist"
   - **Team:** the project's team
   - **Project:** the project ID
   - **Description:** the full checklist markdown (all items unchecked — same as the state file content below)
6. Store the returned issue ID in the state file as `<!-- linear:ISSUE_ID -->` on line 3
7. Report: "Created Linear issue: {ISSUE_ID}"

---

## Step 1: Initialise State File

**State file path:** `docs/checklist-post-launch.md`

### If `--reset` flag is passed

Delete the existing state file (if any) and proceed as if it doesn't exist.

### If state file exists (and no `--reset`)

1. Read `docs/checklist-post-launch.md`
2. Parse all `- [x]` (completed) and `- [ ]` (pending) items
3. Count completed vs total
4. Display progress summary: "Post-Launch Checklist: X/18 complete"

### If state file does not exist

Create `docs/checklist-post-launch.md` with all items unchecked:

```markdown
# Post-Launch Checklist

<!-- linear: -->

> **Progress:** 0/18 complete | **Last updated:** {today's date YYYY-MM-DD}

## Domain & SSL

- [ ] Netlify primary domain matches previous primary (www vs non-www)
- [ ] SSL provisioned, no SSL errors
- [ ] `NEXT_PUBLIC_IS_STAGING` removed from Netlify production env
- [ ] `NEXT_PUBLIC_SITE_URL` set to production domain in Netlify

## Crawlability & SEO

- [ ] Production website is crawlable (verify at `{domain}/robots.txt`)
- [ ] Staging and preview URLs are NOT crawlable
- [ ] Netlify subdomain redirects to primary domain
- [ ] Sitemap URL contains production domain
- [ ] Robots.txt contains correct sitemap URL
- [ ] Screaming Frog run — no 404 or 500 errors
- [ ] Sitemap submitted to Google Search Console

## Netlify & Infrastructure

- [ ] Slack notifications configured for build failures (deploy previews + production)
- [ ] Previews up-to-date and working on production domain
- [ ] CORS origin added in Sanity (live domain, with credentials)

## Functional Verification

- [ ] All forms tested on production and received by desired contact
- [ ] All dev/test pages unpublished in Sanity

## Handover

- [ ] Credentials updated in Hudle
- [ ] Client notified of go-live

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

   Place this on the line immediately after the `# Post-Launch Checklist` heading.

2. **Subsequent syncs** — Read the `linear-status-id` from the state file. Call `mcp__linear__save_status_update` with the same parameters plus the existing ID to **update** the same status update rather than creating a new one. Update `health` based on progress:
   - All items complete → `"completed"`
   - Any items failed/blocked → `"atRisk"`
   - Otherwise → `"onTrack"`

3. **When to sync** — Once, after all items have been processed (at the end of Step 2). Do not sync to Linear during processing.

If Linear MCP or `LINEAR_PROJECT_ID` is unavailable, skip all syncing silently.

---

## Step 2: Process Groups

Process each group in order. **Skip groups where all items are already checked.** For each group, run the checks described below, then save the file after the group is complete.

After processing each group:

1. Update the progress line at the top of the file:
   ```
   > **Progress:** X/18 complete | **Last updated:** {today's date}
   ```
2. Append any notes about the results to the `## Notes` section at the bottom
3. **Sync to Linear:**
   - Update the Linear issue description (via `mcp__linear__save_issue`) with the current state file content (the full checklist markdown with updated check marks)
   - Post a status update (via `mcp__linear__save_status_update`) on the issue: "Post-Launch Checklist: X/18 complete — {group name} processed"

---

### Group 1: Domain & SSL

All four items are **MANUAL** — they require checking the Netlify dashboard and live domain.

#### Item 1: Netlify primary domain matches previous primary (www vs non-www)

- Ask dev to confirm the primary domain setting in Netlify matches the intended www/non-www preference

#### Item 2: SSL provisioned, no SSL errors

- Ask dev to confirm SSL is provisioned and no certificate errors appear

#### Item 3: `NEXT_PUBLIC_IS_STAGING` removed from Netlify production env

- Ask dev to confirm this env var has been removed from production environment in Netlify

#### Item 4: `NEXT_PUBLIC_SITE_URL` set to production domain in Netlify

- Ask dev to confirm this is set to the correct production domain

Batch all 4 items in a single `AskUserQuestion` call.

**Save the state file after this group.**

---

### Group 2: Crawlability & SEO

All items are **MANUAL** — they require checking live URLs and external tools.

#### Item 5: Production website is crawlable

- Remind dev to verify at `{domain}/robots.txt`

#### Item 6: Staging and preview URLs are NOT crawlable

- Remind dev to check staging/preview robots.txt blocks crawling

#### Item 7: Netlify subdomain redirects to primary domain

- Advise dev: if not already done, create a `netlify.toml` redirect rule:
  ```
  [[redirects]]
    from = "https://[netlify-subdomain].netlify.app/*"
    to = "https://[primary-domain]/:splat"
    status = 301
    force = true
  ```
- Ask dev to confirm the redirect is working

#### Item 8: Sitemap URL contains production domain

- Remind dev to check `/sitemap.xml` output uses production domain, not staging/localhost

#### Item 9: Robots.txt contains correct sitemap URL

- Remind dev to verify the sitemap URL in robots.txt points to production domain

#### Item 10: Screaming Frog run — no 404 or 500 errors

- Remind dev to run Screaming Frog crawler and check for broken links / server errors

#### Item 11: Sitemap submitted to Google Search Console

- Remind dev to submit sitemap URL in Google Search Console

Process in 2 `AskUserQuestion` calls:

- First call: items 5, 6, 7, 8 (4 questions)
- Second call: items 9, 10, 11 (3 questions)

**Save the state file after this group.**

---

### Group 3: Netlify & Infrastructure

All three items are **MANUAL**.

#### Item 12: Slack notifications configured for build failures

- Ask: "Are Slack notifications configured in Netlify for both deploy preview and production build failures?"

#### Item 13: Previews up-to-date and working on production domain

- Ask dev to confirm Sanity previews work correctly on the production domain

#### Item 14: CORS origin added in Sanity

- Ask: "Has the live domain been added as a CORS origin in Sanity with credentials enabled?"

Batch all 3 in a single `AskUserQuestion` call.

**Save the state file after this group.**

---

### Group 4: Functional Verification

Both items are **MANUAL**.

#### Item 15: All forms tested on production

- Ask: "Have all forms been tested on the production URL and confirmed to deliver to the correct recipients?"

#### Item 16: All dev/test pages unpublished in Sanity

- Ask: "Have all development and test pages been unpublished or deleted in Sanity?"

Batch both in a single `AskUserQuestion` call.

**Save the state file after this group.**

---

### Group 5: Handover

Both items are **MANUAL**.

#### Item 17: Credentials updated in Hudle

- Ask: "Have all credentials been updated in Hudle with production values?"

#### Item 18: Client notified of go-live

- Ask: "Has the client been notified that the site is live?"

Batch both in a single `AskUserQuestion` call.

**Save the state file after this group.**

---

## Step 3: Final Summary

After all groups are processed:

1. **Sync to Linear one final time:**
   - Update the issue description with the final checklist state
   - Post a final status update: "Post-Launch Checklist: X/18 complete — all groups processed" (or "All 18 items passed — launch verified" if complete)
   - If all 18 items pass, update the issue status to "Done" (find the done status via `mcp__linear__list_issue_statuses` for the team)

2. **Display:**

```
## Post-Launch Checklist Complete

**Result:** X/18 items passed
**Linear:** {ISSUE_ID}

### Remaining Items
- [ ] Item description (reason)

Checklist saved to `docs/checklist-post-launch.md`
```

If all 18 items pass: "All post-launch checks complete. Launch verified."
