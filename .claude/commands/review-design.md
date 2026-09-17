# Review Design (Figma vs Browser Visual Comparison)

Compare a built section or component against its Figma design using Figma MCP and Storybook + Playwright MCP. Renders the target via its existing Storybook story and performs a multi-phase visual comparison with autonomous fixing. See the "Driving Storybook headlessly" section in `CLAUDE.md` for story ID and iframe URL conventions.

## Browser Automation: Playwright (via MCP)

| Task                      | Tool                                                                |
| ------------------------- | ------------------------------------------------------------------- |
| Navigate to a URL         | `mcp__playwright__browser_navigate`                                 |
| Resize viewport           | `mcp__playwright__browser_resize`                                   |
| Take a screenshot         | `mcp__playwright__browser_take_screenshot`                          |
| Evaluate JavaScript       | `mcp__playwright__browser_evaluate`                                 |
| Wait for selector/timeout | `mcp__playwright__browser_wait_for`                                 |
| Click / hover             | `mcp__playwright__browser_click` / `mcp__playwright__browser_hover` |
| Read console messages     | `mcp__playwright__browser_console_messages`                         |

**IMPORTANT:** The Playwright MCP manages its own browser context — no tab management is required. If the Playwright MCP is not connected, fall back to Bash invocations of a one-off Playwright Node script (the `playwright` package is a devDependency).

## Figma MCP

| Task                    | Tool                             |
| ----------------------- | -------------------------------- |
| Get design specs + code | `mcp__figma__get_design_context` |
| Get visual screenshot   | `mcp__figma__get_screenshot`     |
| Get metadata/dimensions | `mcp__figma__get_metadata`       |

---

## CRITICAL RULES

**PHASE DISCIPLINE: You MUST complete every phase in order. Do NOT skip phases, combine phases, or abbreviate any phase. If context is getting long, that is NOT a reason to cut corners — it is a reason to be more methodical. Every phase exists because skipping it has caused bugs in the past.**

1. **NEVER call anything "minor"** unless it is literally invisible at 100% zoom. If a user would notice it, it's moderate or significant.
2. **NEVER suggest skipping** an issue. Every difference gets reported and fixed.
3. **Figma is the source of truth** for visual design. The design system is the source of truth for implementation approach. Where they conflict, match the visual intent using design system tools.
4. **Props over section CSS.** ALWAYS use existing component props (e.g., Image `aspectRatio`, Text `size`/`variant`/`weight`, Link `variant`/`size`/`theme`, Section `theme`/`spacing`) instead of writing one-off CSS overrides. Section SCSS should only contain layout/positioning specific to that section.
5. **MANDATORY: Reuse existing components.** Check `components/` for an existing component before writing ANY custom styles. Use the right combination of `variant`, `size`, `theme`, `weight`, `color`, `textTransform`, `alignment`.
6. **Fix globally, not locally.** If a review reveals a broken pattern, fix the shared component/helper — not with a section-specific workaround. Every review should leave the codebase better for the next one.
7. **DRY without compromising design.** Code should be as DRY as possible. Never duplicate what a component prop already handles. But if the design requires a specific value that no prop provides, write the CSS — don't compromise the design for DRY's sake.
8. **Rounding to design system props is allowed.** If Figma has 19px but `<Text size="lg">` gives 18px, prefer the component prop. Only hand-code CSS when the difference is significant (5px+ or obviously wrong).
9. **ONE section at a time.** Enter plan mode at the start of each section review. Do NOT batch.
10. **Autonomous fix loop — never defer, never skip.** Keep fixing and re-verifying until the section passes. The user expects 98% autonomous handling.
11. **ALWAYS verify with `getComputedStyle()`.** Never assume a component prop produces the right pixel value — measure the actual rendered element.
12. **Verify every iteration with screenshots.** Never report a fix without taking a fresh screenshot to confirm it visually. If you change CSS, take a screenshot. If the screenshot reveals a new issue, fix it and screenshot again.
13. **Every re-verification is a FULL review.** After fixing issues, treat every re-screenshot as a brand new review. Do NOT just verify targeted fixes — check every element again.
14. **NEVER set CSS font-size on a wrapper div.** Text component applies its own `font-size` on the rendered element — setting font-size on a wrapper div does nothing. Use Text `size` prop, TextBlock `config`, or direct CSS on the text element itself.
15. **Use design system colour tokens.** Use `var(--fg-default)`, `var(--bg-default)`, `var(--primary-500)` etc. — never hardcode hex values in section SCSS unless the design uses a one-off colour not in the token system.
16. **Section spacing uses Section component props.** `removeTopSpacing`, `removeBottomSpacing`, `spacing` — never hand-code section padding.
17. **Image aspect ratios use the Image component prop.** Pass `aspectRatio` to the Image component — don't set `aspect-ratio` in section SCSS.
18. **Theme is set on the Section component.** Pass `theme="dark"` etc. — never manually set `data-theme` or `background-color` on the section wrapper.
19. **Fix for the future** — do not cut corners. Make it easier for next time where possible.
20. **Follow CLAUDE.md conventions** — arrow functions, classNames helper, SCSS layers, CSS custom properties.

