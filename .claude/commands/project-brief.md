# Project Brief

Generate Linear milestones and tickets from a project proposal, structured as developer-focused build stages.

## Arguments

`$ARGUMENTS`

- _(no argument)_ — start the interactive flow at Step 0

---

## Step 0: Prerequisites

Check all prerequisites at once. Report ALL missing items in a single message — do not stop at the first failure.

### 0a: MCP Availability

Check for tools from all required and optional MCP servers:

| MCP    | How to check                       | Required? | Setup guidance if missing                                           |
| ------ | ---------------------------------- | --------- | ------------------------------------------------------------------- |
| Linear | `mcp__linear__save_issue`          | Yes       | "Add Linear MCP in `.claude/mcp.json` — see https://mcp.linear.app" |
| Figma  | `mcp__figma__get_screenshot`       | No        | Note availability — sitemap/designs may come from Figma             |
| Asana  | Any `mcp__claude_ai_Asana__*` tool | No        | Note availability for milestone import                              |
| Coda   | Any `mcp__coda__*` tool            | No        | Note availability for reading Coda docs                             |

Use `ToolSearch` to check for each MCP's tools. Only Linear is a hard blocker. Note which optional servers are available for use in later steps.

### 0b: Environment Variables

Read `.env.development` and check for:

| Variable         | Required for       | Action if missing                                      |
| ---------------- | ------------------ | ------------------------------------------------------ |
| `LINEAR_TEAM_ID` | All Linear actions | Ask user, tell them to find it in Linear Team Settings |

Only `LINEAR_TEAM_ID` is required at this stage. `LINEAR_PROJECT_ID` is resolved in Step 1.

---

## Step 1: Linear Project

Ask whether an existing Linear project should be used or a new one created:

> **Linear project?** Paste a Linear project URL or ID, or press Enter to create a new one.

### If a project URL/ID is provided

Parse the project identifier from the URL or use the ID directly. Call `mcp__linear__get_project` to validate it exists. Store the project name and ID.

### If empty (create new)

Ask for the project name:

> **Project name?** Enter a name for the new Linear project.

Create the project using `mcp__linear__save_project` with the `LINEAR_TEAM_ID`. Store the returned project ID.

### After resolving the project

1. Update `LINEAR_PROJECT_ID` in `.env.development` with the resolved project ID (add it if missing, update if different)
2. Fetch existing labels — call `mcp__linear__list_issue_labels` for the team. Store for later use.
3. Fetch existing milestones — call `mcp__linear__list_milestones` for the project. Store to avoid duplicates.

---

## Step 2: Gather Input

Ask each question one at a time using `AskUserQuestion`. Five prompts maximum.

**Prompt 1 — Proposal** (required):

> **Project proposal?** Paste a Coda URL, local file/PDF path, directory path, or paste the proposal content directly.

Parse the response:

- If it matches `*.coda.io/*` → fetch via Coda MCP (`mcp__coda__coda_get_page_content` or `mcp__coda__coda_list_pages` then fetch each page)
- If it matches a file path ending in `.pdf` → read via the Read tool (PDF mode with `pages` parameter for large PDFs)
- If it looks like a directory path → list and read key files in that directory
- Otherwise → treat as pasted free text

**Prompt 2 — Sitemap** (optional):

> **Sitemap?** Paste a sitemap URL, PDF path, or Figma URL showing the site structure — or press Enter to skip.

Parse the response:

- If it matches `*.figma.com/*` → fetch via Figma MCP (`mcp__figma__get_screenshot` for visual reference + `mcp__figma__get_design_context` for structure)
- If it matches a file path ending in `.pdf` → read via the Read tool
- If it matches a URL → fetch via `WebFetch`
- Otherwise → treat as pasted text

This provides critical context for understanding page structure, hierarchy, and section count.

**Prompt 3 — Asana** (only ask if Asana MCP was detected as available in Step 0):

> **Asana project?** Paste an Asana project or task URL to import milestones, or press Enter to skip.

If provided:

- Parse the Asana URL to extract the project/task ID
- Fetch the project via `mcp__claude_ai_Asana__get_project`
- Fetch tasks/milestones via `mcp__claude_ai_Asana__get_tasks`
- Store the milestone structure for use in Step 4

If Asana MCP is not available, skip this prompt entirely.

