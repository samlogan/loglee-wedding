# Create Section

**Plan mode behaviour:**

- If `--no-plan` is passed, skip plan mode entirely — do NOT call `EnterPlanMode` or `ExitPlanMode`. This flag is used when called from `/ticket` or other commands that already manage their own plan mode.
- If you are already in plan mode and `--no-plan` is NOT passed, exit plan mode first using `ExitPlanMode`, then tell the user to re-run `/create-section` with the relevant arguments. This command manages its own plan mode and will not work correctly if already in plan mode.
- Otherwise, **before doing anything else**, use the `EnterPlanMode` tool to enter plan mode. Explore the codebase and any Figma references, then present your plan for approval before writing any files.

Create a new Sanity section for the Next.js Bolognese page builder.

## Arguments

`$ARGUMENTS`

**Expected format:** `SectionName` (PascalCase, without the "Section" suffix)
Optional flags: `--desktop=<figma-url>`, `--mobile=<figma-url>`, `--no-plan`

**Example usages:**

- `/create-section Hero`
- `/create-section Testimonial --desktop=https://figma.com/design/...`
- `/create-section Pricing --desktop=https://figma.com/design/... --mobile=https://figma.com/design/...`
- `/create-section Hero --no-plan --desktop=https://figma.com/design/...` (when called from `/ticket`)

---

## Parse Arguments

1. Extract the PascalCase name from `$ARGUMENTS` (first positional argument)
2. Extract optional `--desktop=` and `--mobile=` Figma URLs
3. For any missing arguments, prompt the user using `AskUserQuestion`:
   - If no **name**: "What should this section be called? (PascalCase, e.g., `Hero`, `Testimonial`)"
   - If no **desktop URL**: "Desktop Figma URL? (paste URL or press Enter to skip)"
   - If no **mobile URL**: "Mobile Figma URL? (paste URL or press Enter to skip — desktop will be used for both breakpoints)"
   - Batch these into a single `AskUserQuestion` call. The user can skip Figma URLs by pressing Enter, but they must be asked.

### Validate Section Name

Before proceeding, check that the name describes a **layout pattern**, not specific content. Sections are reusable CMS components — the same section will appear on multiple pages with different content.

**If the name is content-specific**, suggest a better alternative:

| Content-specific (bad) | Layout-based (good)            |
| ---------------------- | ------------------------------ |
| `Mission`              | `LargeText` or `StatementText` |
| `OurTeam`              | `PeopleGrid` or `ProfileGrid`  |
| `WhyChooseUs`          | `FeatureCards` or `CardGrid`   |
| `TrustedBy`            | `LogoMarquee` or `LogoBar`     |
| `CEOMessage`           | `Blockquote` or `PullQuote`    |

**The test:** "Could a content editor reuse this on a different page with different content and the name still makes sense?"

If the name fails this test, suggest alternatives and ask the user to confirm before continuing. Genuinely unique sections (`Hero`, `ContactForm`, `FAQ`, `Blog`) are fine as-is.

Derive these naming conventions from the PascalCase name (e.g., `Testimonial`):

- **PascalCase**: `TestimonialSection` (component folder & export name)
- **camelCase**: `testimonialSection` (schema type name & file name)
- **Title**: `Testimonial` (human-readable title in Sanity Studio)

---

## Interactive Prompting

**Skip this section entirely if `--no-plan` was passed OR if Figma URLs were provided.** When Figma URLs are available, infer all of this from the design analysis in Step 0d instead. When `--no-plan` is passed (from `/ticket`), the ticket description provides the context.

**Only ask these questions when no Figma URLs were provided and `--no-plan` was NOT passed:**

1. **"What fields should this section have?"** — Options: "Title + Content (rich text)", "Title + Content + Image", "Title + Cards (repeatable)", "Custom (I'll describe)"
2. **"What theme should the section default to?"** — Options: "Light", "Dark", "None (let CMS decide)"
3. **"Should the section include a CTA button?"** — Options: "Yes", "No"
4. **"Is this a full-width or contained section?"** — Options: "Contained (default)", "Full width"

Use the answers to inform the schema fields, component structure, and GROQ projection.

---

## Scope & Approach

Focus on **clean scaffolding and visual accuracy** using DRY, convention-compliant code. The goal is to get the section to a close match of the Figma design using the project's existing components, design tokens, and patterns.

