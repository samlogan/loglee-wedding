# Design System Import

**IMPORTANT: Before doing anything else, use the EnterPlanMode tool to enter plan mode. Explore the input and existing token files, then present your sync plan for approval before making any changes.**

Import design tokens from a Figma file or a JSON variable export into the codebase's SCSS variable files. Consolidates similar values and aligns with existing naming conventions. This is the reverse of `/design-system-export`.

**Required outputs:**

1. Diff report (Step 5)
2. File changes (Step 6)
3. Passing `/check` (Step 7)
4. Outstanding tokens checklist + copy-paste message for designer (Step 7)
5. Linear project status update (Step 8, if available)

## Arguments

`$ARGUMENTS`

**Expected format:** One or more of the following (space-separated or one per line), optionally with `--dry-run` to preview without writing:

- **Figma URLs** — targeting specific pages or frames in the Design System file
- **JSON** — a pasted JSON object containing design tokens (see JSON Format below)
- **JSON file path** — a path to a `.json` file containing design tokens

You can combine sources in a single call (e.g., Figma URL for colors + JSON for spacing).

**Example usages:**

- Figma URL:
  `/design-system-import https://www.figma.com/design/pYqEfL85ImHicqbYCdoNI1/Design-System?node-id=1-2`

- Multiple Figma URLs:
  `/design-system-import https://www.figma.com/design/pYqEfL85ImHicqbYCdoNI1/Design-System?node-id=1-2 https://www.figma.com/design/pYqEfL85ImHicqbYCdoNI1/Design-System?node-id=3-4`

- JSON (pasted inline or as a file path):
  `/design-system-import tokens.json`
  `/design-system-import {"primitives": {...}, "semanticColors": {...}}`

- Mixed sources:
  `/design-system-import https://www.figma.com/design/.../Design-System?node-id=1-2 tokens.json`

- Dry run:
  `/design-system-import --dry-run tokens.json`

If no input is provided, use the `AskUserQuestion` tool to prompt the user:

> How would you like to provide the design tokens?
>
> - **Figma URL(s)** — one or more URLs targeting pages/frames containing tokens
> - **JSON export** — paste the JSON or provide a file path
> - **Both** — combine Figma URLs and JSON

---

## JSON Format

The JSON export supports these top-level keys (all optional — include whichever categories you have):

```json
{
  "primitives": {
    "value": {
      "coloursGray500": "#667085",
      "fontFamilyPrimary": "Inter",
      "sizing16": 16,
      "borderRadiusMd": 8
    }
  },
  "semanticColors": {
    "{themeName}": {
      "primary500": "#7a5af8",
      "error500": "#f04438",
      "neutral900": "#111927",
      "foundationsWhite": "#ffffff"
    }
  },
  "designTokens": {
    "light": {
      "surfaceDefault": "#ffffff",
      "textDefault": "#111927",
      "buttonColorPrimaryBackgroundDefault": "#7a5af8"
    },
    "dark": {
      "surfaceDefault": "#111927",
      "textDefault": "#ffffff",
      "buttonColorPrimaryBackgroundDefault": "#ffffff"
    }
  },
  "responsive": {
    "desktop": {
      "sectionsXl": 96,
      "componentsMd": 16,
      "typographyFontSize4xl": 54,
      "containerContainerXl": 1296
    },
    "tablet": { "...": "..." },
    "mobile": { "...": "..." }
  },
  "buttonSize": {
    "button": {
      "buttonSizeMediumHeight": 44,
      "buttonSizeMediumFontSize": 16,
      "buttonSizeMediumPaddingHorizontal": 20,
      "buttonSizeMediumBorderRadius": 8
    },
    "textLink": { "...": "..." }
  }
}
```

### Parsing rules for JSON keys

JSON keys use camelCase naming. Parse them into structured tokens using these conventions:

**Primitives (`primitives.value`):**