**Prompt 4 — Figma page designs** (optional, only ask if Figma MCP was detected as available in Step 0):

> **Figma page links?** To accurately identify sections for each page, paste the desktop and mobile Figma links for each page in this format:
>
> ```
> Homepage
>
> Desktop: https://figma.com/design/...?node-id=...
> Mobile: https://figma.com/design/...?node-id=...
>
> About
>
> Desktop: https://figma.com/design/...?node-id=...
> Mobile: https://figma.com/design/...?node-id=...
> ```
>
> Each block: page name on one line, then `Desktop:` and `Mobile:` lines beneath. Separate pages with a blank line. The mobile URL is optional — if no mobile design exists, the `Mobile:` line can be omitted. URLs should point to the top-level frame for that breakpoint. Press Enter to skip entirely (sections will be inferred from the proposal text instead).

Parse the response:

- Split into blocks separated by blank lines
- For each block:
  - First non-empty line = page name
  - Line starting with `Desktop:` (case-insensitive) = desktop URL
  - Line starting with `Mobile:` (case-insensitive) = mobile URL (optional)
- Tolerate the legacy single-URL format too — if a line contains a name followed by a single URL with no `Desktop:`/`Mobile:` prefix, treat that URL as the desktop URL
- Store as an array of `{ name, desktopUrl, mobileUrl }` pairs for use in Step 3 (`mobileUrl` may be `null`)

If Figma MCP is not available, skip this prompt entirely.

**Prompt 5 — Additional context** (optional):

> **Anything else?** Additional context, constraints, notes — or press Enter to skip.

Include verbatim. Empty = skip.

---

## Step 3: Parse Proposal Content

Analyse all gathered content and extract the following. Use agents to parallelise reading from multiple sources if needed.

### 3a: Extract Sections from Figma (if page links were provided)

If Figma page links were provided in Prompt 4, launch a **`figma-section-extractor` agent for each page in parallel**. This is the primary source of truth for section identification.

For each page, launch a `figma-section-extractor` agent with the page name, the desktop URL, and (if provided) the mobile URL. The agent has access to Figma MCP tools and will fetch the design data (screenshot + design context) for both breakpoints directly.

Collect the structured section lists returned by each agent.

Once all agents return, merge their results:

- Build the full page list with sections from the agent output
- Deduplicate sections that appear on multiple pages (same layout pattern = same section type, reused)
- Cross-reference with the proposal text for any pages or features the agents may have missed

If no Figma links were provided, skip this step — sections will be inferred from proposal text in 3b.

### 3b: Required extractions

- **Project name and client** — the project's name and the client it's for
- **Scope summary** — 2-3 sentence overview of what is being built
- **Full page list** — every page/template mentioned in the proposal, with:
  - Page name
  - Sections within that page (from Figma agent results if available, otherwise inferred from proposal)
  - Features per section (forms, carousels, animations, video embeds, maps, etc.)
- **Page priority** — rank pages by importance:
  1. Homepage (always first)
  2. Key conversion/landing pages
  3. Secondary content pages
  4. Utility pages (404, search, etc.)

When Figma agent results are available, they take precedence over proposal text for section identification. The proposal text still provides context for priorities, integrations, timeline, and scope.

### 3c: Optional extractions (include if present)

- **Design references** — Figma links, design system notes, brand guidelines
- **Sprint structure** — sprint names, durations, deliverables per sprint
- **Timeline/deadlines** — launch date, key milestone dates
- **Out of scope** — anything explicitly excluded
- **Third-party integrations** — analytics, CRM, email services, payment, etc.
- **Content migration** — if migrating from an existing site, note the source

---

## Step 4: Detect Delivery Model

### Sprint detection

Scan the parsed proposal for:

- Explicit "Sprint 1", "Sprint 2", etc. labels
- Phase/stage numbering with date ranges
- Asana milestones that follow a sprint pattern (sequential, time-boxed phases)

### If sprint structure is detected

Ask one follow-up:

> **Which sprint does development start?** The proposal has these sprints:
>
> 1. {Sprint 1 name} — {description}
> 2. {Sprint 2 name} — {description}
> 3. {Sprint 3 name} — {description}
>    ...
>
> Enter the number of the first sprint that includes development work (earlier sprints like Discovery/Design will be excluded from Linear tickets).