### What to build

- Schema, component, styles, query, and all four registrations
- Responsive layout matching desktop and mobile Figma designs (if provided)
- Correct use of design tokens, spacing, typography, and theme variants
- Standard UI patterns: grids, cards, accordions, tabs, carousels (via Embla), forms (via React Hook Form)
- Animations and motion: parallax, scroll reveals, fade-ins, marquees (via Motion)
- Video players (via React Player)
- Proper semantic HTML and accessibility attributes

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

```scss
.splineWrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  // Spline embed — implement manually
}
```

The ticket description should list which specific elements fall into this category. If the ticket says to skip something, leave a clean placeholder — do not attempt it.

---

## Step 0: Figma Prerequisites (Mandatory)

**This step runs before anything else. Do NOT skip it.**

### 0a: Verify Figma MCP

Check if the `mcp__figma__get_design_context` and `mcp__figma__get_screenshot` tools are available.

If Figma MCP tools are **NOT available**, stop and tell the user:

> "The Figma MCP server is not connected. This is required for creating sections."
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

## Step 0d: Figma Design Analysis

**Only run this sub-step if Figma URLs were provided via `--desktop=` or `--mobile=` flags. Otherwise skip to Step 1.**

1. Use `mcp__figma__get_screenshot` on each provided Figma URL to get visual reference
2. Use `mcp__figma__get_design_context` to extract design tokens, spacing, colors, and typography
3. Map Figma values to existing project design tokens:
   - **CSS Custom Properties**: Reference `tools/sass/global/_variables.scss` for colors (e.g., `var(--primary-500)`, `var(--fg-default)`, `var(--bg-default)`)
   - **Media breakpoints**: Use mixins from `tools/sass/base/__media.scss` (`media-up`, `media-down`, `media-between` with named breakpoints: `mobile: 400px`, `large-mobile: 500px`, `tablet: 769px`, `large-tablet: 1025px`, `desktop: 1340px`, `large-desktop: 1600px`)
   - **Typography**: Reference `tools/sass/base/__variables.scss` for font sizes and weights
4. **Infer section structure from the design** — use the visual reference and design context to determine fields, theme, whether a CTA button is present, and whether the section is full-width or contained. This replaces the Interactive Prompting questions when Figma is available.

## Step 0e: Download Thumbnail from Figma (MANDATORY when `--desktop=` is provided)

**Do NOT skip this step. Do NOT copy a placeholder thumbnail. Always download the real design from Figma.**

If a `--desktop=` Figma URL was provided, download the desktop frame as the section thumbnail:

1. Parse the `fileKey` and `nodeId` from the `--desktop=` URL
2. Create the section folder: `mkdir -p sections/{PascalCase}Section`
3. Download using the Figma REST API:

```bash
FIGMA_TOKEN=$(grep '^FIGMA_PERSONAL_ACCESS_TOKEN=' .env.development | cut -d'=' -f2- | tr -d '"' | tr -d "'")
# Get export URL (scale=0.5 for thumbnail size)
IMAGE_URL=$(curl -sH "X-FIGMA-TOKEN: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/images/{fileKey}?ids={nodeId}&format=png&scale=0.5" \
  | jq -r '.images["{nodeId_with_colons}"]')
# Download the PNG
curl -sL "$IMAGE_URL" -o sections/{PascalCase}Section/thumbnail.png
```

4. Verify the file was downloaded and is not empty:

```bash
ls -la sections/{PascalCase}Section/thumbnail.png
```

**Remember:** `nodeId` uses `-` in the API URL but `:` in the jq filter (e.g., URL: `ids=17-837`, jq: `.images["17:837"]`).

---

## Step 1: Create Sanity Schema

**File:** `tools/sanity/schema/sections/{camelCase}Section.ts`

**Before scaffolding, read the reference sections** in `.claude/references/sections/` for real working examples of different patterns:

- `GridSection/` — repeatable cards with sub-schema, Image, TextBlock, Link
- `TwoColumnDefaultSection/` — TextTitle, Image with aspectRatio, TextBlock, Link, media alignment
- `FaqSection/` — TextTitle, TextBlock, Link, sub-component file (FaqItems/), accordion

