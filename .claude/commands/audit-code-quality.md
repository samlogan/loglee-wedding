# Audit Code Quality

Static code quality audit across all sections and components. Scans for design system violations, hardcoded values, convention drift, dead code, and cross-section inconsistencies. Runs without browser — pure file analysis.

Can target a single section/component or scan the entire codebase.

## Arguments

`$ARGUMENTS`

**Expected format:** `ComponentOrSectionName` (PascalCase), or `--all` (default if no argument)

**Examples:**

```
/audit-code-quality GridSection
/audit-code-quality Card
/audit-code-quality --all
```

---

## Phase 1: Resolve Targets

If a name is provided:

1. Check `sections/{Name}/` first, then `components/{Name}/`
2. If not found, list available targets and stop

If `--all` or no argument:

1. Glob `sections/*/index.tsx` and `components/*/index.tsx`
2. Build a list of all targets

For each target, read:

- `index.tsx` (main component)
- `styles.module.scss` (styles)
- Any sub-component files in subdirectories

---

## Phase 2: Launch Parallel Agents

Launch **3 agents in parallel** in a single message. Each agent receives the list of target files and the design token reference below.

### Design Token Reference (provide to all agents)

```
SPACING TOKENS:
  4px = --spacing-xxs, 8px = --spacing-xs, 12px = --spacing-sm,
  16px = --spacing-md, 24px = --spacing-lg, 32px = --spacing-xl,
  48px = --spacing-2xl, 64px = --spacing-3xl

RADIUS TOKENS:
  4px = --radius-sm, 8px = --radius-md, 16px = --radius-lg, 200px = --radius-full

CONTAINER TOKENS:
  640px = --container-xs, 768px = --container-sm, 1024px = --container-md,
  1280px = --container-lg, 1440px = --container-xl

FONT WEIGHT TOKENS:
  300 = --font-weight-light, 400 = --font-weight-regular, 500 = --font-weight-medium,
  600 = --font-weight-semibold, 700 = --font-weight-bold

THEME BACKGROUND VARS (use instead of primitives/hardcoded):
  --bg-default, --bg-accent, --bg-raised

THEME FOREGROUND VARS:
  --fg-default, --fg-muted, --fg-subtle, --fg-link, --fg-icon, --fg-accent

THEME STROKE VARS:
  --stroke-cards, --stroke-divider

BUTTON VARS:
  --button-primary-bg, --button-primary-fg, --button-secondary-bg, --button-secondary-fg
  (plus -hover, -active, -disabled variants)

PRIMITIVE COLOR SCALES (avoid using directly — use semantic theme vars above):
  --primary-{25-900}, --secondary-{25-900}, --tertiary-{25-900},
  --gray-{25-900}, --shades-black, --shades-white
```

### 2a: `code-quality-reviewer` agent

Prompt the agent to check:

**Convention violations:**

- Missing `className?: string` prop on component/section interfaces
- Missing `classNames` helper import when multiple classes are composed
- `'use client'` on components that don't use hooks or event handlers
- SCSS not wrapped in `@layer defaults`
- Inline styles or `style` props instead of CSS modules
- `function` declaration components instead of arrow functions
- `FC<>` used on reusable components (reserved for section components only)
- Missing `default export`
- Props interface not exported
- `@import` or `@use` for `resources.scss` (auto-imported globally)
- `map-get()` instead of `map.get()` module syntax
- Relative paths when path aliases exist (`../../tools/helpers` vs `@/helpers`)

**Dead code:**

- SCSS classes defined but not referenced in the component TSX
- Imported components/helpers not used in the JSX

**React patterns:**

- `useEffect` with `setState` inside (React Compiler violation)
- Props destructured but not used

### 2b: Design system scanner agent (use `code-quality-reviewer` agent type)

Prompt the agent to check:

**Hardcoded background colors (theme safety):**