Store the starting sprint number. All sprints from that number onward become milestones. Sprints before that number are excluded entirely — do not create tickets for non-development sprints.

### If no sprint structure is detected

Propose section batches based on the page list and site size. Ask one follow-up:

> **Section batches?** Based on the sitemap, this site has **{N} pages** with approximately **{M} sections**. I'd suggest **{X} batches**:
>
> - **Batch 1 (Priority):** {Homepage, key landing pages} — {count} sections
> - **Batch 2:** {Secondary pages} — {count} sections
> - **Batch 3:** {Remaining pages} — {count} sections
>
> Does this grouping work, or would you like to adjust?

Guidelines for batch count:

- Small site (3-5 pages): 1-2 batches
- Medium site (6-10 pages): 2-3 batches
- Large site (11-20 pages): 3-4 batches
- Very large site (20+): 4-5 batches

The most important pages go in Batch 1. Group logically — pages that share section types should ideally be in the same batch.

---

## Step 5: Generate Milestones and Issues

### Issue philosophy

Keep issues **compact and branchable**. Each issue = one branch = one PR. Use **parent issues with subissues** for grouping — the parent issue is the unit of work you track, subissues are the individual items within it.

**Critical rules:**

- A section is ONE issue — schema, component, styles, query, and registration are all part of `/create-section`. Never split schema and component into separate issues.
- A page template is NOT a separate issue — it's created as part of the section batch (the template is trivial boilerplate once sections exist).
- Features like carousels, forms, animations belong WITH their section issue, not as separate issues.
- Prefer fewer, chunkier issues over many micro-tasks.

### Sprint-Based Model

For each sprint from the dev-start sprint onward:

- **Milestone:** Sprint name from the proposal (e.g., "Sprint 3: Build Phase 1")
- **Issues:** Derived from the sprint's deliverables as parent issues with subissues. Section work within a sprint should still be grouped by page priority.

### Non-Sprint Model — Default Developer Stages

Generate milestones in the following order. **Only include milestones that are relevant to the proposal.**

#### Milestone A: Import Design System

Single issue (no subissues needed):

- Import design tokens from Figma (`/design-system-import`)

Only include if a Figma design system is available. If not, skip this milestone entirely.

#### Milestone B: Project Setup

Single issue (no subissues needed):

- Run `/project-setup` with branding, configure environment variables, set up Netlify deployment, configure Sanity project and dataset

This is one task because it's done in a single sitting — `/project-setup` handles most of it.

#### Milestone C: Global Components

Parent issue: **Build global components** with subissues:

- Build Header component (logo, navigation, mobile menu)
- Build Footer component (links, social, legal)
- Build Button component variants (primary, secondary, outline)
- Any other reusable components identified in the proposal (cards, CTAs, etc.)

Each component subissue **must** include all three workflow commands in its technical notes (scaffold with `--no-plan`, review-design, review-code) plus the Figma desktop link if available.

#### Milestones D-N: Section Batches

One milestone per batch determined in Step 4. Each batch is a **parent issue** with **sections as subissues**:

```
Milestone: Section Batch 1 (Priority)
└── Parent: Build Section Batch 1 sections
    ├── Build Hero section (video background, CTA)
    ├── Build Intro section (highlighted keywords)
    ├── Build Services section (numbered list, icons)
    ├── Build Testimonial section (dark card, avatar, quote)
    ├── Build Stats section (counter, description)
    └── Build CTA section (heading, subtitle, button)
```

Section subissue titles should include key features in parentheses so the developer knows what's involved at a glance.

### Section Naming Rules (CRITICAL)

**Name sections by their LAYOUT PATTERN, not their content.** Sections are reusable CMS components — the same section will be used across multiple pages with different content. A content-specific name locks it to one use case.

| Content in Figma                | BAD name (content-specific) | GOOD name (layout-based)       |
| ------------------------------- | --------------------------- | ------------------------------ |
| "Our Mission" + large paragraph | `Mission`                   | `LargeText` or `StatementText` |
| Team member grid                | `OurTeam`                   | `PeopleGrid` or `ProfileGrid`  |
| "Why Choose Us" + feature cards | `WhyChooseUs`               | `FeatureCards` or `CardGrid`   |
| Company history timeline        | `OurHistory`                | `Timeline`                     |
| Client logos marquee            | `TrustedBy`                 | `LogoMarquee` or `LogoBar`     |
| "Get In Touch" + contact form   | `GetInTouch`                | `ContactForm`                  |
| Large quote with attribution    | `CEOMessage`                | `Blockquote` or `PullQuote`    |
| Stats counters (revenue, staff) | `CompanyStats`              | `Stats` or `CounterGrid`       |