---

## Arguments

`$ARGUMENTS`

**Required:** Section or component name in PascalCase (e.g., `HeroSection`, `GridSection`, `Badge`, `Tooltip`).

**Figma URL is optional** — the design source is read from the story's `parameters.design.url` (set at creation by `/create-section` / `/create-component`). Pass a URL only to override the story's bound design. See Phase 0e for resolution + the missing-design gate.

The command auto-detects whether the target is a section or component:

1. Check if `sections/{Name}Section/` exists → **section review**
2. Else check if `components/{Name}/` exists → **component review**
3. If neither exists, stop and suggest `/create-section` or `/create-component`

**Optional flags:**

- `--theme=<name>` — Theme to render (default: `light`). Options: `light`, `dark`, `primary`, `secondary`, `tertiary`
- `--fix` — Automatically fix issues after review (default behaviour — always fixes)
- `--no-plan` — Skip entering plan mode
- `--storybook-port={N}` — Storybook port to render against (default 6006)
- `--browser=mcp|bash` — Browser driver (default mcp)

**Examples:**

```
/review-design GridSection
/review-design Badge https://www.figma.com/design/abc123/...?node-id=5-678   # override the bound design
```

---

### Render target — `{PORT}` and the browser

Every URL in this file is written `http://localhost:{PORT}`. Resolve `{PORT}` once, here:

- `--storybook-port={N}` — default **6006**. `/batch-parallel` passes a distinct port per worktree,
  because one Storybook instance serves one checkout: N concurrent reviews against a shared 6006 all
  measure whichever worktree owns it and return confidently wrong numbers without erroring.
- `--browser=mcp|bash` — default **mcp**. Use `bash` when several reviews run concurrently: the
  Playwright MCP is a single browser shared across the session, so parallel `browser_navigate` calls
  interleave in one tab. In `bash` mode drive a one-off Playwright Node script instead (`playwright`
  is a devDependency), which gives this review its own browser process.

Both default to today's behaviour, so a plain invocation is unchanged.

---

## Phase 0: Prerequisites & Setup

### 0a: Verify MCP availability

| MCP        | How to check                        | Required? |
| ---------- | ----------------------------------- | --------- |
| Figma      | `mcp__figma__get_screenshot`        | Yes       |
| Playwright | `mcp__playwright__browser_navigate` | Yes       |

Use `ToolSearch` to check. Both are hard blockers — stop if either is missing. If Playwright MCP is missing, instruct the user to add it to `.mcp.json` (`@playwright/mcp`) and restart Claude.

### 0b: Detect target type and verify files

Determine whether the target is a **section** or **component**:

1. Check if `sections/{Name}Section/index.tsx` exists → **section mode**
2. Else check if `components/{Name}/index.tsx` exists → **component mode**
3. If neither exists, stop: "Target not found. Run `/create-section {Name}` or `/create-component {Name}` first."

**For sections**, verify all 4 files exist:

```
sections/{Name}Section/index.tsx
sections/{Name}Section/styles.module.scss
sections/{Name}Section/queries.groq.ts
tools/sanity/schema/sections/{camelCase}Section.ts
```

**For components**, verify:

```
components/{Name}/index.tsx
components/{Name}/styles.module.scss
```

Store the target type (`section` or `component`) for use in later phases.

### 0c: Verify Storybook is running

