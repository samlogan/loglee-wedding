# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands

```bash
# Development
yarn dev                  # Start Next.js dev server (localhost:3000) and Sanity Studio (localhost:3000/studio)

# Build & Production
yarn build               # Build for production
yarn start               # Start production server
yarn clean               # Remove .next build cache

# Code Quality
yarn lint                # Run Ultracite (oxlint + oxfmt) check
yarn lint:fix            # Auto-fix lint + formatting issues
yarn check               # Alias for ultracite check
yarn fix                 # Alias for ultracite fix
yarn ts:check            # TypeScript type checking (no emit)
yarn ts:watch            # TypeScript watch mode

# Storybook
yarn storybook           # Start Storybook dev server (localhost:6006) — browse every component and section in isolation
yarn storybook:build     # Build static Storybook site (outputs to storybook-static/)
yarn storybook:fixtures  # Regenerate fixtures + globals from the Sanity dataset (tsx + the app's projections)

# Tests — two Vitest projects
yarn test                # Both: the unit suite plus every story as a browser component test
yarn test:watch          # Watch mode
yarn test:unit           # Pure logic only, no browser — well under a second
yarn test:stories        # Every story as a component test in headless chromium

# Section registrations — generated from the contents of sections/, never hand-edited
yarn sections:register   # rewrite all four registration files
yarn sections:check      # verify only; exits 1 on drift

# Audits — CLI only. These print verdicts; the Storybook pages deliberately do not.
yarn audit:groups        # Story sidebar taxonomy. Hard-blocks /commit and /pr
yarn audit:sections      # Placeable vs rendered vs projected vs used, per section type
yarn audit:layout        # Which spacing steps / container widths sections use; dead spacing props
yarn audit:projections   # GROQ weight each section adds to every page query
```

### Running Tests & Validation

Before committing changes, always run:

```bash
yarn fix && yarn ts:check
```

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 16 with App Router (Turbopack bundler)
- **CMS**: Sanity v5 (Studio at `/studio`)
- **Styling**: SCSS modules with global resources via `tools/sass/base/resources.scss`
- **Animations**: Motion (Framer Motion)
- **Carousel**: Embla Carousel
- **Forms**: React Hook Form
- **Media**: React Player
- **Component workshop**: Storybook 10 (`@storybook/nextjs-vite`) — renders every component/section in isolation
- **Testing**: Vitest 4 with two projects — `unit` (node, pure logic in `tools/`) and `storybook` (`@storybook/addon-vitest`, every story run as a component test in headless chromium via Playwright)
- **Browser automation**: Playwright, driven directly through the `mcp__playwright__*` tools by `/review-design`, `/review-code` and `design-visual-comparer`
- **Package Manager**: Yarn v4.1.1
- **TypeScript**: Strict mode enabled (target ES2017)
- **React**: v19. React Compiler patterns are a convention here, not a lint gate — see Code Style below
- **Linting**: Ultracite with oxlint + oxfmt (`.oxlintrc.json`, `.oxfmtrc.jsonc`) — replaces ESLint + Prettier

### Project Structure

#### Core Routing (`/app`)

- **Dynamic Routes**: `[...slug]/page.tsx` handles all CMS pages via Sanity
- **API Routes**: `/api/*` for draft mode, revalidation, and Sanity operations
- **Blog**: `/blog/*` for blog-specific pages

#### Key Directories

- **`/components`**: Reusable UI components
- **`/sections`**: Page section components for dynamic page builder
- **`/templates`**: Page templates that render sections
- **`/tools`**: Core utilities and helpers
  - `/sanity`: Sanity client, queries, and helpers
  - `/helpers`: Utility functions (dates, strings, classNames, etc.)
  - `/hooks`: Custom React hooks
  - `/sass`: Global SCSS resources and mixins
  - `/types`: TypeScript type definitions

#### Configuration (`/config`)

- `metadata.ts`: Default SEO metadata
- `fonts.ts`: Font configurations
- `website.ts`: Site-wide settings
- `redirects.ts` & `rewrites.ts`: URL management

### Available Components

All in `/components`:

