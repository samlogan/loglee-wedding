# Pre-Handover Checklist

Runs through a 16-item checklist to ensure the project is ready for client handover. Persists progress to `docs/checklist-pre-handover.md` and syncs to a Linear issue.

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
   - **Title:** "Pre-Handover Checklist"
   - **Team:** the project's team
   - **Project:** the project ID
   - **Description:** the full checklist markdown (all items unchecked — same as the state file content below)
6. Store the returned issue ID in the state file as `<!-- linear:ISSUE_ID -->` on line 3
7. Report: "Created Linear issue: {ISSUE_ID}"

---

## Step 1: Initialise State File

**State file path:** `docs/checklist-pre-handover.md`

### If `--reset` flag is passed

Delete the existing state file (if any) and proceed as if it doesn't exist.

### If state file exists (and no `--reset`)

1. Read `docs/checklist-pre-handover.md`
2. Parse all `- [x]` (completed) and `- [ ]` (pending) items
3. Count completed vs total
4. Display progress summary: "Pre-Handover Checklist: X/16 complete"

### If state file does not exist

Create `docs/checklist-pre-handover.md` with all items unchecked:

```markdown
# Pre-Handover Checklist

<!-- linear: -->

> **Progress:** 0/16 complete | **Last updated:** {today's date YYYY-MM-DD}

## Branding & Config

_Run `/project-setup` to complete these items._

- [ ] Theme options updated (no PLACEHOLDER values in `config/website.ts`)
- [ ] Default SEO information set (no PLACEHOLDER values in `config/metadata.ts`)
- [ ] Favicon and app icons added (`app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`)
- [ ] Open Graph image validated (exists and passes social preview validators)

## Content Quality

- [ ] All page templates match Figma designs
- [ ] 404 page styled and reviewed
- [ ] SEO fallback values for all content types
- [ ] No leftover boilerplate sections (starter kit sections removed if unused)

## CMS & Infrastructure

- [ ] No console key errors on any page
- [ ] On-demand revalidation working after CMS publish
- [ ] Previews working (draft mode functional)

## Client Documentation

- [ ] Looms recorded for client training
- [ ] Sanity documentation shared with client
- [ ] Credentials added to Hudle
- [ ] Client-facing Pastel created for UAT

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

   Place this on the line immediately after the `# Pre-Handover Checklist` heading.

2. **Subsequent syncs** — Read the `linear-status-id` from the state file. Call `mcp__linear__save_status_update` with the same parameters plus the existing ID to **update** the same status update rather than creating a new one. Update `health` based on progress:
   - All items complete → `"completed"`
   - Any items failed/blocked → `"atRisk"`
   - Otherwise → `"onTrack"`

3. **When to sync** — Once, after all items have been processed (at the end of Step 2). Do not sync to Linear during processing.

If Linear MCP or `LINEAR_PROJECT_ID` is unavailable, skip all syncing silently.

---

## Step 2: Process Items

**Processing order:** Handle all manual/semi-auto items first (Phase 1), then all automated items (Phase 2). This lets the user answer all questions upfront before automated checks run. **Skip items that are already checked.**

After each phase, update the progress line at the top of the file:

1. Update the progress line at the top of the file:
   ```
   > **Progress:** X/16 complete | **Last updated:** {today's date}
   ```
2. Append any notes about the results to the `## Notes` section at the bottom
3. **Sync to Linear:**
   - Update the Linear issue description (via `mcp__linear__save_issue`) with the current state file content (the full checklist markdown with updated check marks)
   - Post a status update (via `mcp__linear__save_status_update`) on the issue: "Pre-Handover Checklist: X/16 complete — {group name} processed"

---

### Phase 1: Manual & Semi-Auto Items

Process all items that require user input first. Gather context for semi-auto items before asking, then batch questions together.

#### Item 5: Open Graph image validated — SEMI-AUTO

- Check that `assets/images/open-graph.png` exists
- If file missing: keep `[ ]`, note file is missing (skip the question)

#### Item 7: 404 page styled and reviewed — SEMI-AUTO

- Check that `app/not-found.tsx` exists
- If missing: keep `[ ]`, flag that no custom 404 exists (skip the question)

#### Items 11–12: CMS & Infrastructure — SEMI-AUTO

