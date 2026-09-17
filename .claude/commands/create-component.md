# Create Component

**Plan mode behaviour:**

- If `--no-plan` is passed, skip plan mode entirely — do NOT call `EnterPlanMode` or `ExitPlanMode`. This flag is used when called from `/ticket` or other commands that already manage their own plan mode.
- If you are already in plan mode and `--no-plan` is NOT passed, exit plan mode first using `ExitPlanMode`, then tell the user to re-run `/create-component` with the relevant arguments. This command manages its own plan mode and will not work correctly if already in plan mode.
- Otherwise, **before doing anything else**, use the `EnterPlanMode` tool to enter plan mode. Explore the codebase and any Figma references, then present your plan for approval before writing any files.

Scaffold a new reusable UI component with `index.tsx` + `styles.module.scss` + `{Name}.stories.tsx`.

## Arguments

`$ARGUMENTS`

**Expected format:** `ComponentName` (PascalCase)
Optional flags: `--desktop=<figma-url>`, `--mobile=<figma-url>`, `--no-plan`

**Example usages:**

- `/create-component Badge`
- `/create-component Tooltip --desktop=https://figma.com/design/...`
- `/create-component Badge --no-plan --desktop=https://figma.com/design/...` (when called from `/ticket`)

---

## Parse Arguments

1. Extract the PascalCase name from `$ARGUMENTS` (first positional argument)
2. Extract optional `--desktop=` and `--mobile=` Figma URLs
3. For any missing arguments, prompt the user using `AskUserQuestion`:
   - If no **name**: "What should this component be called? (PascalCase, e.g., `Badge`, `Tooltip`)"
   - If no **desktop URL**: "Desktop Figma URL? (paste URL or press Enter to skip)"
   - If no **mobile URL**: "Mobile Figma URL? (paste URL or press Enter to skip — desktop will be used for both breakpoints)"
   - Batch these into a single `AskUserQuestion` call. The user can skip Figma URLs by pressing Enter, but they must be asked.

Derive:

- **PascalCase**: `{Name}` (component folder & export name)
- **camelCase**: `{name}` (CSS base class name)

---

## Interactive Prompting

**Skip this section entirely if `--no-plan` was passed OR if Figma URLs were provided.** When Figma URLs are available, infer all of this from the design analysis in Step 0d instead. When `--no-plan` is passed (from `/ticket`), the ticket description provides the context.

**Only ask these questions when no Figma URLs were provided and `--no-plan` was NOT passed:**

1. **"Does this component need client-side interactivity?"** — Options: "No, server component (default)", "Yes, use client (hooks/event handlers)"
   - Only add `'use client'` when the component uses hooks (`useState`, `useEffect`, `useRef`) or event handlers (`onClick`, `onKeyDown`). Server component is the default.
2. **"Does this component render children?"** — Options: "No", "Yes, simple children", "Yes, compound component (e.g., Card.Image, Card.Content)"
   - If simple children: add `children?: ReactNode` prop
   - If compound: scaffold sub-component files in subdirectories (following the Card pattern with `CardImage`, `CardContent`)
3. **"Does this component need variant/theme/size support?"** — Options: "None", "Theme only (light/dark)", "Variant + Theme + Size"
   - Determines classNames composition and SCSS structure
4. **"Brief description of the component"** — Free text input describing what the component does, to inform JSX structure and prop design

---

## Scope & Approach

Focus on **clean scaffolding and visual accuracy** using DRY, convention-compliant code. The goal is to get the component to a close match of the Figma design using the project's existing design tokens and patterns.

### What to build

- Component file with props interface, styles, and accessibility
- Responsive layout matching desktop and mobile Figma designs (if provided)
- Correct use of design tokens, spacing, typography, and theme variants
- Standard interaction patterns: hover states, focus states, transitions
- Animations and motion: parallax, scroll reveals, fade-ins (via Motion)
- Video players (via React Player)

### What to leave space for

Some patterns produce unreliable results and should be left as clearly marked placeholder space for the developer to implement directly. When encountering these, create the surrounding structure but leave the complex part as an empty wrapper with a descriptive className and a code comment explaining what goes there.

- **3D elements** — WebGL, Three.js, Spline embeds
- **Complex SVG work** — morphing animations, hand-drawn path animations, interactive SVG illustrations
- **Advanced interactions** — drag-and-drop, custom cursor effects, complex multi-element choreography
- **Highly custom UI** — non-standard form controls, interactive data visualisations

Example of leaving space:

```tsx
{
  /* TODO: Implement Spline 3D scene */
}
<div className={styles.splineWrapper} />;
```

