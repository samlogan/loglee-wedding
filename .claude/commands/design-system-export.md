# Design System Export

Export the codebase's design tokens from SCSS into `figma-design-tokens.json` (Figma "JSON to Variables" plugin format).

This is the reverse of `/design-system-import` — it reads the current SCSS variables and generates a portable token file that can be imported into Figma via the "JSON to Variables" plugin.

## Arguments

`$ARGUMENTS`

**Optional flags:**

- `--dry-run` — preview the generated JSON without writing files

If no arguments, run the full export.

---

## Step 1: Read Current Token Sources

Read the following files to extract all design tokens:

- `tools/sass/global/_variables.scss` — all CSS custom properties (primitives, semantic themes, typography, spacing, radius, section spacing, button sizing)

---

## Step 2: Parse SCSS into Token Categories

Parse the `:root` block and `[data-theme='*']` blocks from `_variables.scss` into structured token data.

### 2a. Primitive Colors (from `:root`)

Extract all color custom properties and group them:

| CSS Property Pattern               | DTCG Path                      |
| ---------------------------------- | ------------------------------ |
| `--shades-black`, `--shades-white` | `primitives.shades.{name}`     |
| `--gray-{shade}`                   | `primitives.gray.{shade}`      |
| `--primary-{shade}`                | `primitives.primary.{shade}`   |
| `--secondary-{shade}`              | `primitives.secondary.{shade}` |
| `--tertiary-{shade}`               | `primitives.tertiary.{shade}`  |
| `--system-error-{shade}`           | `primitives.error.{shade}`     |
| `--system-success-{shade}`         | `primitives.success.{shade}`   |
| `--system-warning-{shade}`         | `primitives.warning.{shade}`   |
| `--system-info-{shade}`            | `primitives.info.{shade}`      |

Each token uses the DTCG format: `{ "$value": "#hexvalue" }`

### 2b. Semantic Tokens (from `[data-theme='*']` blocks)

For each theme (light, dark, primary, secondary, tertiary), parse the semantic tokens and **resolve `var()` references back to DTCG alias syntax**.

**Alias resolution rules:**

| `var()` Reference           | DTCG Alias             |
| --------------------------- | ---------------------- |
| `var(--shades-white)`       | `{shades.white}`       |
| `var(--shades-black)`       | `{shades.black}`       |
| `var(--gray-{N})`           | `{gray.{N}}`           |
| `var(--primary-{N})`        | `{primary.{N}}`        |
| `var(--secondary-{N})`      | `{secondary.{N}}`      |
| `var(--tertiary-{N})`       | `{tertiary.{N}}`       |
| `var(--system-error-{N})`   | `{error.{N}}`          |
| `var(--system-warning-{N})` | `{warning.{N}}`        |
| `var(--system-success-{N})` | `{success.{N}}`        |
| `var(--system-info-{N})`    | `{info.{N}}`           |
| `var(--font-weight-{name})` | `{font-weight.{name}}` |

**Semantic token grouping:**

| CSS Property Pattern        | DTCG Path                                  |
| --------------------------- | ------------------------------------------ |
| `--bg-{variant}`            | `semantic.{theme}.bg.{variant}`            |
| `--fg-{variant}`            | `semantic.{theme}.fg.{variant}`            |
| `--stroke-{variant}`        | `semantic.{theme}.stroke.{variant}`        |
| `--button-primary-{prop}`   | `semantic.{theme}.button.primary.{prop}`   |
| `--button-secondary-{prop}` | `semantic.{theme}.button.secondary.{prop}` |
| `--input-{prop}`            | `semantic.{theme}.input.{prop}`            |

### 2c. Typography (from `:root`)

The size tokens are **fluid** — a single `clamp(MINrem, Xrem + Yvw, MAXrem)` per step, built by
`fluid($narrow-px, $wide-px)` in `tools/sass/base/__fluid.scss`. DTCG has no fluid type and Figma
variables need concrete numbers, so **unpack each clamp back into its two anchors**: the first
argument is the mobile value, the third is the desktop one. Convert `rem` back to px at 16px per rem
(`3rem` → `48px`) — the `fluid()` call in the source has the px anchors verbatim if you would rather
read them there.