Pick the reference closest to the section you're building and follow its patterns.

Follow this schema structure:

```typescript
import { {IconName} } from 'react-icons/tb';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import { defineType } from 'sanity';
import thumbnail from '../../../../sections/{PascalCase}Section/thumbnail.png';
// Import element types as needed (e.g., IButtonElement from '../elements/button')

interface I{PascalCase}Section {
  // Define based on fields from interactive prompting
  title: string;
  content: SanityTextBlock[];
  // ... other fields
}

const {camelCase}Section = defineType({
  name: '{camelCase}Section',
  title: '{Title}',
  type: 'object',
  groups: defaultSectionGroups,
  icon: {IconName},
  fields: [
    internalLabelField,
    {
      name: 'sectionPreview',
      title: 'Section Preview',
      type: 'image',
      components: { input: ReadOnlyImageInput },
      // @ts-ignore
      imageUrl: thumbnail.src,
      readOnly: true,
      group: 'internal'
    },
    // Add fields using the element types below — see "Schema Element Types" reference
    // IMPORTANT: Use generic, reusable field names — see "Field Naming Rules" below
    // Always include group: 'data' for content fields
    {
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields',
      group: 'styles'
    }
  ],
  preview: {
    select: {
      internalLabel: 'internalLabel'
    },
    prepare(selection) {
      return {
        title: '{Title}',
        subtitle: selection?.internalLabel
      };
    }
  }
});

export { {camelCase}Section };
export type { I{PascalCase}Section };
```

**Icon selection:** Choose an appropriate icon from `react-icons/tb` (Tabler Icons). Examples:

- Hero/Header: `TbLayoutNavbar`
- Testimonial: `TbQuote`
- Pricing: `TbCurrencyDollar`
- FAQ: `TbQuestionMark`
- Grid/Cards: `TbLayoutGrid`
- CTA: `TbClick`
- Features: `TbStar`
- Gallery: `TbPhoto`
- Text/Content: `TbAlignLeft`

### Schema Element Types (MANDATORY)

**Always use the project's custom element types** instead of raw Sanity types. These provide consistent UX in Sanity Studio (rich text titles, image hotspots, link type switching, etc.).

| Content need              | Element type to use                              | Raw type (DO NOT use) | Interface import                           |
| ------------------------- | ------------------------------------------------ | --------------------- | ------------------------------------------ |
| Title / heading (h1-h6)   | `title`                                          | `string`              | — (string in TS)                           |
| Plain text label          | `string`                                         | —                     | —                                          |
| Rich text body            | `blockContentSimple`                             | `array` of blocks     | `SanityTextBlock[]`                        |
| Rich text (advanced)      | `blockContentStandard` or `blockContentAdvanced` | —                     | `SanityTextBlock[]`                        |
| Image (basic)             | `imageElementSimple`                             | `image`               | `SanityImage`                              |
| Image (with aspect ratio) | `imageElementAdvanced`                           | `image`               | `SanityImage`                              |
| Button (label + link)     | `buttonElement`                                  | `object`              | `IButtonElement` from `../elements/button` |
| Link (standalone)         | `linkElement`                                    | `object`              | `ILinkElement` from `../elements/link`     |
| Icon                      | `icon`                                           | `string`              | `string`                                   |
| Slug                      | `slugElement`                                    | `slug`                | —                                          |

**Pattern for optional buttons** (used by most sections):

```typescript
{
  group: 'data',
  initialValue: false,
  name: 'addButton',
  title: 'Add Button',
  type: 'boolean'
},
{
  group: 'data',
  hidden: ({ parent }) => !parent?.addButton,
  name: 'button',
  title: 'Button',
  type: 'buttonElement'
}
```

**Pattern for titles** — use `type: 'title'` (not `type: 'string'`) for any heading field. This gives content editors the rich text TitleInput with inline formatting:

```typescript
{
  group: 'data',
  name: 'title',
  title: 'Title',
  type: 'title'
}
```

When using `type: 'title'`, also use `stripTitleTags` in the schema `prepare()` and `TextTitle` in the component:

```typescript
// Schema prepare():
import stripTitleTags from '../../helpers/stripTitleTags';
title: stripTitleTags(selection?.title) || '{Title}';

// Component:
import TextTitle from '@/components/TextTitle';
<TextTitle title={title} variant="heading" size="lg" />
```