The ticket description should list which specific elements fall into this category. If the ticket says to skip something, leave a clean placeholder — do not attempt it.

---

## Step 0: Figma Prerequisites (Mandatory)

**This step runs before anything else. Do NOT skip it.**

### 0a: Verify Figma MCP

Check if the `mcp__figma__get_design_context` and `mcp__figma__get_screenshot` tools are available.

If Figma MCP tools are **NOT available**, stop and tell the user:

> "The Figma MCP server is not connected. This is required for creating components."
>
> "Add the Figma MCP server in `.claude/mcp.json` — see https://mcp.figma.com for setup instructions. Then restart Claude Code."

Use `AskUserQuestion`: "The Figma MCP server must be connected before continuing. Have you set it up and restarted Claude Code?"

Do NOT proceed until the tools are confirmed available. If the user says they've restarted, re-check for the tools and repeat if still unavailable.

### 0b: Verify Figma Access Token

Check if `FIGMA_PERSONAL_ACCESS_TOKEN` is set and non-empty in `.env.development`.

If **not set**, use `AskUserQuestion`: "No `FIGMA_PERSONAL_ACCESS_TOKEN` found in `.env.development`. This is required for downloading images from Figma. Generate one at https://www.figma.com/developers/api#access-tokens. Paste your token below."

Append `FIGMA_PERSONAL_ACCESS_TOKEN="{token}"` to `.env.development`.

### 0c: Validate Figma Access Token

Read the token and test it against a **file endpoint** (NOT `/v1/me` — that requires `current_user:read` scope which most tokens lack):

```bash
FIGMA_TOKEN=$(grep '^FIGMA_PERSONAL_ACCESS_TOKEN=' .env.development | cut -d'=' -f2- | tr -d '"' | tr -d "'")
curl -s -o /dev/null -w "%{http_code}" -H "X-FIGMA-TOKEN: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/files/{fileKey}/nodes?ids=0:1&depth=1"
```

A `200` response means the token is valid. If `401` or `403`, ask for a new token and re-validate.

### How to download images from the Figma REST API

Use this pattern throughout:

```bash
# 1. Read token
FIGMA_TOKEN=$(grep '^FIGMA_PERSONAL_ACCESS_TOKEN=' .env.development | cut -d'=' -f2- | tr -d '"' | tr -d "'")
# 2. Get the image export URL (scale=0.5 for thumbnails, scale=2 for high-res)
curl -sH "X-FIGMA-TOKEN: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/images/{fileKey}?ids={nodeId}&format=png&scale=0.5" \
  | jq -r '.images["{nodeId}"]'
# 3. Download the PNG
curl -sL "<url_from_step_2>" -o path/to/output.png
# 4. Resize if needed (macOS sips) — always copy from source first, never chain resizes
sips -z {height} {width} path/to/output.png
```

**Important:** The header MUST be `X-FIGMA-TOKEN` (all caps). The `nodeId` in the URL uses `-` separators but in the `jq` filter uses `:` separators (e.g., URL: `ids=17-837`, jq: `.images["17:837"]`).

---

### 0d: Figma Design Analysis

**Only run this sub-step if Figma URLs were provided via `--desktop=` or `--mobile=` flags. Otherwise skip to Step 1.**

1. Use `mcp__figma__get_screenshot` on each provided Figma URL to get visual reference
2. Use `mcp__figma__get_design_context` to extract design tokens, spacing, colors, and typography
3. Map Figma values to existing project design tokens:
   - **CSS Custom Properties**: Reference `tools/sass/global/_variables.scss` for colors (e.g., `var(--primary-500)`, `var(--fg-default)`, `var(--bg-default)`, `var(--fg-muted)`, `var(--bg-subtle)`)
   - **Spacing scale**: `$spacing-xxs` (4px), `$spacing-xs` (8px), `$spacing-s` (12px), `$spacing-m` (16px), `$spacing-l` (24px), `$spacing-xl` (32px)
   - **Media breakpoints**: Use mixins from `tools/sass/base/__media.scss` (`media-up`, `media-down`, `media-between` with named breakpoints: `mobile` 400px, `large-mobile` 500px, `tablet` 769px, `large-tablet` 1025px, `desktop` 1340px, `large-desktop` 1600px)
   - **Typography**: `@include heading-font()`, `@include body-font()`, font weights 400 (regular) and 700 (bold)
4. **Infer component structure from the design** — use the visual reference and design context to determine whether the component needs client-side interactivity, children, variants/themes/sizes, and compound sub-components. This replaces the Interactive Prompting questions when Figma is available.