- **`Section`**: Wrapper for all sections. Props: `name`, `theme` (light/dark/primary/secondary/tertiary), `spacing`, `removeTopSpacing`, `removeBottomSpacing`, `full`
- **`Container`**: Content width wrapper
- **`Text`**: Typography component. Props: `text`, `as` (element tag), `variant` ("heading"/"body"), `size`, `weight`, `color`, `textTransform`
- **`TextBlock`**: Renders Sanity `blockContent` rich text. Props: `blocks`, `className`
- **`TextTitle`**: Rich text title renderer
- **`Heading`**: Heading component
- **`Image`**: Sanity image renderer. Props: spread from image projection, `aspectRatio`
- **`Button`** / **`Link`**: one appearance surface, shared via `components/Button/appearance.tsx`. Four orthogonal axes — `theme` (`primary`/`secondary`/`accent`), `variant` (`pill`/`rounded`/`ui`/`square`/`bare`/`content`), `size` (`sm`/`md`/`lg`), `outline` — plus `mono`, `arrow`, `fullWidth`, `fullWidthMobile`. `Link` also spreads from the link projection. Omitting all of `theme`/`size`/`variant` is a deliberate seventh appearance that many call sites rely on; it is not the same as `variant="bare"`. Three pairs do not legally combine and are closed in CSS rather than in the types: `bare`+`outline`, `content`+`size`, `outline` without `theme`. Note `variant="content"` renders `inline` on `Link` but `inline-block` on `Button` — CSS blockifies `<button>` and no rule changes that.
- **`Icon`**: Icon component
- **`Accordion`**: Expandable content panels
- **`Animation`**: Motion-powered animation wrapper
- **`Avatar`**: User/author avatar
- **`Breadcrumbs`**: Navigation breadcrumbs
- **`Card`**: Compound card component (Card.Image, Card.Content)
- **`Carousel`**: Embla-powered carousel
- **`Field`**: Form field component
- **`Form`**: Form container
- **`Footer`**: Site footer
- **`Header`**: Site header
- **`Logo`**: Logo component
- **`Map`**: Map embed
- **`Modal`**: Modal/dialog
- **`Navigation`**: Navigation menu
- **`Socials`**: Social links
- **`SocialsShare`**: Social share buttons
- **`Video`**: Video player (React Player)
- **`ThemeProvider`**: Theme context provider
- **`Layout`**: Page layout wrapper
- **`JsonLd`**: Structured data components (JsonLdPage, JsonLdArticle)
- **`Scripts`**: Third-party script management
- **`VisualEditing`**: Sanity visual editing overlay
- **`AccessibilityMenu`**: Accessibility controls
- **`AaCSSLayerDefinitions`**: CSS layer order definitions
- **`Sections`**: Dynamic section renderer
- **`WmAscii`**: ASCII art branding

### Sanity Integration

#### Key Concepts

- **Client**: Configured in `tools/sanity/client.ts`
- **Queries**: GROQ queries in `tools/sanity/lib/queries.groq`
- **Fetch**: `sanityFetch` utility with caching and revalidation
- **Draft Mode**: Supports preview via `/api/draft` (Studio Presentation tool manages exit)
- **Revalidation**: On-demand via `/api/revalidate` webhook

#### Sanity Schema Patterns

Common schema helpers (all in `tools/sanity/schema/common/`):

- **`defaultSectionGroups`**: Standard field groups — Data, Styles, Internal (with icons)
- **`internalLabelField`**: Reusable field for admin-facing section labels
- **`sectionFields`**: Spacing options (`removeTopSpacing`, `removeBottomSpacing`)

Element types (all in `tools/sanity/schema/elements/`):

- **`button`**: Button element (label + link)
- **`image`**: Image element (simple + advanced)
- **`link`**: Link element (internal/external/phone/email/action)
- **`icon`**: Icon element
- **`slug`**: Slug element
- **`title`**: Title element (rich text)

Other patterns:

- **`ReadOnlyImageInput`**: Component at `tools/sanity/components/ReadOnlyImageInput` — displays section thumbnail in Studio
- **`stripTitleTags`**: Helper at `tools/sanity/helpers/stripTitleTags` — strips h1-h6/span tags from rich text for preview titles
- Schema definitions use `defineType` from `sanity` (not `defineField`)
- Icons come from `react-icons/tb` (Tabler Icons)

#### Available GROQ Projections

Sub-projections in `tools/sanity/projections/common/`:

- **`blockContent.groq`**: Rich text blocks — use with `[]` suffix: `content[]${blockContentProjection}`
- **`button.groq`**: Button with label + link
- **`image.groq`**: Image with asset metadata, crop, hotspot, altText, aspectRatio
- **`link.groq`**: Link (internal/external/phone/email/action types)
- **`seoData.groq`**: SEO metadata with openGraphImage
- **`sections.groq`**: All section projections combined

All projections use `groq` from `next-sanity`.

#### Dynamic Page Rendering

Pages are rendered through:

1. `[...slug]/page.tsx` fetches document by pathname
2. Determines document type (currently 'page')
3. Renders appropriate template (e.g., `PageTemplate`)
4. Template renders dynamic sections from CMS

### Section Architecture

Each section consists of **5 files**. The four registrations are generated — see below.

#### Section Files