**The test:** "Could a content editor reuse this section on a different page with completely different content and the name still makes sense?" If not, the name is too specific.

**Exceptions** — some sections ARE genuinely unique in purpose:

- `Hero` — always the top-of-page hero
- `ContactForm` — specifically a form, not just any content
- `Blog` — specifically blog-related
- `FAQ` — specifically FAQ accordion

When in doubt, prefer the generic layout name. The CMS `internalLabel` field exists for content editors to label specific instances (e.g., "Homepage — Our Mission").

**Do NOT create separate issues for:**

- Page templates (trivial — created alongside the first section for that page)
- Schema vs component (both are part of `/create-section`)
- Individual features within a section (carousel, form, animation = part of the section)

Each section subissue **must** include all three workflow commands in its technical notes (scaffold, review-design, review-code) plus the Figma desktop link if available from Prompt 4. Use `--no-plan` on the scaffold command so it does not interfere with `/ticket` plan mode.

#### Template Pages Milestone

Parent issue: **Build and populate template pages in Sanity** with subissues per page:

- Build {Page Name} page (list sections to add in Sanity)
- Build {Page Name} page
- ...

This is the CMS content assembly step — creating pages in Sanity Studio and populating them with the built sections. Include reviewing against Figma designs if available (using Figma and Sanity MCP).

#### Blog & Dynamic Content (only if applicable)

Parent issue: **Build blog/dynamic content** with subissues:

- Blog listing page with pagination/filtering
- Blog post template
- Author pages (if applicable)
- Category/tag pages (if applicable)
- RSS feed

#### Integration & Form Testing (only if applicable)

Parent issue: **Integration and form testing** with subissues:

- Test contact/enquiry forms end-to-end
- Configure third-party integrations (analytics, GTM, CRM, etc.)
- Test webhook and revalidation flow
- Any other integration items from the proposal

Only include if there are forms or third-party integrations beyond basic analytics.

#### Pre-Handover

Parent issue: **Pre-handover checklist** with subissues:

- Run `/checklist-pre-handover`
- CMS handover documentation and content entry support
- Schema validation (`/audit-schema`)
- Content audit (`/audit-content`)

#### Pre-Launch

Parent issue: **Pre-launch checklist** with subissues:

- Run `/checklist-pre-launch`
- Configure metadata and Open Graph for all pages
- Implement JSON-LD structured data
- Set up sitemap generation and robots.txt
- Optimise images and loading performance
- Cross-browser testing (Chrome, Safari, Firefox, Edge)
- Cross-device testing (desktop, tablet, mobile)
- Accessibility audit (`/audit-a11y`)
- Set up redirects from old site (if content migration)

#### Post-Launch

Parent issue: **Post-launch checklist** with subissues:

- Run `/checklist-post-launch`
- Third-party integrations verification (analytics, GTM)
- User acceptance testing (UAT)

### Issue Description Template

**Parent issues** get a brief description:

```markdown
## Overview

{1-2 sentences summarising the group of work.}

## Subissues

{Auto-generated list — Linear handles this via parent/child relationship.}
```

**Subissues** get a focused description:

```markdown
## Overview

{1-2 sentences explaining what needs to be done.}

## Requirements

- {Specific requirement from the proposal}
- {Another requirement}

## Design System

- Use theme-aware CSS custom properties for colours — `var(--fg-default)`, `var(--bg-default)`, `var(--fg-muted)`, etc. Never hardcode hex values
- Use `var(--primary-500)`, `var(--secondary-500)` for brand colours
- Use button tokens — `var(--button-primary-bg)`, `var(--button-primary-fg)`, etc.
- Use the `Container` component for content width (not manual `max-width`)
- Use `Text` component with `variant="heading"` for headings and `TextBlock` for rich text
- Use `TextTitle` for title fields (Sanity rich text titles)
- Use `Image` component for all Sanity images
- Use `Link` component for CTAs with `variant` and `size` props
- Wrap all SCSS in `@layer defaults { ... }`
- Use media mixins (`@include media-down(tablet)`) co-located inside selectors
- Use `classNames` helper for all class composition

## Acceptance Criteria

- [ ] {Measurable criterion}
- [ ] Uses design system tokens — no hardcoded colours, spacing, or font sizes
- [ ] Responsive — matches desktop and mobile Figma designs
- [ ] Passes `/check` (lint, format, type checks)

## Technical Notes

{Only if there are specific technical considerations.}

{For sections — ALWAYS include all three commands and Figma links. Include `--mobile=` only if a mobile URL is available; omit the flag entirely if not.}

### 1. Build

`/create-section {Name} --no-plan --desktop={desktop-url} --mobile={mobile-url}`

### 2. Review

`/review-design {Name}Section`

`/review-code {Name}Section`

### Figma

- Desktop: {desktop URL from Prompt 4}
- Mobile: {mobile URL from Prompt 4 — omit this line if not available}

{For components — ALWAYS include all three commands and Figma links. Include `--mobile=` only if a mobile URL is available; omit the flag entirely if not.}

### 1. Build

`/create-component {Name} --no-plan --desktop={desktop-url} --mobile={mobile-url}`

### 2. Review

`/review-design {Name}`

`/review-code {Name}`

### Figma

- Desktop: {desktop URL if available}
- Mobile: {mobile URL if available — omit this line if not}

{Reference libraries: "Requires Embla Carousel", "Use React Hook Form", "Use Motion for animation"}
```

**Rules for descriptions:**

- Keep descriptions concise — avoid restating what's obvious from the title
- Technical Notes only when there is something specific to call out
- Priority: High (2) for Milestones A-C (setup/blocking), Normal (3) for everything else
- Labels: infer from context — e.g., `frontend`, `cms`, `design-system`, `seo`, `qa`
- **NEVER include hardcoded pixel values, font sizes, colours, border-radius, or spacing values** in ticket titles, descriptions, or requirements. Describe the visual pattern — the design system and Figma MCP handle all measurements at build time. Hardcoded values cause Claude to bypass design tokens.
  - BAD: "Build PeopleGrid section (3x cards: photo 412px, rounded 16px, name 24px, position 18px grey)"
  - GOOD: "Build PeopleGrid section (team member cards with rounded photo, name, and position)"

---

## Step 6: Enter Plan Mode and Preview

**Enter plan mode** using the `EnterPlanMode` tool before showing the preview. This gives the developer a chance to iterate on the structure before anything is created in Linear.

### Display the full plan

```
## Project Brief: {Project Name}

**Client:** {client name}
**Linear Project:** {project name} ({existing / newly created})
**Delivery Model:** {Sprint-based / Standard build stages}
**Section Batches:** {count}
**Milestones:** {total count}
**Issues:** {total count} ({parent count} parent + {sub count} subissues)

---

### Milestone A: Import Design System

| # | Title | Priority | Labels |
|---|-------|----------|--------|
| 1 | Import design tokens from Figma | High | design-system |

### Milestone B: Project Setup

| # | Title | Priority | Labels |
|---|-------|----------|--------|
| 1 | Run /project-setup, configure env, Netlify, Sanity | High | setup |

### Milestone C: Global Components

| # | Title | Type | Priority | Labels |
|---|-------|------|----------|--------|
| 1 | Build global components | Parent | Normal | frontend |
|   | ├── Build Header component | Sub | Normal | frontend |
|   | ├── Build Footer component | Sub | Normal | frontend |
|   | └── Build Button variants | Sub | Normal | frontend |

### Milestone D: Section Batch 1 (Priority)
{Homepage, About — 8 sections}

| # | Title | Type | Priority | Labels |
|---|-------|------|----------|--------|
| 1 | Build Section Batch 1 sections | Parent | Normal | frontend |
|   | ├── Build Hero section (video, CTA) | Sub | Normal | frontend |
|   | ├── Build Intro section (keywords) | Sub | Normal | frontend |
|   | ├── Build Services section (icons) | Sub | Normal | frontend |
|   | └── ... | | | |

### Milestone E: Section Batch 2
{Data Centres, People, Contact — 6 sections}

| # | Title | Type | Priority | Labels |
|---|-------|------|----------|--------|
| 1 | Build Section Batch 2 sections | Parent | Normal | frontend |
|   | ├── Build Contact section (form) | Sub | Normal | frontend |
|   | └── ... | | | |

### Milestone F: Template Pages

| # | Title | Type | Priority | Labels |
|---|-------|------|----------|--------|
| 1 | Build and populate template pages | Parent | Normal | cms |
|   | ├── Build Homepage | Sub | Normal | cms |
|   | ├── Build About page | Sub | Normal | cms |
|   | └── ... | | | |

...

### Milestone G: Pre-Handover

| # | Title | Type | Priority | Labels |
|---|-------|------|----------|--------|
| 1 | Pre-handover checklist | Parent | Normal | qa |
|   | ├── Run /checklist-pre-handover | Sub | Normal | qa |
|   | └── ... | | | |

### Milestone H: Pre-Launch

| # | Title | Type | Priority | Labels |
|---|-------|------|----------|--------|
| 1 | Pre-launch checklist | Parent | Normal | qa |
|   | ├── Run /checklist-pre-launch | Sub | Normal | qa |
|   | └── ... | | | |

### Milestone I: Post-Launch

| # | Title | Type | Priority | Labels |
|---|-------|------|----------|--------|
| 1 | Post-launch checklist | Parent | Normal | qa |
|   | ├── Run /checklist-post-launch | Sub | Normal | qa |
|   | └── ... | | | |

---

### Labels to Create
{List any labels that do not already exist in Linear and would need to be created}

---

Does this look right? I can:
- Adjust milestones (add, remove, rename, reorder)
- Move sections between batches
- Add or remove issues
- Change priorities or labels
```

