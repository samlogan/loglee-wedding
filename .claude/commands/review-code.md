# Review Code

Senior lead developer review of a section or component — focused on **reusability, component structure, future-proofing, and best practices**. The goal is to ensure every section and component is built so the next developer can build on it confidently, patterns that repeat are shared not copied, and the design system is used consistently.

Uses parallel agents for deep static analysis (code quality + accessibility), then exercises interactivity headlessly via Storybook + Playwright MCP. See the "Driving Storybook headlessly" section in `CLAUDE.md` for story ID and iframe URL conventions.

## Browser Automation: Playwright (via MCP)

| Task                      | Tool                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Navigate to a URL         | `mcp__playwright__browser_navigate`                                                                        |
| Resize viewport           | `mcp__playwright__browser_resize`                                                                          |
| Take a screenshot         | `mcp__playwright__browser_take_screenshot`                                                                 |
| Evaluate JavaScript       | `mcp__playwright__browser_evaluate`                                                                        |
| Wait for selector/timeout | `mcp__playwright__browser_wait_for`                                                                        |
| Click / hover / focus     | `mcp__playwright__browser_click` / `mcp__playwright__browser_hover` / `mcp__playwright__browser_press_key` |
| Read console messages     | `mcp__playwright__browser_console_messages`                                                                |

**IMPORTANT:** Playwright MCP manages its own browser context. If the MCP is not connected, fall back to a Bash invocation of a one-off Playwright Node script (the `playwright` package is a devDependency).

---

## Arguments

`$ARGUMENTS`

**Required:** Section or component name in PascalCase (e.g., `HeroSection`, `Badge`).

The command auto-detects whether the target is a section or component:

1. Check if `sections/{Name}Section/` exists → **section review**
2. Else check if `components/{Name}/` exists → **component review**
3. If neither exists, stop and suggest `/create-section` or `/create-component`

**Example:**

```
/review-code GridSection
/review-code Badge
```

---

## Phase 0: Prerequisites & Setup

### 0a: Verify MCP availability

| MCP        | How to check                        | Required? |
| ---------- | ----------------------------------- | --------- |
| Playwright | `mcp__playwright__browser_navigate` | Yes       |

Use `ToolSearch` to check. Stop if missing.

### 0b: Detect target type and verify files

Same detection logic as `/review-design`:

1. Check if `sections/{Name}Section/index.tsx` exists → **section mode**
2. Else check if `components/{Name}/index.tsx` exists → **component mode**
3. If neither exists, stop.

### 0c: Verify Storybook is running

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:6006/iframe.html 2>/dev/null || echo "DOWN"
```

If down, start it in the background and wait until it's responding:

```bash
yarn storybook > /tmp/storybook.log 2>&1 &
until curl -s -o /dev/null http://localhost:6006/iframe.html; do sleep 1; done
```

The Next.js dev server (port 3000) is **not** required.

### 0d: Resolve the Storybook story ID

**Look the story ID up — do not build it from the folder name.** Story titles group by what a thing _is_ (`Foundations/`, `Content/`, `Surfaces/`, `Navigation/`, `Forms/`, `Sections/`), so `{Name}` no longer maps to an ID by formula: `FaqSection` lives at `Sections/FAQ` → `sections-faq--default`.

Fetch `http://localhost:6006/index.json` and resolve against it:

```
norm(s)  = s.toLowerCase().replace(/[^a-z0-9]/g, '')
want     = norm(mode === 'section' ? Name.replace(/Section$/, '') : Name)
wantExport = norm(the --story argument, or 'Default' when none was given)
match    = entries where type === 'story'
           AND title.startsWith('Sections/') === (mode === 'section')
           AND norm(title.split('/').pop()) === want
           AND norm(entry.name) === wantExport
```

Three details are load-bearing, each found by a failure:

- **Normalised comparison, not exact.** A leaf title is a _display_ name and the folder name is not — `FaqSection` → `Sections/FAQ`, `TwoColumnDefaultSection` → `Sections/Two Column Default`. Exact matching returns zero hits for every section.
- **Mode comes from this command's own Phase 0**, not from a trailing `Section` in the argument. `{Name}` is the bare name, so a section review of `Form` would otherwise compute "not a section" and select `Forms/Form` over `Sections/Form`. Both exist.
- **`type === 'story'`**, because autodocs adds a `docs` entry under the same title, and a docs ID rendered with `viewMode=story` is not the story you asked for.
- **Filter on the export name too.** Almost every story file has several exports — 28 of the 32 titles in this repo do — so matching on title alone returns a handful of entries for nearly every target, and the "more than one match" rule below would then refuse to review anything. Default to the `Default` export and let `--story` pick another.

If nothing matches, **stop and say so** — there is deliberately no fallback to the opposite group. Reviewing the wrong component silently is worse than failing loudly. If more than one matches, list them and stop.

---

## Phase 1: Read Target Files

Read all files for the target:

**For sections:**

- `sections/{Name}Section/index.tsx`
- `sections/{Name}Section/styles.module.scss`
- `sections/{Name}Section/queries.groq.ts`
- `tools/sanity/schema/sections/{camelCase}Section.ts`

**For components:**

- `components/{Name}/index.tsx`
- `components/{Name}/styles.module.scss`
- Any sub-component files in subdirectories

---