| CSS Property Pattern            | DTCG Path                                                                |
| ------------------------------- | ------------------------------------------------------------------------ |
| `--font-weight-{name}`          | `typography.font-weight.{name}` (value is a number)                      |
| `--display-{size}`              | `typography.display.mobile.{size}` + `typography.display.desktop.{size}` |
| `--display-line-height`         | `typography.display.line-height`                                         |
| `--display-letter-spacing`      | `typography.display.letter-spacing`                                      |
| `--display-default-font-weight` | `typography.display.default-font-weight` (resolve `var()` to alias)      |
| `--heading-{size}`              | `typography.heading.mobile.{size}` + `typography.heading.desktop.{size}` |
| `--heading-line-height`         | `typography.heading.line-height`                                         |
| `--heading-letter-spacing`      | `typography.heading.letter-spacing`                                      |
| `--heading-default-font-weight` | `typography.heading.default-font-weight` (resolve `var()` to alias)      |
| `--body-{size}`                 | `typography.body.mobile.{size}` + `typography.body.desktop.{size}`       |
| `--body-line-height`            | `typography.body.line-height`                                            |
| `--body-default-font-weight`    | `typography.body.default-font-weight` (resolve `var()` to alias)         |
| `--body-bold-font-weight`       | `typography.body.bold-font-weight` (resolve `var()` to alias)            |

### 2d. Spacing (from `:root`)

| CSS Property Pattern | DTCG Path        |
| -------------------- | ---------------- |
| `--spacing-{name}`   | `spacing.{name}` |

