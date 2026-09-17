# Ticket manifest

How `/batch-tickets` and `/batch-parallel` turn Linear ticket IDs into `tickets.json`. Both follow
this verbatim — it lives here so the two cannot drift, which is exactly what happened to
`/batch-sections` and `/batch-components` before they were deleted.

**Manifest location:** `.claude/skills/{calling-skill}/tickets.json`

## Generating the manifest

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