---

## Step 1: Create Component File

**File:** `components/{Name}/index.tsx`

**Before scaffolding, read existing components** to match established patterns:

- `components/Button/index.tsx` — props interface, classNames composition, variant/theme/size modifiers
- `components/Card/index.tsx` — compound component pattern (Card.Image, Card.Content)
- `components/Accordion/index.tsx` — client component with interactivity, state management

Pick the component closest to what you're building and follow its patterns exactly.

```typescript
// 'use client' — ONLY if interactive (from question 1)

import type { ReactNode } from 'react'; // Only if children
// Next.js imports (if needed)
// Component imports (if needed)
import classNames from '@/helpers/classNames';
import styles from './styles.module.scss';

export interface {Name}Props {
  className?: string;
  // Add props based on description and interactive prompting answers
  // children?: ReactNode;           // If renders children
  // theme?: 'primary' | 'secondary'; // If theme support
  // variant?: 'default' | 'outline'; // If variant support
  // size?: 'sm' | 'md' | 'lg';      // If size support
  // disabled?: boolean;
  // ariaLabel?: string;              // For icon-only interactive elements
  // onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

const {Name} = (props: {Name}Props) => {
  const { className /*, ...destructure other props with defaults */ } = props;

  const classes = classNames(
    styles.{camelCase},
    // styles[`theme_${theme}`],     // If theme support
    // styles[`variant_${variant}`], // If variant support
    // styles[`size_${size}`],       // If size support
    // { [styles.outline]: outline }, // For boolean modifiers
    className
  );

  return (
    <div className={classes}>
      {/* Component JSX */}
    </div>
  );
};

export default {Name};
```

### Key conventions

- **Arrow function** (not function declaration): `const {Name} = (props: {Name}Props) => { ... }`
- **Do NOT use `FC<>` type** — `FC<>` is only for section components, not reusable components
- **Props interface** exported from the same file: `export interface {Name}Props { ... }` or `export type {Name}Props = { ... }`
- **Always include** `className?: string` prop
- **Default values via destructuring**: `const { theme, disabled = false, size = 'md' } = props`
- **classNames helper** from `@/helpers/classNames` — always imported, always used for class composition
- **Dynamic SCSS module keys** for variants: `styles[\`variant*${variant}\`]`, `styles[\`theme*${theme}\`]`, `styles[\`size_${size}\`]`
- **Conditional class inclusion**: `{ [styles.outline]: outline }` for boolean props
- **Import order**: `'use client'` (if needed) → React imports → Next.js imports → Component imports → Helper/utility imports → Type imports → SCSS module (always last)
- **Default export**: `export default {Name}`
- **Compound components** (if applicable): `{Name}.SubComponent = SubComponent` after default export (see Card pattern)

### Accessibility requirements

- Interactive elements must use semantic HTML (`<button>`, `<a>`, not `<div onClick>`)
- If `onClick` is on a non-button element, also handle `onKeyDown` for Enter/Space
- Include `aria-label` prop for icon-only or non-text interactive elements
- Typed event handlers: `onClick?: (event: MouseEvent<HTMLButtonElement>) => void`

### Compound components (if applicable)

For compound components (e.g., a Card with Card.Image and Card.Content):

1. Create sub-component files in the same directory: `components/{Name}/{SubName}/index.tsx`
2. Import them in the main component file
3. Attach as static properties: `{Name}.{SubName} = {SubName}`
4. Each sub-component follows the same conventions (arrow function, classNames, etc.)

---

## Step 2: Create Styles File

**File:** `components/{Name}/styles.module.scss`

### Key conventions

- **Wrap all styles in `@layer defaults { ... }`** — this is critical, all component styles use CSS layers
- **Class naming**: lowercase base class (`.button`, `.card`, `.text`), underscore-separated modifiers (`.variant_pill`, `.theme_primary`, `.size_md`)
- **Variant classes use parent selector grouping**:

  ```scss
  .theme {
    &_primary {
      border-color: var(--primary-button-border);
      background-color: var(--primary-button-bg);
      color: var(--primary-button-fg);

      &:hover {
        background-color: var(--primary-button-bg-hover);
      }
    }

    &_secondary { ... }
  }
  ```

- **CSS custom properties for theming** — use semantic variables from `tools/sass/global/_variables.scss`:
  - Theme-aware: `var(--bg-default)`, `var(--fg-default)`, `var(--fg-muted)`, `var(--fg-subtle)`, `var(--bg-muted)`, `var(--bg-subtle)`
  - Brand: `var(--primary-500)`, `var(--secondary-500)`, `var(--gray-*)`
  - Button-specific: `var(--primary-button-bg)`, `var(--primary-button-fg)`, etc.
