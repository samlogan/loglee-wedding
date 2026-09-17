# Accessibility Audit

**IMPORTANT: Before doing anything else, use the EnterPlanMode tool to enter plan mode. Explore the target component/section, then present your audit plan for approval before producing the report.**

Static WCAG 2.1 AA accessibility audit on a component or section's source code. Reads the JSX and SCSS, evaluates against 7 criteria categories, and produces a structured report.

## Arguments

`$ARGUMENTS`

**Expected format:** `ComponentOrSectionName` (PascalCase), or `--all`

**Example usages:**

- `/a11y-audit Button`
- `/a11y-audit HeroSection`
- `/a11y-audit --all`

If no name is provided, use `AskUserQuestion` to ask which component or section to audit. List available targets.

---

## No interactive prompts (except target selection if not provided)

---

## Step 1: Resolve and Read Source Files

1. Check `components/{Name}/` first, then `sections/{Name}/` — error if not found in either location
   - If not found, list available components and sections for the user to choose from
2. Read all source files:
   - `index.tsx` (main component)
   - `styles.module.scss` (styles)
   - Any sub-component files in subdirectories (e.g., `CardImage/index.tsx`, `AccordionItem/index.tsx`)
3. Also read imported components from `@/components/*` to understand the full render tree — but only audit the target component, not its dependencies
4. If `--all` flag: iterate through all components in `components/` and all sections in `sections/`, auditing each one

---

## Step 2: Audit Against 7 WCAG 2.1 AA Categories

For each check item, assign one of:

- **Pass** — meets criterion
- **Fail** — violates criterion (include specific code fix with file path and line number)
- **Warning** — cannot determine from static analysis alone (describe manual test needed)
- **N/A** — criterion does not apply to this component

### Category 1: Keyboard Navigation

- All interactive elements (`<button>`, `<a>`, `<input>`, `<select>`) are natively focusable
- Custom interactive elements (divs/spans with `onClick`) also have `onKeyDown` handling for Enter/Space — check for the Accordion pattern: `if (event.key === 'Tab') return null`
- No keyboard traps — focus can move freely in/out of the component
- No positive `tabIndex` values (breaks natural focus order) — `tabIndex={0}` or `tabIndex={-1}` are acceptable
- Modal/dialog components trap focus correctly and restore focus on close
- Dropdown/menu components support arrow key navigation

### Category 2: Semantic HTML

- Heading hierarchy via the `Text` component's `as` prop (`h1` > `h2` > `h3`, no skipped levels)
- Lists use `<ul>`, `<ol>`, `<li>` (not styled divs)
- Landmarks: `<section>`, `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` used appropriately
- Buttons are `<button>` elements — flag `<div onClick>` or `<span onClick>` anti-patterns
- Links use the project's `Link` component or native `<a>` with valid `href`
- `<button>` elements have explicit `type` attribute (`type="button"`, `type="submit"`)

### Category 3: Images & Media