## Phase 2: Create Temporary Review Page

Same pattern as `/review-design` — create `app/(frontend)/review/page.tsx` with dummy data that exercises all the target's props and states. Include multiple variants if the target supports them (e.g., different themes, sizes, states).

---

## Phase 3: Agent Analysis (PARALLEL)

Launch both agents **in parallel** in a single message:

### 3a: `code-quality-reviewer` agent

This agent reviews as a **senior lead developer** focused on reusability, component structure, and future-proofing. It scans the entire `sections/` and `components/` directory for duplication opportunities — not just the target files.

Provide:

- Target name and type (section/component)
- List of files to review
- Project conventions from CLAUDE.md (arrow functions, classNames helper, CSS layers, import order)
- Instruction: "Spend the most time on the reusability scan. Search broadly across sections/ and components/ for patterns that match this target's code."

### 3b: `accessibility-reviewer` agent

Provide:

- Target name and type
- List of files to review
- Component props interface (for checking prop-level accessibility)

**Wait for both agents to complete before proceeding.**

---

## Phase 4: Apply Static Fixes

1. Combine findings from both agents into a prioritised list
2. **Do not defer design system compliance fixes.** If the code-quality reviewer identifies that component props should replace custom CSS, apply it now — not as a "watch" item. Use the existing component props (`variant`, `size`, `theme`, `weight`, `color`, etc.) as a base and override only the specific difference in SCSS. Start clean, build on it in later reviews.
3. Apply all code quality fixes (dead code, conventions, token usage, SCSS quality)
4. Apply all accessibility fixes (semantic HTML, ARIA, labels)
5. Check for `text-align` in SCSS — use the `alignment` prop on `Text`, `TextTitle`, and `TextBlock` components instead. `TextBlock` accepts a top-level `alignment` prop that cascades to all children.
6. Run `yarn fix && yarn ts:check`

---

## Phase 5: Browser Testing

Navigate Playwright to the Storybook iframe URL (`http://localhost:6006/iframe.html?id={story-id}&viewMode=story`) and test interactively:

### 5a: Visual check at key breakpoints

1. **Desktop (1440px):** Screenshot, check layout, spacing, no overflow
2. **Tablet (769px):** Screenshot, check responsive reflow
3. **Mobile (414px):** Screenshot, check mobile layout

### 5b: Hover states

For every interactive element (links, buttons, cards with hover effects):

1. Use `mcp__playwright__browser_hover` to hover over the element
2. Take a screenshot to verify hover state renders correctly
3. Check cursor changes (pointer for clickable elements)

### 5c: Click interactions

For every clickable element:

1. `mcp__playwright__browser_click` and verify expected behaviour (navigation, expansion, toggle)
2. Check no console errors after click via `mcp__playwright__browser_console_messages`

### 5d: Keyboard navigation

1. Use `mcp__playwright__browser_evaluate` to focus the first interactive element (`document.querySelector('a,button').focus()`)
2. Use `mcp__playwright__browser_press_key` to send Tab keys — verify logical order
3. Check focus indicators are visible on every focused element (screenshot each)
4. Send Enter/Space to test activation on buttons and links
5. Send Escape to close any modals/dropdowns if applicable

### 5e: Responsive behaviour

At each breakpoint (1440, 769, 414):

- Verify no horizontal scroll
- Verify no content clipping
- Verify text is readable (not too small on mobile)
- Verify touch targets are at least 44x44px on mobile

---

## Phase 6: Fix Loop

1. Apply fixes for any issues found in Phase 5
2. Run `yarn fix && yarn ts:check`
3. Re-test the specific interactions that were fixed
4. Repeat until all tests pass

---

## Phase 7: Cleanup & Report

### 7a: Remove temporary review page

```bash
rm -f app/(frontend)/review/page.tsx
```

### 7b: Run final checks

Run `yarn fix && yarn ts:check`

### 7c: Generate report

```
## Code Review: {Name}

### Type
{Section / Component}

### Files Reviewed
- {file paths}

### Reusability & DRY ({count} issues)

| Pattern | Files Using It | Action Taken | Priority |
|---|---|---|---|
| {e.g., "Split layout"} | {files} | {Extracted to component / Watch} | {Critical/Watch} |

1. **{description}** — {severity}
   - Fix: {what was changed}
   - Impact: {files simplified}

### Component Structure
- Props design: {Good/Needs work} — {note}
- Composition: {Good/Needs work} — {note}
- Extensibility: {Good/Needs work} — {note}

### Code Quality ({count} issues)

1. **{description}** — {severity}
   - Category: {dead-code/convention/performance/token-usage}
   - Fix: {what was changed}

### Accessibility ({count} issues)

1. **{description}** — {severity}
   - Category: {semantic-html/aria/keyboard/focus/contrast/screen-reader}
   - Fix: {what was changed}

### Browser Testing
- Hover states: {pass/fail} ({count} elements tested)
- Click interactions: {pass/fail} ({count} elements tested)
- Keyboard navigation: {pass/fail} (tab order logical, focus visible)
- Responsive: {pass/fail} (1440px, 769px, 414px)

### Summary
- Total issues fixed: {count}
- Reusability: {Clean / Has duplication / Significant duplication}
- Code quality: {assessment}
- Accessibility: {assessment}
- Browser behaviour: {assessment}
```