**Stay in plan mode.** Revise the structure if the developer requests changes. Only proceed to creation when the developer explicitly approves.

---

## Step 7: Create in Linear

**Exit plan mode** using the `ExitPlanMode` tool, then execute creation in this order:

### 7a: Create missing labels

For each label identified in the preview that does not already exist, call `mcp__linear__create_issue_label`.

### 7b: Create milestones

For each milestone, call `mcp__linear__save_milestone` with:

- `name`: The milestone name
- `description`: Brief description of what this milestone covers
- `targetDate`: If known from proposal timeline (ISO date string), otherwise omit

Store the returned milestone IDs for use when creating issues.

### 7c: Create issues

For milestones with a **single issue** (A, B): create one issue directly via `mcp__linear__save_issue`.

For milestones with **parent + subissues** (C onward):

1. Create the **parent issue** first via `mcp__linear__save_issue` with the milestone, project, team, priority, and labels. Store the returned issue ID.
2. Create each **subissue** via `mcp__linear__save_issue` with `parentId` set to the parent issue ID. Also include the same milestone, project, team, and labels.

All `mcp__linear__save_issue` calls use:

- `title`: The issue title
- `description`: The description from the template
- `team`: The `LINEAR_TEAM_ID` value from `.env.development`
- `project`: The resolved project ID from Step 1
- `priority`: The assigned priority (2 for High, 3 for Normal)
- `labels`: Array of label names
- `milestone`: The milestone ID from step 7b
- `parentId`: (subissues only) The parent issue ID

Process issues **sequentially within each milestone** to maintain ordering.

### 7d: Post project status update

Call `mcp__linear__save_status_update` with:

- `type`: `"project"`
- `project`: The resolved project ID
- `health`: `"onTrack"`
- `body`: A Markdown summary including:
  - Project name and client
  - Delivery model (sprint-based or standard stages)
  - Number of milestones and issues created
  - Source of the proposal (Coda doc, PDF, etc.)
  - Any notable scope decisions or exclusions

---

## Step 8: Summary

Report to the developer:

```
## Project Brief Created

**Linear Project:** {project name}
**Milestones created:** {count}
**Issues created:** {total} ({parent count} parent + {sub count} subissues)
**Labels created:** {count, if any}

### Milestones

| Milestone | Issues | Target Date |
|-----------|--------|-------------|
| A: Import Design System | 1 | — |
| B: Project Setup | 1 | — |
| C: Global Components | 1 + {n} subs | — |
| D: Section Batch 1 | 1 + {n} subs | — |
| ... | | |

### Next Steps

1. Review issues in Linear
2. Run `/ticket {first-ticket-id}` to start working
```