- Item 11: Verify `app/api/revalidate/route.ts` exists and `.env.template` has `SANITY_WEBHOOK_SECRET`
- Item 12: Verify `app/api/draft/route.ts` exists and `.env.template` has `SANITY_API_READ_TOKEN`
- If prerequisites missing for either: keep `[ ]`, flag what's missing (skip those questions)

Now batch all manual and semi-auto questions into `AskUserQuestion` calls (max 4 questions per call):

**First call** — ask about items 5 (if file exists), 6, 7 (if file exists), 10:

- Item 5: "OG image file exists. Have you validated it at opengraph.xyz?"
- Item 6: "Have all page templates been reviewed against Figma designs?"
- Item 7: "404 page component exists (`app/not-found.tsx`). Have you visually reviewed it?"
- Item 10: "Have you checked all pages for console key errors?"

**Second call** — ask about items 11 (if prerequisites pass), 12 (if prerequisites pass), 13, 14:

- Item 11: "Does on-demand revalidation trigger correctly after CMS publish?"
- Item 12: "Is draft preview mode working correctly?"
- Item 13: "Have Looms been recorded for client training?"
- Item 14: "Has Sanity documentation been shared with the client?"

**Third call** — ask about items 15, 16:

- Item 15: "Have credentials been added to Hudle?"
- Item 16: "Has a client-facing Pastel been created for UAT?"

**Save the state file after Phase 1.**

---

### Phase 2: Automated Items

Run all automated checks without user interaction.

#### Item 1: Theme options updated — AUTO

- Read `config/website.ts`
- Search for any value containing `PLACEHOLDER`
- **Pass** → mark `[x]`, add note: "No PLACEHOLDER values found in website.ts — PASS"
- **Fail** → keep `[ ]`, list the placeholder values found

#### Item 2: Default SEO information — AUTO

- Read `config/metadata.ts`
- Search for any value containing `PLACEHOLDER`
- **Pass** → mark `[x]`, add note: "No PLACEHOLDER values found in metadata.ts — PASS"
- **Fail** → keep `[ ]`, list the placeholder values found

#### Item 3: Favicon and app icons added — AUTO

- Check that all three files exist: `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`
- **Pass** (all exist) → mark `[x]`
- **Fail** → keep `[ ]`, list which files are missing

#### Item 8: SEO fallback values for all content types — AUTO

- Read `tools/sanity/helpers/generateSanityMetadata.ts`
- Verify it has fallback values (check for fallback/default title and description patterns)
- Also check that document schemas (in `tools/sanity/schema/documents/`) include `seoData` field references
- **Pass** → mark `[x]`
- **Fail** → keep `[ ]`, describe what's missing

#### Item 9: No leftover boilerplate sections — AUTO

- Read `tools/sanity/helpers/sections.ts` to get the list of registered section types
- Cross-reference with sections that are actually used in CMS content by querying Sanity: `*[_type == "page"]{ "types": sections[]._type }` (via `mcp__sanity__query_documents` if available, otherwise check the section component files)
- If Sanity MCP is unavailable, fall back to checking whether the section schemas contain boilerplate placeholder content (e.g. look for "Lorem ipsum", "PLACEHOLDER", or default demo text in schema `initialValue` or `description` fields)
- Also check if `sections/index.ts` exports any sections whose component files still contain only boilerplate/placeholder content
- **Pass** (all registered sections are project-specific, no boilerplate remnants) → mark `[x]`, add note: "All sections are project-specific — PASS"
- **Fail** → keep `[ ]`, list the boilerplate sections that should be removed or replaced

**Save the state file after Phase 2. Then sync to Linear (see Linear Sync section).**

---

## Step 3: Final Summary

After all groups are processed:

1. **Sync to Linear one final time:**
   - Update the issue description with the final checklist state
   - Post a final status update: "Pre-Handover Checklist: X/16 complete — all groups processed" (or "All 16 items passed — ready for handover" if complete)
   - If all 16 items pass, update the issue status to "Done" (find the done status via `mcp__linear__list_issue_statuses` for the team)

2. **Display:**

```
## Pre-Handover Checklist Complete

**Result:** X/16 items passed
**Linear:** {ISSUE_ID}

### Remaining Items
- [ ] Item description (reason)
- [ ] Item description (reason)

Checklist saved to `docs/checklist-pre-handover.md`
```

If all 16 items pass: "All pre-handover checks complete. Ready for handover."