- `colours{ColorName}{Shade}` → color token (e.g., `coloursGray500` → gray-500: #667085)
- `fontFamily{Name}` → font family (e.g., `fontFamilyPrimary` → primary font)
- `fontWeight{Name}{Value}` → font weight (e.g., `fontWeightWeight600` → 600)
- `sizing{N}` → spacing/sizing value (e.g., `sizing16` → 16px)
- `borderRadius{Size}` → border radius (e.g., `borderRadiusMd` → 8px)

**Semantic colors (`semanticColors.{theme}`):**

- `primary{Shade}` → primary color scale
- `secondary{Shade}` → secondary color scale
- `error{Shade}`, `warning{Shade}`, `sucess{Shade}` (note: Figma may misspell "success"), `information{Shade}` → system colors
- `neutral{Shade}` → neutral/gray scale
- `foundationsWhite`, `foundationsBlack`, `foundationsTransparent` → base colors

**Design tokens (`designTokens.light` / `designTokens.dark`):**

- `surface{Variant}` → `--bg-{variant}` (e.g., `surfaceDefault` → `--bg-default`)
- `text{Variant}` → `--fg-{variant}` (e.g., `textDefault` → `--fg-default`)
- `textIcon` → `--fg-icon`
- `input{State}{Property}` → form field tokens
- `buttonColor{Variant}{Property}{State}` → button tokens (e.g., `buttonColorPrimaryBackgroundDefault` → `--button-primary-bg`)

**Responsive (`responsive.desktop` / `.tablet` / `.mobile`):**

- `sections{Size}` → section spacing (e.g., `sectionsXl` → `--section-spacing-xl-desktop: 96px`)
- `components{Size}` → component spacing
- `container{Name}` → container widths
- `typographyFontSize{Size}` → responsive font sizes
- `typographyFontWeight{Name}` → font weights
- `typographyFontFamily{Type}` → font families
- `breakpointMedia` → breakpoint value for that tier

**Button sizes (`buttonSize.button` / `.textLink`):**

- `buttonSize{Size}{Property}` → button size tokens (e.g., `buttonSizeMediumHeight` → 44px)

---

## Step 1: Parse Input Sources

### 1a. Identify input types

Scan `$ARGUMENTS` for:

- **Figma URLs** — anything matching `figma.com/design/...`
- **JSON file paths** — anything ending in `.json`
- **Inline JSON** — anything starting with `{`
- **Flags** — `--dry-run`

### 1b. Process Figma URLs (if any)

For each Figma URL:

1. Extract `fileKey` and `nodeId` from the URL
   - URL format: `figma.com/design/:fileKey/:fileName?node-id=:nodeId` — convert `-` to `:` in nodeId
   - Branch URLs: `figma.com/design/:fileKey/branch/:branchKey/:fileName` — use branchKey as fileKey
2. Call `get_variable_defs` with the extracted fileKey and nodeId
3. Call `get_design_context` with `excludeScreenshot: true` to extract typography and layout info
4. If only one URL, also call `get_metadata` to discover child frames and pull variables from sub-frames

### 1c. Process JSON (if any)

For JSON input (inline or file path):

1. If a file path, read the file
2. Parse the JSON structure using the parsing rules above
3. Normalize all tokens into the same internal format used for Figma tokens

### 1d. Merge all sources

Merge tokens from all sources (Figma + JSON), deduplicating by category and name. If the same token appears in both sources, **JSON takes precedence** (it's the more intentional export).

---

## Step 2: Read Existing Token Files

Read all current design token sources:

- `tools/sass/global/_variables.scss` — CSS custom properties (primitives, theme tokens, button tokens, spacing, typography sizes)
- `tools/sass/base/__typography.scss` — Typography mixins (heading-font, body-font)
- `tools/sass/base/__media.scss` — Breakpoints
- `components/Text/styles.module.scss` — Typography size classes (mobile-first with tablet breakpoint)
- `config/fonts.ts` — Font families

Build a complete map of what exists today.

---

## Step 3: Categorize Tokens

Organize all parsed tokens into these categories:

### Colors

- **Primitive colors** — Base palette (e.g., gray-100, primary-500, red-400)
- **Semantic colors** — Theme-aware tokens (e.g., bg-default, bg-accent, fg-icon, stroke-cards)
- **Component colors** — Button states, form fields, etc.

Map to: `tools/sass/global/_variables.scss` (`:root` for primitives, `[data-theme]` for semantic tokens)

### Spacing

- Component gaps, padding values
- Map to: `tools/sass/global/_variables.scss` (`--spacing-*` scale in `:root`)

### Section Spacing

- Section-level top/bottom padding values (distinct from component spacing)
- Map to: CSS custom properties in `tools/sass/global/_variables.scss` (`--section-spacing-*`)
- Used by: `components/Section/style.module.scss` for `spacing_top_*` / `spacing_bottom_*` classes
- Each size has two variants: `--section-spacing-{size}-desktop` and `--section-spacing-{size}-mobile`
- Current sizes: `sm`, `md`, `lg`, `xl`
- **Responsive mapping**: `responsive.desktop.sections{Size}` → `--section-spacing-{size}-desktop`, `responsive.mobile.sections{Size}` → `--section-spacing-{size}-mobile`

### Border Radius

- Map to: CSS custom properties in `tools/sass/global/_variables.scss`
- Use naming: `--radius-sm`, `--radius-md`, `--radius-lg`
- `--radius-full: 200px` is a fixed value (pill shape) — always set this, don't ask the designer

### Typography

- Font sizes, line heights, letter spacing, font weights
- Heading/body/display variants with their responsive sizes
- Map to: `components/Text/styles.module.scss` and `tools/sass/base/__typography.scss`

### Button Sizing

- Height, padding, font size, border radius, gap, icon size per size variant (sm, md, lg)
- Map to: button component SCSS variables or CSS custom properties

### Container Widths

- `responsive.desktop.container{Name}` → container max-width values
- Map to existing container width variables

### Other

- Border widths, z-indices, easing — add only if present

---

## Step 4: Consolidate Similar Values

This is critical — design files often have near-duplicate values. Apply these rules:

### Spacing & Sizing

- If two values are within 2px of each other (e.g., 30 and 32), **keep only one** — prefer the value that fits a 4px or 8px grid
- Standard spacing scale should follow a geometric progression: 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 104, 128
- Don't add values that are 1-2px off from a scale step — snap them to the nearest step
- Keep the number of tokens manageable (roughly 10-16 spacing tokens max)

### Colors

- If two colors are nearly identical (differ by < 5 in any RGB channel), keep one
- Prefer the 25-900 scale naming convention already in use
- Don't duplicate colors that already exist in `__variables.scss`

### Typography

- If two font sizes differ by 1-2px, keep the rounder number
- Heading sizes should form a clear scale (e.g., 24, 32, 40, 48, 60, 72)
- Body sizes should form a clear scale (e.g., 12, 14, 16, 18, 20, 22)
- The Figma typography naming (h1, h2, body, display) is fine to adopt if it adds clarity — but map it to the existing `variant` + `size` system in the Text component

### Border Radius

- Consolidate to a small set: `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (16px)
- `--radius-full: 200px` is always fixed — don't consolidate or ask about it

---

## Step 5: Generate Diff Report

Before making changes, output a clear report:

```
## Design System Sync Report

### Source
Input: {Figma file(s) and/or JSON}
URLs processed: {N} (if applicable)

### Colors ({N} found, {M} new, {K} updated)
| Source Name | Value | Action | Maps To |
|-------------|-------|--------|---------|
| gray/100 | #f2f4f7 | Unchanged | $grey-100 / --gray-100 |
| primary/500 | #ff4a37 | Updated | $primary-500 / --primary-500 |
| brand/accent | #2563eb | New | $accent-500 |

### Spacing ({N} found, {M} consolidated to {K})
| Source Value | Consolidated To | Variable |
|-------------|-----------------|----------|
| 30px | 32px | $spacing-xl |
| 48px | 48px | $spacing-2xl (new) |

### Typography ({N} styles found)
| Source Style | Size | Weight | Line Height | Maps To |
|-------------|------|--------|-------------|---------|
| H1/Bold | 44px->48px | 700 | 1.2 | heading 2xl |
| Body/Regular | 16px | 400 | 1.5 | body md |

### Border Radius ({N} found, consolidated to {M})
| Source Value | Consolidated To | Variable |
|-------------|-----------------|----------|
| 6px | 8px | --radius-md |

### Themes ({N} in input, {M} removed)
| Theme | Status | Reason |
|-------|--------|--------|
| light | Kept | Always kept |
| dark | Kept | Always kept |
| primary | Kept | Defined in designTokens |
| secondary | Removed | Not defined in input |
| tertiary | Removed | Not defined in input |

Files affected by theme removal: _variables.scss, ProjectTheme.d.ts, sectionFields.ts

### Summary
- {X} tokens unchanged
- {Y} tokens updated
- {Z} tokens added
- {W} values consolidated (near-duplicates merged)
- {V} themes removed (unused)
```

If `--dry-run`, stop here.

---

## Step 6: Apply Changes

Update the relevant files in order:

### 6a. Colors — `tools/sass/global/_variables.scss`

- Update `:root` CSS custom properties
- Update `[data-theme='light']` and `[data-theme='dark']` semantic tokens
- Update button/component tokens if present
- **Design token mapping** (from `designTokens.light` / `designTokens.dark`):
  - `surfaceDefault` → `--bg-default`
  - `surfaceAccent` / `surfaceMuted` → `--bg-accent` (single accent surface token, no muted/subtle split)
  - `surfaceRaised` / `surfaceCard` / `surfaceElevated` → `--bg-raised` (cards, elevated surfaces)
  - `textDefault` → `--fg-default`
  - `textInteractive` → `--fg-link` (used as the text link colour)
  - `textIcon` → `--fg-icon` (used for icons, hamburger bars, chevrons)
  - `textAccent` → `--fg-accent` (used for accent text highlights)
  - `input{State}{Property}` → form field tokens
  - `buttonColor{Variant}{Property}{State}` → button CSS custom properties

**Button token convention:**
Only two button themes are defined as CSS variables: `--button-primary-*` and `--button-secondary-*`. Each has 9 tokens: `bg`, `bg-hover`, `bg-active`, `bg-disabled`, `fg`, `fg-hover`, `fg-active`, `fg-disabled`, `focus-ring`. The outline variant is derived in SCSS from the theme's fill colors (transparent bg, border = theme bg, hover fills with theme bg). Do NOT create separate outlined/ghost/error variable sets — keep button variables minimal and handle variants in SCSS.

Example mapping:

- `buttonColorPrimaryBackgroundDefault` → `--button-primary-bg`
- `buttonColorPrimaryBackgroundHover` → `--button-primary-bg-hover`
- `buttonColorPrimaryBackgroundActive`/`Pressed` → `--button-primary-bg-active`
- `buttonColorPrimaryBackgroundDisabled` → `--button-primary-bg-disabled`
- `buttonColorPrimaryTextDefault` → `--button-primary-fg`
- `buttonColorPrimaryTextHover` → `--button-primary-fg-hover`
- `buttonColorPrimaryTextActive`/`Pressed` → `--button-primary-fg-active`
- `buttonColorPrimaryTextDisabled` → `--button-primary-fg-disabled`
- Focus ring → `--button-primary-focus-ring`
- Same pattern for secondary (`--button-secondary-*`)

**IMPORTANT — use `var()` references, not hardcoded hex values:**
When writing values in `[data-theme]` blocks, always reference `:root` custom properties via `var()` rather than duplicating hex values. For example:

- `--button-primary-bg: var(--primary-500);` ✅ (references `:root` primitive)
- `--button-primary-bg: #7a5af8;` ❌ (duplicates the hex value)
- `--bg-default: var(--shades-white);` ✅
- `--bg-default: #ffffff;` ❌

This ensures colors are managed from a single source (the `:root` primitives) and avoids duplication. Match each hex value from the design tokens to its corresponding `:root` variable and use the `var()` reference. If a hex value doesn't match any `:root` variable exactly, add it as a new primitive first, then reference it.

### 6b. Spacing — `tools/sass/global/_variables.scss`

- Update or extend the `--spacing-*` scale in `:root`
- If adding new spacing tokens, use consistent naming: `--spacing-2xl`, `--spacing-3xl`, etc.

### 6c. Typography — `tools/sass/global/_variables.scss` + `components/Text/styles.module.scss` + `config/fonts.ts`

- Update font size tokens in `:root` — both desktop (`--heading-2xl`, `--body-md`, etc.) and mobile (`--heading-2xl-mobile`, `--body-md-mobile`, etc.)
- Update font weight tokens in `:root` (`--font-weight-*`, `--body-default-font-weight`, `--body-bold-font-weight`, `--heading-default-font-weight`)
- Text component uses mobile-first sizing: mobile size by default, desktop at `@include media-up(tablet)`
- Font weight is wired via tokens: `.variant_heading` uses `--heading-default-font-weight`, `.variant_body` uses `--body-default-font-weight`
- If Figma has "display" as a distinct type category, consider adding a `variant_display` if it differs meaningfully from heading (larger sizes, different line height). Otherwise map display->heading.

#### Font family handling

When font families are detected in the input (from Figma typography styles or JSON `fontFamily*` keys):

1. **Extract font names** — get the heading and body font family names from the design tokens
2. **Confirm with user** — if the font names cannot be confidently determined from the input (e.g., Figma returns multiple font families, or the JSON doesn't include `fontFamily*` keys), use `AskUserQuestion` to confirm:
   > **Typefaces?** I found these font families in the design system:
   >
   > - **Heading:** {detected name or "not detected"}
   > - **Body:** {detected name or "not detected"}
   >
   > Are these correct? If not, tell me the heading and body font names.
   > If both fonts are clearly and unambiguously identified from the input, skip this confirmation.
3. **Compare with current** — read `config/fonts.ts` and check if the fonts have changed
4. **If fonts have changed**, determine whether each font is available as a Google Font:
   - Check by attempting to construct the `next/font/google` import name: convert the font name to PascalCase with underscores (e.g., "DM Sans" → `DM_Sans`, "Instrument Sans" → `Instrument_Sans`)
   - Use `WebSearch` to verify: search `site:fonts.google.com "{font name}"` to confirm availability
5. **If the font IS a Google Font** — update `config/fonts.ts`:
   - Update the import: `import { {PascalCase_Name} as HeadingFont } from 'next/font/google'`
   - Update weight array to include **only the weights actually used in the design system** (extracted from `fontWeight*` keys in JSON, or from Figma typography styles). Do NOT include weights 100, 200, 800, or 900 unless they are explicitly defined in the design tokens. Common weights are 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold).
   - Keep the existing `variable` names (`--heading-font`, `--body-font`)
6. **If the font is NOT a Google Font** — do NOT update `config/fonts.ts`. Instead:
   - Add to the outstanding tokens report (see Step 7)
   - Use `AskUserQuestion` to ask the user:
     > "{font name}" is not available as a Google Font. How would you like to proceed?
     >
     > 1. **Provide .woff/.woff2 files** — I'll set it up as a local font in `config/fonts.ts` and `assets/fonts/`
     > 2. **Choose a Google Font alternative** — tell me the substitute font name
     > 3. **Skip for now** — keep the current font and handle this later
   - If option 1: wait for the user to provide the files, then configure as a `localFont` in `config/fonts.ts` (using the commented-out tertiary font pattern as a template)
   - If option 2: treat the substitute name as the font and loop back to step 3
   - If option 3: note in the report that the font needs to be resolved

### 6d. Border Radius — `tools/sass/global/_variables.scss`

Add `--radius-*` tokens to `:root`:

```scss
// Border Radius
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 16px;
--radius-full: 200px;
```

If input provided radius values, use those for `--radius-sm`, `--radius-md`, `--radius-lg`. The `--radius-full: 200px` is always fixed.

Then replace all hardcoded `border-radius` values in component styles with the corresponding `var(--radius-*)`:

| Hardcoded value | Replace with         | Files using it                                                                                                              |
| --------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `4px`           | `var(--radius-sm)`   | CarouselThumbnails                                                                                                          |
| `8px`           | `var(--radius-md)`   | Button (variant_rounded), Card                                                                                              |
| `16px`          | `var(--radius-lg)`   | Modal (container)                                                                                                           |
| `200px`         | `var(--radius-full)` | Button (variant_pill), Avatar, CarouselNavigation, FieldSelect, FieldEmail, FieldText, FieldToggle, FieldRange, FormStepper |

**Do NOT replace:**

- `0` / `0px` — explicit overrides (Button variant_square, Modal size_full)
- `50%` / `100%` — circular elements (radio buttons, toggle circles, loaders)

### 6e. Section Spacing — `tools/sass/global/_variables.scss`

- Update `--section-spacing-{size}-desktop` and `--section-spacing-{size}-mobile` tokens in `:root`
- Current sizes: `sm`, `md`, `lg`, `xl` — each has a `-desktop` and `-mobile` variant
- These are consumed by `components/Section/style.module.scss` — do NOT edit that file, only update the token values
- **Mapping from responsive JSON**: use `responsive.desktop.sections{Size}` for desktop values and `responsive.mobile.sections{Size}` for mobile values
- If the JSON provides additional sizes (e.g., `xs`, `2xl`, `3xs`), add them following the same naming pattern

### 6f. Other tokens

- Add any border-width or z-index tokens that exist and make sense

### 6g. Remove unused themes

The boilerplate includes 5 themes: `light`, `dark`, `primary`, `secondary`, `tertiary`. Most projects only use a subset. After importing the design tokens, determine which themes are actually defined in the input:

1. **Identify used themes** — check which themes appear in the `designTokens` or `semanticColors` keys from the input. `light` and `dark` are always kept. Any other theme (`primary`, `secondary`, `tertiary`) is only kept if the input explicitly provides token values for it.
2. **Remove unused theme blocks** from all locations:
   - `tools/sass/global/_variables.scss` — delete the entire `[data-theme='{unused}']` block
   - `tools/types/ProjectTheme.d.ts` — remove from the union type
   - `tools/sanity/schema/objects/sectionFields.ts` — remove from the `themeOptions` list array
   - `tools/sanity/schema/sections/twoColDefaultSection.ts` — remove from inline theme field list (if it has one)
   - `.storybook/preview.tsx` — remove the key from the `withThemeByDataAttribute` `themes` map. If the removed theme was the `defaultTheme`, set `defaultTheme` to `'light'`. This keeps the Storybook theme toolbar in sync — a removed theme must not remain selectable, since its `[data-theme]` CSS no longer exists.
3. **Report removals** in the diff report (Step 5) so the user can review before applying

If the input **adds** a theme beyond the default five (rare), also add it to the `withThemeByDataAttribute` `themes` map in `.storybook/preview.tsx` so it's switchable in the toolbar. Note: theme token _value_ changes (colours, spacing) need no Storybook change — they flow through the CSS custom properties Storybook already renders. Only theme add/remove touches `preview.tsx`.

---

## Step 7: Verify & Report

1. Run `/check` to lint, format, and type-check
2. Report all files changed with a brief summary
3. Generate the Outstanding Tokens Report (see below)
4. Present the copy-paste message for the designer

### Outstanding Tokens Report

After syncing, compare what was received against what the codebase needs. The following token categories are actively used — check which ones are still missing after the sync and report only those.

### Token categories to check

| Category                  | Codebase usage                                                                                                         | Status if missing              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Colors**                | `--primary-*`, `--gray-*`, etc. in `:root`                                                                             | Ask for color palette          |
| **Typography**            | Text component sizes, `--font-weight-*`, `--heading-*-mobile`, `--body-*-mobile`                                       | Ask for type scale             |
| **Border radius**         | `--radius-sm`, `--radius-md`, `--radius-lg` (placeholders set in 6f)                                                   | Ask for actual values          |
| **Button tokens**         | `--button-primary-*`, `--button-secondary-*` (4 tokens each: bg, bg-hover, fg, fg-hover)                               | Ask for button colors          |
| **Semantic theme tokens** | `--bg-default`, `--bg-accent`, `--fg-default`, `--fg-link`, `--fg-icon`, `--fg-accent`, `--stroke-*` in `[data-theme]` | Ask for theme mappings         |
| **Spacing**               | `--spacing-*` scale in `:root`                                                                                         | Ask for spacing scale          |
| **Section spacing**       | `--section-spacing-{size}-desktop`, `--section-spacing-{size}-mobile`                                                  | Ask for section padding values |
| **Font families**         | `config/fonts.ts` — heading and body fonts loaded via `next/font/google` or `next/font/local`                          | Check Google Fonts, ask user   |

### Output format

Only list categories that are **genuinely missing** after the sync. Output a checklist and a copy-paste message for the designer.

Dynamically build the message based on what's actually missing. Use this template, removing sections that were successfully synced:

````
## Outstanding Tokens

The following token categories are used in the codebase but were not found in the provided input.
Placeholder values have been used where possible — these should be updated with actual design values.

### Missing

Only include items that are genuinely missing. Example entries:

- [ ] **Colors** — No color palette found. Need Figma page/frame URL or JSON export with brand colors.
- [ ] **Typography** — No type styles found. Need type scale data.
- [ ] **Border radius** — Placeholders set (--radius-sm: 4px, --radius-md: 8px, --radius-lg: 16px). Need actual values.
- [ ] **Button colors** — Need bg, fg, and hover colors for primary and secondary button themes.
- [ ] **Semantic theme mappings** — Need which colors map to each semantic token.
- [ ] **Spacing** — No spacing scale found. Using codebase defaults.
- [ ] **Section spacing** — Placeholders set. Need actual values.
- [ ] **Font files** — "{font name}" is not a Google Font. Need .woff/.woff2 file(s).

### Copy-paste for designer

Build the message dynamically — **only include sections for tokens that are genuinely missing**. Remove any section that was successfully synced.

#### Opening line

Choose based on what was actually synced:
- Colors + typography: "Hey! I've synced the color palette and typography tokens from the design system into the codebase."
- Only colors: "Hey! I've synced the color palette from the design system into the codebase."
- Nothing synced (all placeholder): "Hey! I've set up the token structure in the codebase and I'm ready to pull in values from the design system."
- Colors + typography + spacing: "Hey! I've synced colors, typography, and spacing from the design system into the codebase."
- All synced but some gaps: "Hey! I've synced most of the tokens from the design system into the codebase."

Follow with "Could you help fill in the remaining tokens?" then include **only** the relevant sections below.

#### Sections to include (only if missing)

**Colors** (include if no color palette was found):
> **Colors** — Could you share the color palette? We need the full set of brand colors (primary, secondary, greys, etc.) in a 25-900 shade scale. Either a Figma URL or a JSON export works.

**Typography** (include if no type styles were found):
> **Typography** — Could you share the type scale? We need heading sizes (H1-H6), body sizes, font families, weights, line heights, and letter spacing.

**Border radius** (include if radius values not provided):
> **Border radius** — What are the correct radius values for:
> - `--radius-sm` (currently 4px) — subtle rounding (thumbnails)
> - `--radius-md` (currently 8px) — default rounding (buttons, cards)
> - `--radius-lg` (currently 16px) — large rounding (modals)

**Button colors** (include if button tokens not provided):
> **Button colors** — For each button theme (primary, secondary), what are the bg and text colors for default + hover states? Outline styling is derived from the fill colors automatically.

**Theme mappings** (include if semantic theme tokens not provided):
> **Theme mappings** — Which colors from the palette should map to these semantic tokens? Here's the format:
> ```
> [data-theme='light'] {
>   --bg-default: var(--???);    /* main background */
>   --bg-accent: var(--???);     /* accent/alternate background */
>   --bg-raised: var(--???);     /* cards, elevated surfaces */
>   --fg-default: var(--???);    /* default text */
>   --fg-link: var(--???);       /* text link colour */
>   --fg-icon: var(--???);       /* icon colour */
>   --fg-accent: var(--???);     /* accent text highlights */
>   --stroke-cards: var(--???);
>   --stroke-divider: var(--???);
> }
> ```

**Spacing** (include if spacing scale not provided):
> **Spacing** — Do you have a spacing scale defined? Here's what we're currently using:
> - `--spacing-xxs` — 4px (tight gaps, inline spacing)
> - `--spacing-xs` — 8px (small gaps, icon spacing)
> - `--spacing-sm` — 12px (compact padding)
> - `--spacing-md` — 16px (default padding, form gaps)
> - `--spacing-lg` — 24px (section padding, card gaps)
> - `--spacing-xl` — 32px (large gaps)

**Section spacing** (include if section spacing not provided):
> **Section spacing** — What are the section top/bottom padding values? Current placeholders:
> - `sm` — desktop: 24px, mobile: 24px
> - `md` — desktop: 48px, mobile: 40px
> - `lg` — desktop: 96px, mobile: 48px
> - `xl` — desktop: 180px, mobile: 180px

**Font families** (include if font families were detected but not on Google Fonts):
> **Font files** — "{font name}" isn't available as a Google Font, so we need the web font files. Could you share the .woff or .woff2 files? Alternatively, if there's a Google Font substitute you'd like to use instead, let me know the name.

#### Closing line (always include)

> If any of these exist in the Figma file or another export — just send me the URLs or JSON and I'll pull them in.

Then use the `AskUserQuestion` tool to ask:

> "There are outstanding tokens not covered by the provided input. Would you like to provide additional Figma URLs or JSON, or skip for now?"

If additional input is provided, loop back to Step 1 with the new input, merge with what was already synced, and re-run Steps 2-8.

---

## Step 8: Post Linear Project Update

Post a status update to Linear so the team has visibility on token sync progress.

1. Check if the `mcp__linear__save_status_update` tool is available **and** `LINEAR_PROJECT_ID` is set (non-empty) in `.env.development`
2. If **either** is missing, skip this step silently — do not warn or error
3. Read the `LINEAR_PROJECT_ID` value from `.env.development`
4. Call `mcp__linear__save_status_update` with:
   - `type`: `"project"`
   - `project`: the `LINEAR_PROJECT_ID` value
   - `health`: `"onTrack"`
   - `body`: A Markdown summary including:
     - Which token categories were synced (e.g., colors, typography, spacing)
     - Counts (e.g., "12 color tokens updated, 6 new spacing tokens added")
     - Files changed
     - Any outstanding items still needing attention

---

## Important Notes

- **Don't bloat**: Only add variables that are actually different from existing ones. If the input has 30 shades and we have 10, keep 10 unless the extras are genuinely used.
- **Follow existing conventions**: `--kebab-case` for all CSS custom properties, 25-900 scales for colors. All tokens live in `tools/sass/global/_variables.scss` — there are no SCSS variable files.
- **Prefer source naming for typography** if it's clearer than the current heading/body xs-2xl system, but maintain backward compatibility with the Text component's prop API.
- **Section spacing** is defined as CSS custom properties with `-desktop` and `-mobile` suffixes (e.g., `--section-spacing-md-desktop`, `--section-spacing-md-mobile`). These are consumed by `components/Section/style.module.scss` — only update the token values in `tools/sass/global/_variables.scss`, never the Section component.
- **Color classes in Icon and Text** are explicit (not generated from a Sass map). If new color tokens are added, add corresponding `.color_{name}` classes in `components/Icon/styles.module.scss` and `components/Text/styles.module.scss`, and update `ProjectColor` type in `tools/types/ProjectColor.d.ts`.
- **Prefer Google Fonts** — always check if a font is available on Google Fonts before falling back to local fonts. Google Fonts are self-hosted by Next.js (no browser requests to Google) and require zero file management. Only use `localFont` when the font genuinely isn't on Google Fonts. Don't touch `config/fonts.ts` unless the input specifies different font families than what's currently loaded.
- **JSON takes precedence** over Figma when both provide the same token — the JSON export is considered the more intentional/curated source.
- **Handle misspellings gracefully** — the JSON may contain typos like "sucess" instead of "success". Map these to the correct codebase naming (`--system-success-*`).
- **Semantic color themes** — if the JSON contains multiple theme sets under `semanticColors` (e.g., `purpleTheme`, `blueTheme`), use the **first theme** as the active one unless the user specifies otherwise. Note the availability of alternate themes in the report.
- **Theme model** — each theme has `--bg-default` + `--bg-accent` + `--bg-raised` for surfaces, `--fg-default` + `--fg-muted` + `--fg-subtle` + `--fg-link` + `--fg-icon` + `--fg-accent` for text/icons. Five themes: light, dark, primary, secondary, tertiary.
- **Figma export** — run `/design-system-export` after updating SCSS variables to regenerate `figma-design-tokens.json` for the Figma "JSON to Variables" plugin.
````