- **Responsive styles co-located inside each selector**:

  ```scss
  .container {
    display: flex;
    gap: 64px;

    @include media-down(tablet) {
      flex-direction: column;
      gap: 24px;
    }
  }
  ```

- **Transitions**: inline `transition` property (e.g., `transition: 0.2s ease`)
- **No Sass module imports needed** — `resources.scss` is auto-imported globally, so `@include media-down()`, `$spacing-m`, etc. are all available
- **Nesting for pseudo-classes**: `&:hover`, `&:focus-visible`, `&:disabled`, `&:last-child`

If Figma design provided, generate styles matching the design. If not, create a minimal scaffold:

```scss
@layer defaults {
  .{camelCase} {
    // Base styles
  }
}
```

---

## Step 3: Create Storybook Story File

**File:** `components/{Name}/{Name}.stories.tsx`

Every component must ship with a Storybook story so it can be browsed in isolation and exercised by `/review-design`, `/review-code`, and the headless test runner. Generate the file from the props interface you just wrote:

```typescript
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import {Name} from '.';

const meta = {
  title: 'Components/{Name}',
  component: {Name},
  tags: ['autodocs'],
  // Bind the story to its Figma node so the Design tab and /review-design can
  // compare against the right frame. Use the --desktop URL passed to /create-component.
  parameters: {
    design: { type: 'figma', url: '{desktop-figma-url}' }
  },
  args: {
    // Default args that exercise the component. When a --desktop Figma URL was
    // provided, use design-faithful values (the actual label/text, sizes, and
    // states from the design) so the first /review-design is a true comparison.
  }
} satisfies Meta<typeof {Name}>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// One story per union literal on the props interface. Examples:
// - `theme?: 'primary' | 'secondary'` → Primary + Secondary stories
// - `variant?: 'rounded' | 'square' | 'pill'` → Rounded + Square + Pill stories
// - `size?: 'sm' | 'md' | 'lg'` → SmallMediumLarge story showing the largest size
// - boolean props (e.g., `outline`, `disabled`) → one story with each toggled on
```

### Conventions

- Title is always `Components/{Name}`
- Set `parameters.design` to the component's Figma node (the `--desktop` URL) — `/review-design` reads it and flags stories that lack it
- When a Figma URL was provided, make the `Default` args **design-faithful** (real label/copy, the sizes/states shown in the design) so the first design review compares like-for-like
- Use `satisfies Meta<typeof {Name}>` (not the loose type form) so Story args are inferred correctly
- `tags: ['autodocs']` enables a free docs page per component
- Cover every union prop with at least one story exercising each literal. Boolean props get one story per truthy state.
- If the component renders children (and is not compound), pass a representative `children` value via `args`
- For compound components (e.g., `Card.Image` + `Card.Content`), assemble the children inline:
  ```tsx
  const cardContent = (
    <>
      <Card.Image src="..." />
      <Card.Content>...</Card.Content>
    </>
  );
  export const Default: Story = { args: { children: cardContent } };
  ```
- For client components that need providers (Carousel, ThemeProvider consumers, etc.), wrap with a decorator:
  ```tsx
  decorators: [
    (Story) => (
      <SomeProvider>
        <Story />
      </SomeProvider>
    )
  ];
  ```

### Note on props that take Sanity-shaped data

If the component accepts Sanity-shaped data (e.g., `<Image>` with the `asset` variant, or rich-text `blocks`), import the mock helpers from `@/tools/storybook/`:

```typescript
import mockImage from '@/tools/storybook/mockImage';
import mockBlockContent from '@/tools/storybook/mockBlockContent';
```

These return correctly-typed, GROQ-shaped fixtures.

---

## Step 4: Verify

Run `/check` to lint, format, and type-check the project. Fix any errors before completing.

Optionally run `yarn storybook` to visually verify the component renders. Find its story ID in `http://localhost:6006/index.json` rather than building one — the sidebar groups by what a thing is (`Foundations/`, `Content/`, `Surfaces/`, `Navigation/`, `Forms/`), so the path is not derivable from the folder name.

---

## Summary

After completion, inform the user:

- List all files created (including `{Name}.stories.tsx`)
- Confirm the component follows project conventions (arrow function, classNames, CSS layers, etc.)
- Remind them the component is ready to import: `import {Name} from '@/components/{Name}'`
- List any placeholder elements that were left for manual implementation
- **Prompt the user to run `/review-design {Name}`** as the next step to compare the built component against the Figma design