**Pattern for images:**

```typescript
{
  group: 'data',
  name: 'image',
  title: 'Image',
  type: 'imageElementSimple' // or 'imageElementAdvanced' if aspect ratio control needed
}
```

**If the section has sub-items** (like cards), define them as separate `defineType` objects in the same file and export them (following the `gridCard` pattern). Sub-items should also use element types — e.g., card images use `imageElementSimple`, card buttons use `buttonElement`.

### Field Naming Rules

**Use generic, reusable field names** — not content-specific names. The same section will hold different content on different pages.

| Content in Figma            | BAD field name     | GOOD field name        |
| --------------------------- | ------------------ | ---------------------- |
| "Our Mission" heading       | `missionTitle`     | `title`                |
| Mission statement paragraph | `missionStatement` | `content` or `body`    |
| Team member list            | `teamMembers`      | `people` or `items`    |
| "Why Choose Us" cards       | `reasons`          | `cards` or `items`     |
| Company stats               | `companyStats`     | `stats` or `items`     |
| CEO quote                   | `ceoQuote`         | `quote` or `content`   |
| Office locations            | `officeLocations`  | `locations` or `items` |

**Preferred generic field names:**

- `title` — main heading (not `sectionTitle`, `heroTitle`, `aboutTitle`)
- `tagline` — small label above the title (not `sectionLabel`, `missionLabel`)
- `content` / `body` — rich text body (not `description`, `missionText`, `aboutContent`)
- `items` / `cards` — repeatable array (not `teamMembers`, `services`, `features`)
- `image` — single image (not `heroImage`, `aboutImage`)
- `images` — image array (not `galleryPhotos`, `teamPhotos`)
- `button` / `buttons` — CTA(s) (not `ctaButton`, `learnMoreButton`)
- `quote` — quotation text
- `author` / `attribution` — who said/wrote it

**The test:** "If a content editor changes every word in this section, do the field names still make sense?"

---

## Step 2: Create Frontend Component

### 2a. Component File

**File:** `sections/{PascalCase}Section/index.tsx`

```typescript
import type { FC } from 'react';
import Section from '@/components/Section';
import Text from '@/components/Text';
import TextBlock from '@/components/TextBlock';
import { getSectionSpacingProps, getSectionTheme } from '@/tools/helpers/section';
import { I{PascalCase}Section } from '@/tools/sanity/schema/sections/{camelCase}Section';
import styles from './styles.module.scss';
// Import other components as needed: Image, Link, Button from @/components/*

const {PascalCase}Section: FC<I{PascalCase}Section> = props => {
  const { /* destructure fields */ } = props;

  return (
    <Section name="{PascalCase}Section" theme={getSectionTheme(props, '{defaultTheme}')} {...getSectionSpacingProps(props)}>
      {/* Build component JSX based on fields and Figma design */}
      {/* Use Text with variant="heading" for headings (NOT a HeadingsContainer) */}
      {/* Use TextBlock for rich text / blockContent fields */}
      {/* Use alignment prop on Text/TextBlock for text alignment — never use text-align in SCSS */}
      {/* Use Image component for images */}
      {/* Use Link component for CTAs */}
    </Section>
  );
};

export default {PascalCase}Section;
```

**IMPORTANT:** Never hardcode the `theme` prop on the Section component. Always use `getSectionTheme(props, '{defaultTheme}')` to pull the theme from Sanity's `sectionFields.themeOptions.theme`, with a fallback default based on the Figma design. This lets content editors override the theme per-instance in the CMS while keeping a sensible default. Use the theme from the interactive prompting answers as the default (e.g., `'light'`, `'dark'`).

**Text alignment:** Use the `alignment` prop on `Text` and `TextBlock` components (`'left' | 'center' | 'right' | 'justify'`) — never write `text-align` in section SCSS. The component handles alignment styles via `ProjectTextAlignment`.

### 2b. Styles File

**File:** `sections/{PascalCase}Section/styles.module.scss`

If Figma design was analyzed, generate styles matching the design using:

- CSS custom properties from `tools/sass/global/_variables.scss` (e.g., `var(--color-primary-500)`, `var(--spacing-md)`)
- Media mixins co-located inside each selector:

  ```scss
  .container {
    display: flex;
    gap: 64px;

    @include media-down(tablet) {
      flex-direction: column;
      gap: 32px;
    }
  }
  ```