| File      | Path                                                           | Purpose                                               |
| --------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| Schema    | `tools/sanity/schema/sections/{camelCase}Section.ts`           | Sanity type definition + TypeScript interface         |
| Component | `sections/{PascalCase}Section/index.tsx`                       | React component                                       |
| Styles    | `sections/{PascalCase}Section/styles.module.scss`              | SCSS module                                           |
| Query     | `sections/{PascalCase}Section/queries.groq.ts`                 | GROQ projection                                       |
| Story     | `sections/{PascalCase}Section/{PascalCase}Section.stories.tsx` | Storybook story (mock-data shaped to the GROQ output) |
| Thumbnail | `sections/{PascalCase}Section/thumbnail.png`                   | Preview image for Studio                              |

#### Registration — generated, never hand-edited

```bash
yarn sections:register          # rewrite all four from the contents of sections/
yarn sections:check             # verify without writing; exits 1 on drift
```

`tools/sanity/register-sections.ts` derives every name from the folder (`TwoColumnListSection` →
`twoColumnListSection`) and writes:

| File                                               | Scope                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| `sections/index.ts`                                | whole file — component barrel                                               |
| `tools/sanity/helpers/sections.ts`                 | whole file — `pageSections` placement list                                  |
| `tools/sanity/schema/index.ts`                     | the `// #region section-imports` and `// #region section-types` spans       |
| `tools/sanity/projections/common/sections.groq.ts` | the `// #region section-imports` and `// #region section-projections` spans |

The two partially-generated files keep hand-written content outside their sentinels. Note the
projection's markers sit **outside** the `groq` template literal — everything between those backticks
is sent to the Sanity API, so a marker inside would be query weight that `yarn audit:projections`
counts.

Three reasons this is generated rather than transcribed:

- Every half-registration fails **silently** in a different way (`registration.test.ts` enumerates
  them). All four are pure functions of the folder name, so writing them by hand is transcription.
- The four files are short, alphabetically sorted lists, which is why parallel section branches
  always conflict in them — git's three-line merge context makes any two insertions overlap. Because
  they are derivable, regenerating _is_ the resolution; `/batch-tickets --parallel` does exactly that
  in its merge train.
- The output stays **committed**, not gitignored, because `audit-sections.ts`, `audit-projections.ts`
  and `generate-fixtures.ts` import these modules and run under `tsx` — esbuild-on-Node with no
  bundler. An `import.meta.glob` barrel (supported by both Turbopack and Vite) would break all three,
  including the `story-fixture-checker` pass inside `/commit` and `/pr`.

Sub-types exported alongside a section (`export { gridSection, gridCard }`) are **not** derivable.
The generator warns about them; register them in the `// Objects` block by hand, or better, move them
to `tools/sanity/schema/objects/`.

`yarn test:unit` checks both directions — everything registered has its files, and every folder in
`sections/` is registered.

#### Naming Convention

For a section called "Testimonial":

- Schema type: `testimonialSection` (camelCase)
- Schema file: `testimonialSection.ts`
- Component folder: `TestimonialSection` (PascalCase)
- Interface: `ITestimonialSection`
- Projection: `testimonialSectionProjection`

Use `/create-section` to scaffold a new section automatically.

### Storybook

Storybook is the canonical render environment for every component and section. The dev server at `http://localhost:6006` powers local browsing, and Playwright drives the headless flows behind `/review-design`, `/review-code`, and the `design-visual-comparer` agent.

**Every story is also a test.** `@storybook/addon-vitest` runs each one as a component test in a real browser — mounting it, running its `play` function if it has one, and failing on a render error or an unhandled rejection. That is the same sweep those review commands do by hand, run automatically. A real browser rather than jsdom is deliberate: this design system is largely _layout_, and jsdom has no layout engine, so `getComputedStyle` there cannot tell you a spacing token resolved to `0px`. Writing a story is therefore how you add a component test — there is no separate `Button.test.tsx`, and `test-freshness-checker` will never ask for one.

#### Config

- `.storybook/main.ts` — `@storybook/nextjs-vite` framework with `image.excludeFiles: ['**/*.svg']` so SVGs import as React components via `vite-plugin-svgr` (matching the Turbopack SVGR rule, not as `next/image` objects). Mirrors the tsconfig path aliases and auto-imports `tools/sass/base/resources.scss` into every SCSS module via Vite's `css.preprocessorOptions.scss.additionalData`. Addons: `addon-a11y`, `addon-themes`, `addon-docs`, `addon-designs`.
- `.storybook/preview.tsx` — imports the `AaCSSLayerDefinitions` SCSS module first (to establish the `@layer` order) followed by `tools/sass/global/styles.scss`; applies the `next/font` classes to `<body>`; registers `withThemeByDataAttribute` with all five themes (`light`/`dark`/`primary`/`secondary`/`tertiary`) on `body[data-theme]`; and injects the toolbar theme into `sectionFields` for `Sections/*` stories so the toolbar drives section theming.