- `background` or `background-color` using hardcoded values (`white`, `black`, `#hex`, `rgb()`, `rgba()`) instead of theme variables (`--bg-default`, `--bg-accent`, `--bg-raised`)
- `background` using primitive color vars (`--primary-500`, `--gray-25`, etc.) instead of semantic theme vars (`--bg-default`, `--bg-accent`, `--bg-raised`, `--fg-accent`)
- Exception: `transparent` and `unset` are acceptable
- Exception: `--shades-black` / `--shades-white` are acceptable ONLY for elements that must not change with theme (e.g. video letterboxing)

**Hardcoded foreground colors:**

- `color` using hardcoded values instead of `--fg-default`, `--fg-muted`, `--fg-subtle`, `--fg-link`, `--fg-icon`, `--fg-accent`
- `color` using primitive color vars directly

**Hardcoded spacing:**

- `gap`, `padding`, `margin` values that match spacing tokens (4/8/12/16/24/32/48/64px)
- Note: DO NOT flag these as errors — flag as **suggestions** since not every value needs a token

**Hardcoded typography:**

- Raw `font-size`, `font-weight`, `line-height`, `letter-spacing` values when tokens exist
- `text-align` in SCSS that should use the `alignment` prop on `Text`/`TextTitle`/`TextBlock`

**Hardcoded dimensions:**

- `max-width` or `width` matching container tokens (640/768/1024/1280/1440px)
- `border-radius` matching radius tokens (4/8/16/200px)

**Other:**

- `!important` usage — flag each with context
- Non-existent CSS custom properties (e.g. `--gray-3`, `--radius-1` — not in the design system)

### 2c: Cross-section consistency agent (use `code-quality-reviewer` agent type)

Only runs when `--all` is used. Prompt the agent to check:

- Same visual pattern rendered differently across sections (e.g. taglines, section headers, CTA groups)
- Inconsistent `Text` component prop usage for the same visual element across sections
- Sections using `theme` prop but not passing it through to `<Section>` wrapper
- Sections missing `name` prop on `<Section>` wrapper

**Wait for all agents to complete before proceeding.**

---

## Phase 3: Generate Report

Merge findings from all agents. Group by severity:

```
## Code Quality Audit{targetName ? `: ${targetName}` : ''}

### Scan Summary
- **Targets scanned:** {count} sections, {count} components
- **Total issues:** {count} ({critical} critical, {warning} warnings, {suggestion} suggestions)

### Critical — Hardcoded Colors (theme-breaking)
| # | File | Line | Current Value | Recommended Token | Property |
|---|------|------|---------------|-------------------|----------|
| 1 | components/Card/styles.module.scss | 3 | var(--gray-25) | var(--bg-raised) | background-color |

### Critical — Non-existent Tokens
| # | File | Line | Token Used | Notes |
|---|------|------|-----------|-------|
| 1 | components/Carousel/CarouselDots/styles.module.scss | 13 | var(--gray-3) | Not in design system |

### Critical — Convention Violations
| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| 1 | sections/FooSection/index.tsx | 1 | Missing @layer defaults wrapper | Wrap all styles in @layer defaults { } |

### Warning — !important Usage
| # | File | Line | Property | Context |
|---|------|------|----------|---------|

### Warning — Dead Code
| # | File | Line | Type | Details |
|---|------|------|------|---------|

### Suggestion — Spacing Tokens
| # | File | Line | Current Value | Nearest Token |
|---|------|------|---------------|---------------|

### Suggestion — Typography Tokens
| # | File | Line | Current Value | Nearest Token |
|---|------|------|---------------|---------------|

### Cross-Section Inconsistencies (--all only)
| # | Pattern | Files | Issue |
|---|---------|-------|-------|

### Summary
- {X} critical issues (should fix before shipping)
- {Y} warnings (fix when touching these files)
- {Z} suggestions (nice to have)
```

---

## Phase 4: Offer to Auto-Fix

If any **Critical** items were found, ask:

**"Found {N} critical code quality issues. Would you like to fix them?"**

Options:

- "Yes, fix all critical" — Apply fixes, then run `yarn fix && yarn ts:check`
- "Fix hardcoded colors only" — Only fix the color token issues
- "Let me review first" — Do nothing
- "No" — Do nothing

If fixing:

1. Apply each fix
2. Run `yarn fix && yarn ts:check`
3. Report changes made with file paths