`--spacing-xl` and above are fluid. Export the **wide anchor** (the clamp's third argument) as the
value — a single-value DTCG token should carry the nominal size, not the phone one.

### 2e. Container Widths (from `:root`)

| CSS Property Pattern | DTCG Path          |
| -------------------- | ------------------ |
| `--container-{size}` | `container.{size}` |

### 2f. Border Radius (from `:root`)

| CSS Property Pattern | DTCG Path       |
| -------------------- | --------------- |
| `--radius-{name}`    | `radius.{name}` |

### 2g. Section Spacing (from `:root`)

| CSS Property Pattern       | DTCG Path                                                          |
| -------------------------- | ------------------------------------------------------------------ |
| `--section-spacing-{size}` | `section-spacing.mobile.{size}` + `section-spacing.desktop.{size}` |

One fluid token per step, unpacked into its two anchors exactly as the type scale is above.

### 2h. Button Sizing (from `:root`)

| CSS Property Pattern        | DTCG Path                                                        |
| --------------------------- | ---------------------------------------------------------------- |
| `--button-font-weight`      | `button.font-weight` (resolve `var()` to alias)                  |
| `--button-border-width`     | `button.border-width` (value as number, add `"$type": "number"`) |
| `--button-gap`              | `button.gap` (value as number, add `"$type": "number"`)          |
| `--button-{size}-font-size` | `button.{size}.font-size`                                        |
| `--button-{size}-padding-y` | `button.{size}.padding-y`                                        |
| `--button-{size}-padding-x` | `button.{size}.padding-x`                                        |
| `--button-{size}-icon-size` | `button.{size}.icon-size`                                        |

---

## Step 3: Assemble DTCG JSON

Combine all parsed tokens into a single JSON object following this structure:

```json
{
  "primitives": {
    "shades": { "black": { "$value": "#000000" }, "white": { "$value": "#ffffff" } },
    "gray": { "25": { "$value": "#fcfcfd" }, "50": { "$value": "#f9fafb" } },
    "primary": { ... },
    "secondary": { ... },
    "tertiary": { ... },
    "error": { ... },
    "success": { ... },
    "warning": { ... },
    "info": { ... }
  },
  "semantic": {
    "light": {
      "bg": { "default": { "$value": "{shades.white}" }, "accent": { "$value": "{gray.50}" }, "raised": { "$value": "{shades.white}" } },
      "fg": { "default": { "$value": "{gray.900}" }, "muted": { "$value": "{gray.600}" }, ... },
      "stroke": { "cards": { "$value": "{gray.300}" }, "divider": { "$value": "{gray.200}" } },
      "button": {
        "primary": { "bg": { "$value": "{primary.500}" }, "bg-hover": { "$value": "{primary.600}" }, ... },
        "secondary": { ... }
      },
      "input": { "bg": { "$value": "{gray.25}" }, "fg": { "$value": "{gray.500}" }, ... }
    },
    "dark": { ... },
    "primary": { ... },
    "secondary": { ... },
    "tertiary": { ... }
  },
  "typography": {
    "font-weight": { "light": { "$value": 300 }, "regular": { "$value": 400 }, ... },
    "display": {
      "desktop": { "lg": { "$value": "176px" }, "md": { "$value": "128px" } },
      "mobile": { "lg": { "$value": "64px" }, "md": { "$value": "56px" } },
      "line-height": { "$value": 1.05 },
      "letter-spacing": { "$value": "-0.03em" },
      "default-font-weight": { "$value": "{font-weight.black}" }
    },
    "heading": {
      "desktop": { "2xl": { "$value": "72px" }, ... },
      "mobile": { "2xl": { "$value": "48px" }, ... },
      "line-height": { "$value": 1.2 },
      "letter-spacing": { "$value": "-0.02em" },
      "default-font-weight": { "$value": "{font-weight.regular}" }
    },
    "body": {
      "desktop": { "2xl": { "$value": "22px" }, ... },
      "mobile": { "2xl": { "$value": "20px" }, ... },
      "line-height": { "$value": 1.5 },
      "default-font-weight": { "$value": "{font-weight.regular}" },
      "bold-font-weight": { "$value": "{font-weight.bold}" }
    }
  },
  "spacing": {
    "none": { "$value": "0px" },
    "xxs": { "$value": "4px" },
    "xs": { "$value": "8px" },
    ...
  },
  "container": {
    "xs": { "$value": "640px" },
    "sm": { "$value": "768px" },
    "md": { "$value": "1024px" },
    "lg": { "$value": "1280px" },
    "xl": { "$value": "1440px" }
  },
  "radius": {
    "sm": { "$value": "4px" },
    "md": { "$value": "8px" },
    "lg": { "$value": "16px" },
    "full": { "$value": "200px" }
  },
  "section-spacing": {
    "desktop": { "xs": { "$value": "32px" }, "sm": { "$value": "48px" }, ... },
    "mobile": { "xs": { "$value": "12px" }, "sm": { "$value": "16px" }, ... }
  },
  "button": {
    "font-weight": { "$value": "{font-weight.semibold}" },
    "border-width": { "$value": 2, "$type": "number" },
    "gap": { "$value": 4, "$type": "number" },
    "sm": { "font-size": { "$value": "14px" }, "padding-y": { "$value": "12px" }, "padding-x": { "$value": "12px" }, "icon-size": { "$value": "16px" } },
    "md": { ... },
    "lg": { ... }
  }
}
```

**Formatting rules:**

- Color values: lowercase hex without alpha (e.g., `#000000` not `#000000FF`)
- Pixel values: keep as strings with `px` suffix (e.g., `"72px"`)
- Unitless values (line-height, font-weight): keep as numbers
- `em` values: keep as strings (e.g., `"-0.02em"`)
- `var()` references: resolve to DTCG alias syntax `{token.path}` — never write raw `var()` into the JSON
- Button `border-width` and `gap`: store as numbers with `"$type": "number"` alongside `$value`

---

## Step 4: Output

### If `--dry-run`:

Print the generated `figma-design-tokens.json` content to the console and stop.

### Otherwise:

1. Write `figma-design-tokens.json` to the project root
2. Report the results:

```
## Design System Export Complete

### File written
- `figma-design-tokens.json` — Figma "JSON to Variables" plugin format

### Token summary
| Category | Count |
|---|---|
| Primitive colors | {N} |
| Semantic tokens | {N} (across {M} themes) |
| Typography | {N} |
| Spacing | {N} |
| Container widths | {N} |
| Border radius | {N} |
| Section spacing | {N} |
| Button sizing | {N} |
| **Total** | **{N}** |

### Figma import
Import `figma-design-tokens.json` into Figma using the "JSON to Variables" plugin:
https://www.figma.com/community/plugin/1557585201560807410/json-to-variables
```

---

## Important Notes

- **This is a one-way export** — it reads SCSS and writes JSON. It does NOT modify any SCSS files.
- **`var()` → alias resolution is critical** — semantic tokens must use DTCG alias references (`{gray.500}`), not raw hex values. Match the `var(--x)` reference to the corresponding primitive token path.
- **System color prefix** — in SCSS, system colors use `--system-error-500` but in DTCG they're `primitives.error.500` (no "system" prefix). Handle this mapping.
- **Token ordering** — maintain consistent ordering: shades → gray → primary → secondary → tertiary → system colors within primitives. Light → dark → primary → secondary → tertiary within semantic.
- **Output format** — the exported JSON must follow the Figma "JSON to Variables" plugin format with `collections`, `modes`, and `variables` arrays. Build the Figma-ready structure directly — no intermediate DTCG file or conversion script needed.