#### Stories

- Every component has a `components/{Name}/{Name}.stories.tsx`; every section a `sections/{Name}Section/{Name}Section.stories.tsx`
- Use `Meta` and `StoryObj` from `@storybook/nextjs-vite` and tag with `tags: ['autodocs']` for free docs pages
- One story per union-prop literal (theme, variant, size, etc.); one per truthy boolean prop
- Bind the story to its Figma node via `parameters.design = { type: 'figma', url }` (addon-designs). `/create-*` writes it from the `--desktop` URL. It's **optional** — primitives without a single frame can omit it
- Section stories prefer real Sanity data via the loader, falling back to mock: `args: sectionFixture<I…>('…Section') ?? mockArgs`
- `/create-component` and `/create-section` emit a story file by default — keep them in sync as you edit the source

#### Fixtures from Sanity (`tools/storybook/fixtures/`)

Section stories prefer **real data pulled from the Sanity dataset** over hand-written mocks. This is required for images: `useNextSanityImage` only resolves real Sanity assets (with `_id`/`url`/`metadata`), so fabricated image objects render the fallback.

The generator makes **two passes**. Sections come from the app's own `sectionsProjection`; the
site-wide singletons (header, footer, socials) come from the app's own query constants and land in
`fixtures/globals.json`, read via `globalFixture<T>(name)`. Anything standing in for a fetching
component should read `globalFixture`, with a shaped constant only as a fallback — a mock that
hardcodes its content is invisible drift by construction. Note the limit: a GROQ projection returns a
_shaped object with null leaves_ when the parent document exists but its fields are blank, and that
object is not nullish, so `globalFixture(…) ?? FALLBACK` will not fire for it.

Exit codes carry meaning **in the default, non-strict mode**: **0** completed (or dataset
unreachable, committed fixtures kept), **1** drift — and only drift, always with quotable `DRIFT:`
lines, **2** the environment is misconfigured (no `projectId`/`dataset`) and there are no `DRIFT:`
lines.

`--strict` reuses **1** for an unreachable dataset, with no `DRIFT:` line. That is fine for scheduled
automation, which wants any failure to be loud — but it means **anything parsing the exit code as
drift must run without `--strict`**. The `story-fixture-checker` agent never passes it, for exactly
that reason.

- **Generate / refresh:** `yarn storybook:fixtures` — runs `tools/storybook/generate-fixtures.ts` (via `tsx`) against the dataset in `.env.development`. It **reuses the app's `sectionsProjection`**, so fixtures match the production shape and there is no per-section query to maintain — a new section is picked up automatically once it has a component + published content. Writes `tools/storybook/fixtures/<type>.json` + a generated `index.ts` barrel. Best-effort: keeps the committed fixtures if the dataset is unreachable (pass `--strict` to fail hard). The fixtures dir is excluded from the formatter (`.prettierignore`).
- **Use in a story** via the safe loader (returns `undefined` if no fixture exists yet, so a not-yet-in-Sanity section falls back to mock instead of breaking the build):
  ```tsx
  import sectionFixture from '@/tools/storybook/sectionFixture';
  const data =
    sectionFixture<ILogosSection>('logosSection') ??
    {
      /* design-faithful mock */
    };
  export const Default: Story = { args: data };
  ```
  Spread + override for controlled variants: `args: { ...data, addButton: false }`.