- `Image` component usage includes `altText` prop (project's Sanity image pattern) — not omitted for meaningful images
- Decorative images have `alt=""` with `role="presentation"`
- Icon-only buttons/links have `aria-label` — project pattern: `aria-label={ariaLabel}` with default `ariaLabel = ''`
- SVG icons have `aria-hidden="true"` when decorative, `<title>` when meaningful
- Video component has `title` attribute (project pattern) and accessible controls

### Category 4: Forms

- All inputs have associated `<label>` (via `htmlFor` or wrapping)
- Required fields indicated with `aria-required="true"` or `required` attribute (not just visual indicator)
- Error messages associated via `aria-describedby`
- Error announcements use `role="alert"` or `aria-live="polite"`
- Placeholder text is not the only label

### Category 5: Colour & Contrast

- Text uses CSS custom properties from `_variables.scss` — check if the chosen variables provide sufficient contrast (4.5:1 for normal text, 3:1 for large text)
- Information not conveyed by color alone (error states use icon + text, not just red color)
- Focus indicators visible: check for `outline: none` without a replacement `:focus-visible` style
- Links distinguishable from surrounding text (underline or non-color visual cue)
- Check both light and dark theme variables if component uses `[data-theme='light']` / `[data-theme='dark']`

### Category 6: ARIA

- ARIA attributes used correctly (valid roles, states, properties)
- `aria-label` or `aria-labelledby` on elements without visible text content
- `aria-expanded` on toggle buttons/accordions
- `aria-hidden="true"` on decorative elements (icons, separators)
- `aria-live` for dynamic content updates (toasts, loading states, notifications)
- Modal components have `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- No redundant ARIA (e.g., `role="button"` on a `<button>` element)

### Category 7: Motion & Animation

- CSS animations/transitions respect `@media (prefers-reduced-motion: reduce)` — check all `transition`, `animation`, and `@keyframes` in SCSS
- Check the `Animation` component and any motion library usage for reduced motion support
- Auto-playing animations/carousels have pause controls
- No content flashing more than 3 times per second
- Check `@include visible-styles()` and `@include animation()` mixins for reduced motion handling

---

## Step 3: Generate Structured Report

Output the report in this format:

```
## Accessibility Audit: {Name}

**Standard:** WCAG 2.1 AA
**Files Analyzed:** {list of files read}

### Overall: {X}/{total} passed, {Y} failed, {Z} warnings

### 1. Keyboard Navigation
| # | Check                          | Status  | Details                                              |
|---|--------------------------------|---------|------------------------------------------------------|
| 1 | Focusable interactive elements | Pass    | All use native <button>                              |
| 2 | Keyboard handlers              | Fail    | onClick on div at line 45 — wrap in <button>         |
| 3 | No keyboard traps              | Pass    | Focus flows naturally                                |
| 4 | No positive tabIndex           | Pass    | No positive tabIndex values found                    |

### 2. Semantic HTML
| # | Check              | Status  | Details                                              |
|---|---------------------|---------|------------------------------------------------------|
| 1 | Heading hierarchy   | Pass    | Uses Text component with as="h2"                     |
| 2 | Semantic lists      | N/A     | No list content                                      |

(repeat for all 7 categories)

### Required Fixes
1. **[Keyboard] Keyboard handlers** (`components/MyComponent/index.tsx:45`)
   - Current: `<div onClick={handler}>Click me</div>`
   - Fix: `<button type="button" onClick={handler}>Click me</button>`

2. **[ARIA] Missing aria-label** (`components/MyComponent/index.tsx:52`)
   - Current: `<button onClick={close}><Icon title="close" /></button>`
   - Fix: `<button onClick={close} aria-label="Close"><Icon title="close" /></button>`

### Warnings (Manual Testing Required)
1. **[Contrast] Color contrast ratio** — Verify contrast ratio of `var(--fg-muted)` on `var(--bg-default)` with browser DevTools
2. **[Motion] Reduced motion** — Test with `prefers-reduced-motion: reduce` enabled in OS settings

### Summary
- {X} issues require code changes (listed above with fixes)
- {Z} items need manual verification
- {passing_count} checks passed
```

---

## Step 4: Offer to Auto-Fix

If any **Fail** items were found, use `AskUserQuestion`:

**"Found {N} accessibility issues. Would you like to fix them?"**

Options:

- "Yes, fix all" — Apply all suggested fixes, then run `/check` to verify. Report what was changed.
- "Let me review first" — Do nothing, let the user review the report.
- "No" — Do nothing.

If "Yes, fix all":

1. Apply each fix listed in the "Required Fixes" section
2. Run `/check` to verify no errors were introduced
3. Report all changes made with file paths and line numbers

---

## Summary

After completion, report:

- Total checks run and pass/fail/warning counts
- Number of fixes applied (if auto-fix was chosen)
- Reminder about manual testing items (if any warnings)