Check if Storybook is responding on port `{PORT}`:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:{PORT}/iframe.html 2>/dev/null || echo "DOWN"
```

If down, start it in the background and wait until the iframe responds:

```bash
yarn storybook --port {PORT} > /tmp/storybook-{PORT}.log 2>&1 &
until curl -s -o /dev/null http://localhost:{PORT}/iframe.html; do sleep 1; done
```

The dev server (port 3000) is **not** required — Storybook is the render target.

### 0d: Resolve the Storybook story ID

Build the story ID for the target:

**Look the story ID up in `http://localhost:{PORT}/index.json` — do not build it from the folder name.** Titles group by what a thing _is_, so `FaqSection` lives at `Sections/FAQ` → `sections-faq--default`. Match on `type === 'story'` **and the export name** (`Default` unless `--story` names another — most titles have several stories, so a title-only match is ambiguous for almost every target), with the leaf title normalised (`toLowerCase()`, strip non-alphanumerics) against the folder name with a trailing `Section` removed, and filter by whether the title starts with `Sections/` according to the mode this command already determined. No fallback to the opposite group — if nothing matches, stop. See `/review-code` Phase 0d for the full rule and why each part matters.

If the developer wants a specific story variant other than `Default`, pass it via `--story=<export-name-kebab>`.

Verify the story exists by fetching the iframe URL and confirming HTTP 200:

```bash
STORY_URL="http://localhost:{PORT}/iframe.html?id={story-id}&viewMode=story"
curl -s -o /dev/null -w "%{http_code}" "$STORY_URL"
```

If the story doesn't exist (404), stop and tell the user:

> "No Storybook story found for `{Name}` at `{story-id}`. Create one in `{path-to-stories-file}` before running /review-design."

### 0e: Resolve the Figma design source (from the story's binding)

The Figma source is bound to the story via `parameters.design.url`. Resolve it in this order:

1. If a Figma URL was passed in `$ARGUMENTS`, use it (explicit override).
2. Otherwise, read the story file (`sections/{Name}Section/{Name}Section.stories.tsx` or `components/{Name}/{Name}.stories.tsx`) and extract `parameters.design.url`.

**Set the review mode based on what you find — do NOT stop if there's no design:**

- **A URL was resolved → `full` mode.** Run the complete review including the Figma visual + measurement comparison (Phases 1, 5, 7).
- **No URL (neither arg nor `parameters.design`) → `compliance` mode.** This is normal and expected for primitives (`Badge`, `Icon`, `Text`, `Container`) that don't map to a single Figma frame. Skip the Figma-dependent phases (1, 5, 7) and run the content-independent review: design-system token compliance and spacing/typography/colour-token usage (Phases 3, 4, 6 minus the visual re-measure), **plus the `accessibility-reviewer` agent alongside `design-code-reviewer` in Phase 3**.

  That a11y agent is not optional in this mode and is the reason compliance mode is worth running at all. Compliance mode is the primitives path — buttons, icons, fields, containers — which is precisely where keyboard, focus and semantic-HTML defects live, and precisely what a pixel comparison would never have caught. Launch it in the same parallel message as `design-code-reviewer`.

  Note clearly in the report:

  > "No Figma design bound to `{Name}` — ran design-system / token compliance + accessibility review; skipped the Figma pixel comparison. Bind a design via `parameters.design` to enable the full visual review."

`parameters.design` is **optional**, never required. When present it is the single source of truth for the comparison (story and design stay in sync); when absent the review still adds value, it just can't compare pixels.

---

## Phase 1: Extract Design Specs from Figma

**Skip this phase entirely in `compliance` mode (no design bound).**

### 1a: Get Figma design context

Parse the resolved Figma URL (from Phase 0e) to extract `fileKey` and `nodeId`. Call:

1. `mcp__figma__get_screenshot` — capture the visual reference
2. `mcp__figma__get_design_context` — get design specs, code hints, and structure

### 1b: Extract design specifications

From the Figma design context, extract and record:

| Category       | What to extract                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| **Layout**     | Flex/grid direction, gap, alignment, padding, max-width, column ratios                                 |
| **Typography** | Every text element: font-size, font-weight, line-height, letter-spacing, colour, text-transform        |
| **Colours**    | Background, text colours, border colours, accent colours — map to CSS custom properties where possible |
| **Spacing**    | All padding, margin, gap values between elements                                                       |
| **Images**     | Aspect ratios, object-fit, border-radius, any overlays                                                 |
| **Components** | Buttons (variant, size), links, cards, icons — map to existing boilerplate components                  |
| **Responsive** | If mobile frame is provided (check for a second node/frame), extract mobile-specific values            |
| **Theme**      | Light/dark — infer from background colour                                                              |

### 1c: Check for mobile design

If the Figma URL points to a single frame, ask:

> **Mobile design?** Paste a Figma URL for the mobile version, or press Enter to skip (responsive behaviour will be inferred from desktop).

If provided, fetch the mobile design context too.

### 1d: Map to design system

Map every extracted value to the closest design system token or component prop:

- Font sizes → `Text` component `size` prop or heading CSS custom properties
- Colours → CSS custom properties (`--fg-default`, `--primary-500`, etc.)
- Spacing → standard spacing values or CSS custom properties
- Buttons → `Link` component with `variant`/`size`/`theme` props
- Images → `Image` component with `aspectRatio` prop

Flag any values that DON'T map to existing tokens — these will need section-specific CSS.

---

## Phase 2: Create Temporary Review Page

### 2a: Generate dummy data

Read the target's TypeScript interface from the schema file (sections) or component file (components). Generate placeholder data that matches the Figma design:

- **Text content:** Use the actual text visible in the Figma design (headings, body copy, button labels)
- **Images:** Use `https://placehold.co/{width}x{height}` URLs matching the Figma image dimensions and aspect ratios
- **Rich text (blockContent):** Structure as proper Sanity block content arrays
- **Buttons/Links:** Match the labels and types shown in Figma
- **Cards/Lists:** Match the count and content visible in Figma

### 2b: Verify a matching Storybook story exists

Sections and components are rendered via their `.stories.tsx` files — no temporary review page is needed. The story acts as the canonical fixture for the design review.

1. Resolve the story ID for the target (see Phase 0d). Default is `Default`; override with `--story=<export-kebab>`.
2. Fetch `http://localhost:{PORT}/index.json` and confirm the story ID is present.
3. If the story is missing, generate one by following the template in `.claude/commands/create-section.md` (Step 2e) or `.claude/commands/create-component.md` (Step 3), using the data composed in Phase 2a (text, images, button labels).

### 2c: Verify the story renders

1. Navigate Playwright to `http://localhost:{PORT}/iframe.html?id={story-id}&viewMode=story`
2. Wait 2 seconds for CSS animations and Storybook init to settle
3. Take a screenshot to confirm it renders
4. If the story shows an error, fix the story's `args` to match the component's actual prop shape and retry

---

## Phase 3: Code Review (AGENT)

**In `compliance` mode, launch `accessibility-reviewer` in the same message** — see Phase 0e. In
normal mode `design-code-reviewer` runs alone; accessibility is covered by `/review-code` Phase 3b.

Launch the `design-code-reviewer` agent with:

- Section name (PascalCase and camelCase)
- Figma design specifications extracted in Phase 1
- Design system token mappings from Phase 1d

This agent will:

- Read the section component, styles, and schema
- Check every component usage against available props
- Identify CSS overrides that should be component props
- Identify missing design system token usage
- Check DRY violations
- Return a numbered list of code issues

**Wait for the agent to complete before proceeding.**

---

## Phase 4: Fix Round 1

1. Combine findings from Phase 3 into a prioritised list
2. Enter plan mode (unless `--no-plan`) and present the full list for approval
3. Apply all fixes
4. Run `yarn fix && yarn ts:check`

---

## Phase 5: Visual Measurement & Comparison (AGENT)

**Skip in `compliance` mode (no design bound)** — there are no Figma specs to measure against.

Launch the `design-visual-comparer` agent with:

- Target name (section or component)
- Figma design specifications (all extracted values from Phase 1)
- Storybook story ID (resolved in Phase 0d) — the agent builds the iframe URL itself
- Desktop viewport: 1440px
- Mobile viewport: 414px (if mobile design was provided)

This agent will:

- Navigate to the Storybook iframe URL at each viewport via Playwright MCP
- Run `getComputedStyle()` measurements on every visible element
- Compare every measured value against the Figma design specs
- Return a structured comparison table with mismatches

**Wait for the agent to complete before proceeding.**

---

## Phase 6: Fix Round 2 + Re-measure Loop

1. Review the measurement mismatches from the agent
2. Apply fixes for each mismatch
3. Run `yarn fix && yarn ts:check`
4. **Re-launch the `design-visual-comparer` agent** with the same parameters
5. Repeat until the agent reports all values match (or remaining differences are within tolerance)

**MANDATORY after EVERY fix round:**

- Take fresh screenshots at BOTH viewports using `mcp__playwright__browser_take_screenshot`
- Visually compare against the Figma screenshot from Phase 1
- If any visual issue is spotted, fix it and repeat

---

## Phase 7: Screenshot Confirmation

**Skip in `compliance` mode (no design bound)** — there is no Figma reference to confirm against.

Only AFTER Phases 3-6 are complete:

1. Resize Playwright to 1440px, navigate to the Storybook iframe URL, wait 2 seconds
2. Take a screenshot with `mcp__playwright__browser_take_screenshot`
3. Compare against the Figma design screenshot from Phase 1a
4. Resize to 414px, take a mobile screenshot
5. If mobile Figma design was provided, compare against that too

**Look for what measurement cannot catch.** Phase 5's `design-visual-comparer` has already compared
every computed value against the Figma spec — layout, spacing, typography, colour, component sizing,
responsive reflow and alignment are settled, and re-eyeballing them from a screenshot is strictly
less reliable than the numbers you already have. Re-check them only where a Phase 6 fix touched them.

What a per-element measurement pass genuinely cannot see:

1. **Missing elements** — anything in the Figma frame with no counterpart in the build. A comparer
   measures the elements that exist; it cannot miss what was never rendered.
2. **Extra elements** — anything rendered that the design does not have.
3. **Clipping and overflow** — content cut off, unexpected white space, a scrollbar that shouldn't be
   there. These are relationships between boxes, not properties of one.
4. **Visual order and grouping** — whether the eye lands in the same sequence as the design. Correct
   individual values can still assemble into the wrong composition.
5. **Anything the fixes in Phase 6 disturbed** — a spacing change that pushed a neighbour, a font
   change that reflowed a line.

If issues remain, fix them and repeat Phase 7 until the section passes.

---

## Phase 8: Cleanup & Report

### 8a: Stop ad-hoc Storybook

If `/review-design` started Storybook itself in Phase 0c, you can leave it running for follow-up reviews. Otherwise (or to free port `{PORT}`), kill the process with `lsof -ti:{PORT} | xargs kill`. No filesystem cleanup is needed — stories are permanent fixtures.

### 8b: Run final checks

Run `yarn fix && yarn ts:check` to ensure no issues remain.

### 8c: Generate report

```
## Design Review: {Name}

### Figma Source
- **Design URL:** {Figma URL}
- **Theme:** {theme}

### Rating
- **Desktop:** {rating}
- **Mobile:** {rating}

### Issues Found & Fixed: {count}

1. **{description}** — Severity: {moderate/significant}
   - Category: {code/visual/spacing/typography/colour}
   - Figma: {value}
   - Before: {value}
   - Fix: {what was changed — component prop vs CSS}

### Design System Compliance
- Component props used: {count} (vs CSS overrides: {count})
- Colour tokens used: {count} (vs hardcoded: {count})
- Section SCSS lines: {count} (layout/positioning only: {yes/no})

### Measurement Comparison (Desktop 1440px)
| Element | Property | Figma | Browser | Match |
|---|---|---|---|---|
| tagline | fontSize | 14px | 14px | Y |
| heading | fontSize | 48px | 48px | Y |
| ... | ... | ... | ... | ... |

### Summary
- Total issues fixed: {count}
- Overall rating: {rating}
- DRY score: {assessment}
```

### Rating Scale

- **Pixel-perfect** — no visible differences
- **Strong match** — minor sub-pixel differences, would not flag in review
- **Needs adjustment** — visible differences that should be fixed
- **Significant deviation** — layout or structural differences that must be addressed

### Next Step

> Run `/review-code {Name}` to review code quality, accessibility, and browser behaviour.