- **Freshness — self-healing, no manual step in the normal flow:**
  - On-demand: `yarn storybook:fixtures` whenever you add section content.
  - Automatic: the `story-fixture-checker` agent runs during `/commit` (Step 2.6) and `/pr` (Step 1c) — scoped to changes touching `sections/`/stories/fixtures, best-effort, non-blocking. It regenerates and stages refreshed fixtures so they self-heal as part of the flow.
  - There is **no** `prestorybook:build` hook (Storybook isn't built in CI today). For zero-touch refresh independent of code work, add a scheduled GitHub Action running `yarn storybook:fixtures --strict`.

#### Story grouping and its guard

Titles group by **what a thing is**, not where its folder sits. Each group is a question answerable
yes or no, which is what stops the taxonomy drifting:

| Group          | Does it…                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------- |
| `Foundations/` | have no domain meaning and no content of its own — a primitive, or structural infrastructure |
| `Content/`     | render editorial copy that came from the CMS                                                 |
| `Surfaces/`    | present or disclose other content                                                            |
| `Navigation/`  | help someone get somewhere, including site chrome and assistive affordances                  |
| `Forms/`       | collect input                                                                                |
| `Sections/`    | a page-builder section                                                                       |

There is no `Components/` group — "it lives in `components/`" is not a question about what a thing
is. `Data` (owns a data dependency) and `Feedback` (loading, toast, status) are absent because there
are no members yet; add them back with the same test-per-group shape when there is a real one.

Sections are `Sections/{Human Readable}` — the PascalCase folder split into words with the trailing
`Section` dropped and acronyms uppercased, so `ClosingCtaSection` → `Sections/Closing CTA`.

**The `Sections/` prefix is a contract, not a label.** `tools/storybook/sectionStory.tsx` gates the
theme decorator, the error boundary and the full-width docs preview on
`title.startsWith('Sections/')`, so renaming the group silently disables all three at runtime.
`yarn audit:groups` enforces it and `/commit` and `/pr` hard-block on it. The guard is deliberately
dumb — an allow-list comparison, not a judgement about whether a component is in the _right_ group —
and **fails closed**: a story file whose title it cannot parse is reported, not skipped.

Because titles are grouped, **a story ID is no longer derivable from a folder name**. Look IDs up in
`http://localhost:6006/index.json`: `FaqSection` is `Sections/FAQ` → `sections-faq--default`, and
`Form` exists twice (`Forms/Form` and `Sections/Form`).

#### Design system documentation pages (`tools/storybook/docs/`)

Four MDX pages under `Foundations/Design System/`: **Colour**, **Typography**, **Layout**. Token
names, values _and the theme list_ come from the CSSOM and `getComputedStyle` on a probe element, so
the pages show what the browser resolved — `var()` chains followed, theme cascade applied. Adding a
token or a whole theme shows up on the next build with no list to update. The shared reader is
`tools/storybook/tokens.ts`; two things in it are easy to get subtly wrong and are commented there
(the CSSOM walk must **visit and recurse**, and the theme selector must be matched with a regex
rather than a substring test).

**The Storybook is client-facing. These pages describe the system; they do not report findings.** No
completeness score, no contrast pass/fail, no "never used" flags, no cull list. Audit verdicts belong
in the CLI output of the `yarn audit:*` scripts. The same rule applies to autodocs prose on shared
components. Keep this split or the pages drift back.

`Foundations/Section` and `Foundations/Container` **measure** rather than show, because neither
primitive has an appearance of its own — every number is read off the DOM at the current viewport and
re-read on resize (`tools/storybook/measure.tsx`). That matters: spacing classes are built
dynamically, so a typo'd token yields silently zero padding, and a hand-written table would report
the value the author intended rather than the one the browser applied.

#### Which agent owns what

Say this out loud because the two blur otherwise:

- **`story-freshness-checker`** — _does a story exist, and does it match the component's props?_
- **`story-fixture-checker`** — _is the Sanity data current?_ It owns both passes, sections and
  globals. Data staleness is never the freshness checker's job.

Two shell-level traps, both of which silently made a gate pass on every branch before they were
fixed. The file-list command is duplicated in `commit.md`, `pr.md` and the agent file and **must stay
byte-identical**:

- `git status --porcelain` prefixes every path with two status columns and a space, so a `^`-anchored
  regex matches **nothing**. Build the list from `git diff --name-only` plus
  `git ls-files --others --exclude-standard`.
- `--diff-filter=AM` excludes rename entries, so a renamed `index.tsx` never reaches the checker. Add
  `--no-renames`, which splits a rename into a delete plus an add.

The fixture-checker's scope list is likewise duplicated between the agent and its callers. It
includes `components/**`, not just `sections/**`: `mockImage` draws from the section fixtures, so
component stories with images depend on them, and mocks standing in for fetching components read
`globals.json`.

#### Design reviews on new sections

`/create-section --desktop=<figma>` generates **design-faithful** mock args (real copy, item counts, aspect ratios from the Figma analysis) and writes `parameters.design`. So the first `/review-design` — run before any CMS content exists, against the mock — is a true comparison. Once content is published, the loader swaps in the real fixture. `/review-design` reads `parameters.design.url` and degrades gracefully: full visual+measurement review when a design is bound, token/compliance + a11y review when not.

#### Mock data helpers (`tools/storybook/`)

For **components** (and any section variant needing controlled inputs), use the mock helpers to compose GROQ-projection-shaped data:

| Helper                                                                         | Returns               | Use for                                                               |
| ------------------------------------------------------------------------------ | --------------------- | --------------------------------------------------------------------- |
| `mockBlockContent(size)`                                                       | `SanityTextBlock[]`   | Rich-text body fields (`content`, `body`, `answer`)                   |
| `mockImage(options)`                                                           | `SanityImageAdvanced` | Image fields (component stories — uses a placeholder URL)             |
| `mockLink(overrides)` / `mockExternalLink` / `mockPhoneLink` / `mockEmailLink` | `ILinkElement`        | Link fields                                                           |
| `mockButton(label, link)`                                                      | `IButtonElement`      | Button fields                                                         |
| `mockSectionFields(options)`                                                   | `SectionFieldsShape`  | When you need a specific theme or spacing override on `sectionFields` |

#### Driving Storybook headlessly

`/review-design`, `/review-code`, and the `design-visual-comparer` agent render the target story via Playwright (the `mcp__playwright__*` tools) — no dev server, no temp page.

- **Story ID**: `{kebab-case-title}--{kebab-case-export}`. For `meta.title = 'Foundations/Button'` and `export const PrimaryRounded`, the ID is `foundations-button--primary-rounded`. **Always look the ID up in `http://localhost:6006/index.json` rather than deriving it from a folder name** — titles group by what a thing _is_, so `FaqSection` is `Sections/FAQ` → `sections-faq--default`, and `Form` exists twice (`Forms/Form` and `Sections/Form`).
- **Iframe URL** (renders one story, no Storybook chrome): `http://localhost:6006/iframe.html?id={story-id}&viewMode=story`. Append `&globals=theme:dark` (or `primary`/`secondary`/`tertiary`) to switch themes via the decorator.
- **Auto-start**: before any browser op, ensure Storybook is up:
  ```bash
  if ! lsof -i:6006 >/dev/null 2>&1; then
    yarn storybook > /tmp/storybook.log 2>&1 &
    until curl -s -o /dev/null http://localhost:6006/iframe.html; do sleep 1; done
  fi
  ```
  The `/batch-*` orchestrators start it once at the top of the run and reuse it.

#### Known limitations

- `mockImage` draws from **real Sanity assets** in the committed fixtures, ranked by aspect ratio and picked deterministically from a seed, so a component story exercises the same resolution path as production. Pass `kind: 'logo'` for marks (badges, partner logos, brand icons) — the default `photo` pool would otherwise put a photograph of a person where a badge belongs. A fabricated image object always falls back: `useNextSanityImage` needs a real asset reference.
- `assets/images/fallback.png` is aliased **for Storybook only** to a visible grey block. The shipped 1×1 transparent PNG is right in production — a broken image should occupy nothing — and useless in Storybook, where it is indistinguishable from a component that renders no image. If a reviewer sees grey, the image genuinely failed to resolve.
- A section fixture is only generated for section types that have a published instance in the dataset. Sections with no dataset content (e.g. `FormSection`) keep mock-based stories.

### SCSS Patterns

#### CSS Layers

All component styles use CSS layers: `@layer defaults { ... }`. The layer order is defined by `AaCSSLayerDefinitions`.

#### Class Naming

Lowercase base class (`.button`, `.card`), underscore-separated modifiers (`.theme_primary`, `.variant_pill`, `.size_md`).

#### Media Mixins

Defined in `tools/sass/base/__media.scss`. Always co-locate responsive styles inside each selector:

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

Named breakpoints:

| Name            | Value  |
| --------------- | ------ |
| `small-mobile`  | 340px  |
| `mobile`        | 400px  |
| `large-mobile`  | 500px  |
| `small-tablet`  | 660px  |
| `tablet`        | 769px  |
| `medium-tablet` | 900px  |
| `large-tablet`  | 1025px |
| `small-desktop` | 1260px |
| `desktop`       | 1340px |
| `large-desktop` | 1600px |
| `giant`         | 2200px |

Available mixins: `media-up($bp)`, `media-down($bp)`, `media-between($min, $max)`

#### CSS Custom Properties

Defined in `tools/sass/global/_variables.scss`:

- **Base colors**: three ramps, each `25`–`900` — `var(--stone-500)` (warm neutral base), `var(--pine-500)` (brand green), `var(--signal-300)` (bright accent, reserved for interactive states) — plus `var(--shades-black)`, `var(--shades-white)` and the `var(--system-*)` ramps. Prefer the theme-aware tokens below; no component currently references a primitive directly.
- **Theme-aware** (change with `[data-theme]`): `var(--bg-default)`, `var(--bg-accent)`, `var(--bg-raised)`, `var(--fg-default)`, `var(--fg-muted)`, `var(--fg-subtle)`, `var(--fg-link)`, `var(--fg-icon)`, `var(--fg-accent)`, `var(--stroke-cards)`, `var(--stroke-divider)`. **Two themes only** — `light` and `dark`.
- **Type scale** (fluid): `var(--display-lg)`, `var(--display-md)`, `var(--heading-2xl)` … `var(--heading-xs)`, `var(--body-2xl)` … `var(--body-xs)`, plus `var(--body-2xs)` and the `var(--body-lede)` / `var(--body-lede-line-height)` pair. **There are no `-mobile` variants** — each token is a single `clamp()` covering the whole viewport range. Set type through `Text`'s `variant` + `size` props, never a raw `font-size`.
  - `--body-2xs` is the step **below** the body scale's floor — the mono micro-label size (times, chips, eyebrows, stat labels). It has no `Text` `size` value because `Text` has no `mono` variant yet; consume it directly and comment why.
  - `--body-lede` is a **fluid px pair**, not a unitless ratio, because the lede's leading ramps 1.40 → 1.35 as its size ramps. A unitless `line-height` cannot express that.
- **Section spacing** (fluid): `var(--section-spacing-xs)`, `var(--section-spacing-sm)`, `var(--section-spacing-md)`, `var(--section-spacing-lg)`, `var(--section-spacing-xl)` — one token per step, no `-desktop` / `-mobile` pair.
- **Component spacing**: `var(--spacing-xxs)` … `var(--spacing-3xl)`. Fixed up to `lg` (24px); `xl` and above are fluid.
- **Button tokens**: three colour pairs — `var(--button-primary-*)`, `var(--button-secondary-*)`, `var(--button-accent-*)` — each with `bg`/`fg` plus `-hover`, `-active`, `-disabled` and a `focus-ring`. Outline styling is derived from theme fill colors in SCSS, with one documented exception: `accent`'s outline borrows `--fg-default`, because signal/300 is invisible as text on either theme's surface. Button sizing is fluid in font size and horizontal padding and fixed in vertical padding, so a control's height tracks the viewport without dropping below the 44px tap target.
- **Container widths**: `var(--container-xs)` (640px), `var(--container-sm)` (768px), `var(--container-md)` (1024px), `var(--container-lg)` (1280px), `var(--container-xl)` (1440px). Fixed — these are caps. Use the `Container` component `width` prop instead of manual `max-width` where possible.
- **System colors**: `var(--system-error-500)`, `var(--system-success-500)`, `var(--system-warning-500)`

#### Fluid Sizing

`tools/sass/base/__fluid.scss` defines `fluid($narrow-px, $wide-px)`, which emits a `rem`-based `clamp()` interpolating between the two anchors across a single pair of viewport anchors (375px → 1440px, i.e. `--container-xl`) shared by every token. Every type, section-spacing and large-gap token in `_variables.scss` is derived through it — **do not hand-write a `clamp()`**, and do not add a `media-up()` font-size or section-padding override: the token already covers the whole range, and a breakpoint reintroduces the jump the fluid scale removed.

#### Sass Module Syntax

Uses `@use 'sass:map'` module syntax (not global built-ins like `map-get()`). Use `map.get()` instead.

#### Auto-Imported Resources

`resources.scss` is auto-imported globally — no `@import` or `@use` needed for media mixins or Sass variables.

### Component Conventions

- **Arrow function** components: `const Button = (props: ButtonProps) => { ... }` — NOT `function` declarations
- **Do NOT use `FC<>`** for reusable components — `FC<>` is reserved for section components only
- **Props interface** exported from the component file: `export interface ButtonProps { ... }`
- **Always include** `className?: string` prop
- **Default values via destructuring**: `const { theme, disabled = false, size = 'md' } = props`
- **classNames helper** from `@/helpers/classNames` — always imported, always used for class composition
- **Dynamic SCSS module keys** for variants: `styles[\`variant*${variant}\`]`, `styles[\`theme*${theme}\`]`
- **Import order**: `'use client'` (if needed) → React imports → Next.js imports → Component imports → Helper/utility imports → Type imports → SCSS module (always last)
- **Default export**: `export default ComponentName`
- **Server components by default** — only add `'use client'` when hooks or event handlers are needed

### Path Aliases

```typescript
@/*              // Project root
@/helpers/*      // tools/helpers
@/hooks/*        // tools/hooks
@/sanity         // tools/sanity
@/projections/*  // tools/sanity/projections
@/sass/*         // tools/sass
@/types/*        // types
@/assets/*       // assets
@/config/*       // config
```

### Code Style

- **Linting & Formatting**: Ultracite with oxlint + oxfmt — config in `.oxlintrc.json` and `.oxfmtrc.jsonc`
- **Formatting**: 120 char width, single quotes, no trailing commas (configured in `.oxfmtrc.jsonc`)
- **Components**: One prop per line when multiline
- **SCSS**: Auto-imports `resources.scss` globally, all styles in `@layer defaults`
- **React Compiler conventions**: avoid setState in effects, use lazy initializers/useRef/useSyncExternalStore. **Not enforced by the linter** — `.oxlintrc.json` extends only ultracite's `core` and `next` configs, whose plugin lists are `[eslint, typescript, unicorn, oxc, import, jsdoc, node, promise]` and `[nextjs]`. No `react` plugin is enabled, and oxlint ships no React Compiler rules at all, so `yarn lint` cannot see a setState-in-effect or a stale dependency array. Uphold it by review, and note that an `// eslint-disable-next-line react-hooks/*` comment suppresses nothing here. Enabling the `react` plugin wholesale is not a drop-in: measured on a sibling project it surfaces ~2,600 errors, most of them `react-in-jsx-scope`, which is obsolete under the React 19 JSX transform.

### Environment Variables

Required in `.env.development` (see `.env.template` for full list):

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SANITY_PROJECT_NAME`
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `SANITY_API_READ_TOKEN`
- `SANITY_WEBHOOK_SECRET`

Optional:

- `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID` — GTM container ID
- `LINEAR_TEAM_ID` / `LINEAR_PROJECT_ID` — Linear integration for slash commands

### Slash Commands

Available in `.claude/commands/`:

| Command                   | Description                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/branch`                 | Create a Gitflow branch with optional Linear issue                                                                                     |
| `/create-component`       | Scaffold a new reusable UI component                                                                                                   |
| `/create-section`         | Scaffold a new Sanity section (5 files incl. story + 4 regs)                                                                           |
| `/batch-tickets`          | Autonomous pipeline: generate manifest from Linear + action all tickets (sections, components, or other), one at a time                |
| `/batch-parallel`         | Same, run concurrently in git worktrees — shared-surface pre-pass, parallel build, serial integration train, closing sweep. Unattended |
| `/project-brief`          | Generate Linear milestones and tickets from a proposal                                                                                 |
| `/project-setup`          | Replace placeholders with project branding                                                                                             |
| `/commit`                 | Commit changes with conventional messages                                                                                              |
| `/pr`                     | Create a PR with auto-generated description                                                                                            |
| `/check`                  | Run lint, format, and type checks                                                                                                      |
| `/update-docs`            | Update CLAUDE.md and README.md                                                                                                         |
| `/audit-a11y`             | Accessibility audit on a component/section                                                                                             |
| `/audit-code-quality`     | Code quality / reusability audit                                                                                                       |
| `/audit-content`          | CMS content audit                                                                                                                      |
| `/audit-psi`              | PageSpeed Insights audit (performance, a11y, best practices, SEO)                                                                      |
| `/audit-redirects`        | Redirect audit                                                                                                                         |
| `/audit-schema`           | Sanity schema audit                                                                                                                    |
| `/design-system-import`   | Import design tokens from Figma or JSON into SCSS                                                                                      |
| `/design-system-export`   | Export SCSS tokens to DTCG JSON + Figma format                                                                                         |
| `/sanity-create`          | Create/update a Sanity page from Figma design                                                                                          |
| `/review-design`          | Compare section or component against Figma design                                                                                      |
| `/review-code`            | Code quality, accessibility, and browser review — one target, in isolation                                                             |
| `/consolidate`            | Cross-cutting DRY pass over several targets at once; extracts shared patterns, opens a PR without merging                              |
| `/ticket`                 | Fetch or create a Linear ticket and action it                                                                                          |
| `/checklist-pre-handover` | Pre-handover checklist                                                                                                                 |
| `/checklist-pre-launch`   | Pre-launch checklist                                                                                                                   |
| `/checklist-post-launch`  | Post-launch checklist                                                                                                                  |

### MCP Integrations

Configured via `.mcp.template.json` (copy to `.mcp.json` at project root on setup):

- **Figma**: `https://mcp.figma.com/mcp` — design-to-code via `/create-section` and `/create-component`
- **Linear**: `https://mcp.linear.app/mcp` — ticket management via `/ticket`, `/branch`, `/pr`, checklists
- **Slack**: `https://mcp.slack.com/mcp` — context gathering for `/ticket`
- **Sanity**: `https://mcp.sanity.io` — CMS content and schema operations
- **Coda**: `coda-mcp` — document fetching for `/ticket`
- **Playwright**: `@playwright/mcp` (headless) — drives Storybook for `/review-design`, `/review-code`, and the `design-visual-comparer` agent

### Git

- **Do NOT add Co-Authored-By lines to commits**
- **Branch Strategy**: Gitflow (main, feature/\*, bugfix/\*, hotfix/\*, updates/\*) — no develop branch

### Deployment

- **Platform**: Netlify
- **Preview**: Auto-deploys on PRs