**All section styles MUST be wrapped in `@layer defaults { ... }`** — this is critical for CSS layer ordering.

If no Figma design, create a minimal scaffold:

```scss
@layer defaults {
  .section {
    // Add styles as needed
  }
}
```

### 2c. Thumbnail

**File:** `sections/{PascalCase}Section/thumbnail.png`

If a `--desktop=` Figma URL was provided, the thumbnail was already downloaded in Step 0e — verify it exists before continuing.

If **no** Figma URL was provided, copy the default thumbnail:

```bash
cp assets/templates/section-thumbnail.png sections/{PascalCase}Section/thumbnail.png
```

### 2d. GROQ Projection

**File:** `sections/{PascalCase}Section/queries.groq.ts`

```typescript
import { groq } from 'next-sanity';
// Import projections as needed:
// import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
// import imageProjection from '@/tools/sanity/projections/common/image.groq';
// import buttonProjection from '@/tools/sanity/projections/common/button.groq';
// import linkProjection from '@/tools/sanity/projections/common/link.groq';

const {camelCase}SectionProjection = groq`
  _type == '{camelCase}Section' => {
    // List all fields, applying sub-projections where needed:
    // title,
    // content[]${blockContentProjection},
    // image${imageProjection},
    // button${buttonProjection},
  },
`;

export default {camelCase}SectionProjection;
```

**Available sub-projections** (import from `@/tools/sanity/projections/common/`):

- `blockContent.groq` — for `blockContentSimple` / `blockContentStandard` / `blockContentAdvanced` fields (use with `[]` suffix: `content[]${blockContentProjection}`)
- `image.groq` — for `imageElementSimple` / `imageElementAdvanced` fields
- `button.groq` — for `buttonElement` fields
- `link.groq` — for `linkElement` fields
- `seoData.groq` — for SEO metadata

### 2e. Storybook Story File

**File:** `sections/{PascalCase}Section/{PascalCase}Section.stories.tsx`

Every section must ship with a Storybook story so it can be browsed in isolation and exercised by `/review-design`, `/review-code`, and the headless test runner.

The story uses `sectionFixture()` to prefer real Sanity data, falling back to a **design-faithful mock**. Once the section has a published instance in the dataset, `yarn storybook:fixtures` writes `tools/storybook/fixtures/{camelCase}Section.json` and the loader picks it up automatically — no story edit needed.

```typescript
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { I{PascalCase}Section } from '@/tools/sanity/schema/sections/{camelCase}Section';
import mockBlockContent from '@/tools/storybook/mockBlockContent';
import mockButton from '@/tools/storybook/mockButton';
import mockImage from '@/tools/storybook/mockImage';
import sectionFixture from '@/tools/storybook/sectionFixture';

import {PascalCase}Section from '.';

const meta = {
  title: 'Sections/{PascalCase}Section',
  component: {PascalCase}Section,
  tags: ['autodocs'],
  // Bind the story to its Figma node so the Design tab and /review-design can
  // compare against the right frame. Use the --desktop URL passed to /create-section.
  parameters: {
    design: { type: 'figma', url: '{desktop-figma-url}' }
  }
} satisfies Meta<typeof {PascalCase}Section>;

export default meta;

type Story = StoryObj<typeof meta>;

// Real Sanity data when present, design-faithful mock otherwise.
const data = sectionFixture<I{PascalCase}Section>('{camelCase}Section') ?? {
  // DESIGN-FAITHFUL mock — derive these from the Figma analysis (Step 0d), not
  // generic lorem-ipsum, so the FIRST /review-design is a true comparison:
  //  - use the actual visible copy from the design (title, tagline, button label)
  //  - match the design's item count (cards/logos/faqs)
  //  - match image aspect ratios to the design
  //  - toggle the same optional elements the design shows (addButton, etc.)
  tagline: 'Tagline',
  title: '<h2>Section title</h2>',
  content: mockBlockContent('md'),
  image: mockImage({ seed: '{camelCase}', width: 1200, height: 800, aspectRatio: '16-9' }),
  addButton: true,
  button: mockButton('Call to action')
};

export const Default: Story = {
  args: data
};

// Additional stories for meaningful variants (with/without optional fields,
// content-length variations, etc.) by spreading + overriding: { ...data, addButton: false }.
```

#### Why design-faithful mock matters

The first design review runs against the mock (no Sanity content exists yet). Computed-style checks (typography, colour, spacing, variants) are content-independent and valid regardless — but item counts, aspect ratios, and present/absent elements only compare correctly if the mock mirrors the design. Derive those from the Figma frame you already analysed in Step 0d.

#### Available mock helpers in `@/tools/storybook/`

| Helper                                                                         | Returns               | Use for                                                               |
| ------------------------------------------------------------------------------ | --------------------- | --------------------------------------------------------------------- |
| `sectionFixture(type)`                                                         | `T \| undefined`      | Real Sanity fixture for a section `_type` (undefined until generated) |
| `mockBlockContent(size)`                                                       | `SanityTextBlock[]`   | Rich-text body fields (`content`, `body`, `answer`)                   |
| `mockImage(options)`                                                           | `SanityImageAdvanced` | Image fields. Pass `{ seed, width, height, aspectRatio }`             |
| `mockLink(overrides)` / `mockExternalLink` / `mockPhoneLink` / `mockEmailLink` | `ILinkElement`        | Link fields                                                           |
| `mockButton(label, link)`                                                      | `IButtonElement`      | Button fields                                                         |
| `mockSectionFields(options)`                                                   | `SectionFieldsShape`  | When you need a specific theme or spacing override on `sectionFields` |

The fixture generator (`tools/storybook/generate-fixtures.ts`) reuses the app's `sectionsProjection`, so a new section's images dereference automatically once its `queries.groq.ts` projection uses `imageProjection` (Step 2d) — there's no separate generator query to update.

#### Conventions

- Title is always `Sections/{PascalCase}Section`
- Always set `parameters.design` to the section's Figma node (the `--desktop` URL) — `/review-design` reads it and flags stories that lack it
- The `title` field uses Sanity's rich-text TitleInput, so pass HTML-style strings like `'<h2>...</h2>'`
- Use `satisfies Meta<typeof Section>` so Story args are correctly inferred
- Mock data should match the GROQ projection output field-for-field — if the projection produces `{ cards: [{ title, content, image, addButton, button }] }`, the mock must compose that exact shape

---

## Step 3: Register the Section

Make these additions to 4 existing files:

### 3a. Schema Registry

**File:** `tools/sanity/schema/index.ts`

1. Add import at the top with other section imports:

   ```typescript
   import {camelCase}Section from './sections/{camelCase}Section';
   ```

   If the schema exports sub-types (like `gridCard`), use destructured import:

   ```typescript
   import { {camelCase}Section, {subTypeName} } from './sections/{camelCase}Section';
   ```

2. Add to the schema array in the `// Sections` block (alphabetical order):
   ```typescript
   {camelCase}Section,
   ```
   Add any sub-types to the `// Objects` block.

### 3b. Page Sections List

**File:** `tools/sanity/helpers/sections.ts`

Add to the `pageSections` array (alphabetical order):

```typescript
{ type: '{camelCase}Section' },
```

### 3c. Component Exports

**File:** `sections/index.ts`

Add export (alphabetical order):

```typescript
export { default as {PascalCase}Section } from './{PascalCase}Section';
```

### 3d. GROQ Sections Projection

**File:** `tools/sanity/projections/common/sections.groq.ts`

1. Add import at the top:

   ```typescript
   import {camelCase}SectionProjection from '@/sections/{PascalCase}Section/queries.groq';
   ```

2. Add projection inside the `sectionsProjection` template literal (alphabetical order):
   ```typescript
   ${{{camelCase}SectionProjection}}
   ```

---

## Step 4: Verify

Run `/check` to lint, format, and type-check the project. Fix any errors before completing.

---

## Summary

After completion, inform the user:

- List all files created
- List all files modified
- Remind them to run `yarn dev` and check `/studio` to see the new section in the page builder
- If default thumbnail was used, suggest replacing it with a real screenshot later
- List any placeholder elements that were left for manual implementation
- **Prompt the user to run `/review-design {PascalCase}Section`** as the next step to compare the built section against the Figma design
