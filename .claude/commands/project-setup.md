# Setup Project

Replace all boilerplate placeholders with real project branding. Pulls icon and Open Graph image from Figma, generates all favicon/icon sizes, and updates every config file.

## Arguments

`$ARGUMENTS`

Optional flags: `--icon=<figma-url>` and/or `--og=<figma-url>`

---

## Step 0: Figma Prerequisites (Mandatory)

**This step runs before anything else. Do NOT skip it.**

### 0a: Verify Figma MCP

Check if the `mcp__figma__get_screenshot` and `mcp__figma__get_design_context` tools are available.

If Figma MCP tools are **NOT available**, stop and tell the user:

> "The Figma MCP server is not connected. This is required for project setup."
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
# Read token from .env.development
FIGMA_TOKEN=$(grep '^FIGMA_PERSONAL_ACCESS_TOKEN=' .env.development | cut -d'=' -f2- | tr -d '"' | tr -d "'")

# Validate against a known file endpoint (use any fileKey from a provided Figma URL)
curl -s -o /dev/null -w "%{http_code}" -H "X-FIGMA-TOKEN: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/files/{fileKey}/nodes?ids=0:1&depth=1"
```

A `200` response means the token is valid. If `401` or `403`:

> "The `FIGMA_PERSONAL_ACCESS_TOKEN` in `.env.development` is invalid or expired."

Use `AskUserQuestion` to ask for a new token. Update `.env.development` and re-validate.

### How to use the Figma REST API for image downloads

Throughout this command, use this pattern to download images from Figma:

```bash
# 1. Read token from .env.development
FIGMA_TOKEN=$(grep '^FIGMA_PERSONAL_ACCESS_TOKEN=' .env.development | cut -d'=' -f2- | tr -d '"' | tr -d "'")

# 2. Get the image export URL
curl -sH "X-FIGMA-TOKEN: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/images/{fileKey}?ids={nodeId}&format=png&scale={scale}" \
  | jq -r '.images["{nodeId}"]'

# 3. Download the PNG from the returned URL
curl -sL "<url_from_step_2>" -o path/to/output.png

# 4. Resize if needed (macOS sips) — always copy from source first, never chain resizes
sips -z {height} {width} path/to/output.png
```

**Important:** The header MUST be `X-FIGMA-TOKEN` (all caps). The `nodeId` in the URL uses `-` separators but in the `jq` filter uses `:` separators (e.g., URL: `ids=17-837`, jq: `.images["17:837"]`).

### 0d: Verify Sanity Project Setup

Read `.env.development` and check that the following Sanity environment variables are set and non-empty:

| Variable                        | Required | Purpose                      |
| ------------------------------- | -------- | ---------------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Yes      | Sanity project identifier    |
| `SANITY_API_READ_TOKEN`         | Yes      | API read token (Viewer role) |
| `SANITY_WEBHOOK_SECRET`         | Yes      | Revalidation webhook secret  |

If **any** of these are missing or empty, **stop immediately** and tell the user:

> **Sanity project not configured.** The following environment variables are missing from `.env.development`:
>
> {list only the missing ones}
>
> Please set up the Sanity project before running `/project-setup`. Here's how:
>
> ### 1. Create the Sanity project
>
> Go to [manage.sanity.io](https://www.sanity.io/manage) and create a new project. Create it in the client's organisation if you have access, otherwise use the Woolly Mammoth organisation (`oWN0DEqfk`).
>
> ### 2. Create API tokens
>
> Switch to the **API** tab and create these tokens:
>
> - **Website - Read Token** _(do not delete)_
>   - Permissions: **Viewer**
>   - Copy the token (you'll only see it once) → add to `SANITY_API_READ_TOKEN` in `.env.development`
> - **Website - Write Token** _(do not delete or expose)_
>   - Permissions: **Editor**
>   - Copy the token (you'll only see it once) → add to `SANITY_WRITE_TOKEN` in `.env.development`
>
> ### 3. Create the revalidation webhook
>
> Switch to the **Webhooks** tab and create a new webhook:
>
> - **Name:** Website - Revalidation Webhook _(do not delete)_
> - **URL:** `https://mammoth.tech` _(placeholder — update once you have the Netlify URL)_
> - **Trigger on:** Create and Delete
> - **Secret:** Generate a 32-character random string at [onlinestringtools.com/generate-random-string](https://onlinestringtools.com/generate-random-string). Add this to both the webhook **Secret** field and `SANITY_WEBHOOK_SECRET` in `.env.development`.
> - Hit **Save**
>
> ### 4. Add CORS origin
>
> Switch to **CORS origins** and add:
>
> - **Origin:** `http://localhost:3000`
> - **Allow credentials:** Yes
>
> ### 5. Copy the project ID
>
> Copy the project ID (shown beneath the project name in the dashboard) → add to `NEXT_PUBLIC_SANITY_PROJECT_ID` in `.env.development`.
>
> ---
>
> Once done, run `/project-setup` again.

**Do NOT proceed past this step.** The Sanity project must be fully configured before the setup command can continue.

---

## Step 1: Collect Project Information

Use `AskUserQuestion` to gather all required branding details.

**Call 1:**

1. **"What is the project name?"** — Free text. Used for `package.json` name (kebab-case), `README.md` title, and `NEXT_PUBLIC_SANITY_PROJECT_NAME`.
2. **"What is the site title?"** — Free text. The public-facing site title for SEO, browser tabs, and metadata (e.g., "Acme Corp").
3. **"What is the short name? (max 12 characters, for PWA manifest)"** — Free text. A condensed version of the site title.
4. **"What is the site description?"** — Free text. A one-sentence description for SEO meta tags and Open Graph.

**Call 2:**

1. **"What is the site URL? (production domain)"** — Free text. e.g., `https://www.example.com`
2. **"What is the primary brand color? (hex code)"** — Free text. Used for PWA theme and `themeColor`/`backgroundColor`. Default: `#000000`
3. **"Sanity Studio theme color?"** — Auto-suggest a dark shade from the design system. Read `tools/sass/global/_variables.scss` and find the darkest primary color available (e.g., `--primary-900` or `--primary-800`). If no primary palette exists yet, use the primary brand color darkened, or default to `#000000`. **The Sanity Studio navbar requires a dark color** — light colors make the white UI text unreadable. Present the suggestion: "Recommended: `{hex}` (primary-900 from your design system). This must be a dark colour for the Studio navbar. Press Enter to accept or paste a different dark hex."
4. **"Author / company name?"** — Free text. For metadata `authors`, `creator`, `publisher`, and schema.org.

> Social media links are managed in Sanity (`socialMediaDocument` singleton) — not asked here. The site editor adds them after launch via Studio.

---

## Step 2: Pull Icon from Figma

**If `--icon=<figma-url>` was provided, skip the question and use that URL. Otherwise ask:**

Use `AskUserQuestion`:
**"Do you have a Figma frame for the app icon? The frame MUST be exactly 512x512px."**

- "Yes, I'll paste the Figma URL" — prompt for URL
- "No, I'll add icons manually later" — skip to Step 2b

### 2a: Figma icon extraction

1. Use `mcp__figma__get_screenshot` on the icon Figma URL to get visual reference
2. Use `mcp__figma__get_design_context` to extract the icon design and **validate the frame dimensions**

**Validate frame size — this is critical:**

- The frame MUST be exactly **512x512px**
- If the frame is NOT 512x512, **stop and report the error**:
  > "The Figma icon frame is {width}x{height}px but must be exactly 512x512px. Please resize the frame in Figma and provide the URL again."
- Use `AskUserQuestion` to ask for the corrected URL. Do NOT proceed until the frame is 512x512.

3. Use the Figma REST API (with `FIGMA_PERSONAL_ACCESS_TOKEN` from Step 0) to export the icon frame as PNG at `scale=2` (gives 1024x1024 source), then resize with `sips -z {h} {w}` to each target size:
   - **`app/icon.png`** — 512x512 (PWA icon, Next.js metadata icon)
   - **`app/apple-icon.png`** — 180x180 (Apple touch icon)
   - **`app/favicon.png`** — 64x64 (browser tab favicon — `.ico` is not needed, modern browsers support PNG)
   - **`public/schema-icon.png`** — 512x512 (same as `app/icon.png`, used by organization schema JSON-LD at `components/JsonLd/schemas/organization.ts` — served from `{siteUrl}/schema-icon.png`. Google requires min 112x112px, square. 512x512 is ideal.)

**Important:** Always use `sips -z {height} {width}` for resizing (NOT `--resampleWidth`/`--resampleHeight` which can produce incorrect results). Always copy from the original source before resizing — do not chain resizes.

### 2b: Sanity Studio icon

**No question needed — automatically use the apple icon.**

**Update `tools/sanity/config/index.tsx`:**

Replace the placeholder emoji line:

```tsx
icon: () => <div style={{ fontSize: '25px', lineHeight: 1, width: '100%', height: '100%' }}>⬛</div>,
```

With the apple icon:

```tsx
icon: () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/apple-icon.png" alt="" style={{ width: '100%', height: '100%' }} />
),
```

### 2c: Site logo

Use `AskUserQuestion`:
**"Do you have a Figma frame for the site logo (SVG wordmark/logotype)?"**

- "Yes, I'll paste the Figma URL" — export as SVG via Figma REST API (`format=svg`), optimize it, save to `assets/logo/logo.svg`
- "No, I'll add it later" — leave the placeholder SVG, note in summary

**SVG optimization:** After downloading any SVG from Figma, always:

1. Strip `width` and `height` attributes from the root `<svg>` element (keep `viewBox`)
2. Remove `fill="none"` from the root `<svg>` element (Figma adds this unnecessarily)
3. Keep `xmlns` attribute (required for standalone SVG files)

The Logo component at `tools/sanity/components/Logo/index.tsx` references `/static/logo.svg` — ensure the file is placed correctly or update the path.

### 2d: If no Figma and no icons provided

List required icon files for manual creation:

| File                     | Size    | Format | Purpose                                                       |
| ------------------------ | ------- | ------ | ------------------------------------------------------------- |
| `app/icon.png`           | 512x512 | PNG    | PWA icon, Next.js metadata                                    |
| `app/apple-icon.png`     | 180x180 | PNG    | Apple touch icon                                              |
| `app/favicon.png`        | 64x64   | PNG    | Browser tab favicon                                           |
| `public/schema-icon.png` | 512x512 | PNG    | Organization schema logo (can be same file as `app/icon.png`) |
| `assets/logo/logo.svg`   | Vector  | SVG    | Site logo / wordmark                                          |

---

## Step 3: Pull Open Graph Image from Figma (Optional)

**If `--og=<figma-url>` was provided, skip the question and use that URL. Otherwise ask:**

Use `AskUserQuestion`:
**"Do you have a Figma frame for the Open Graph image? The frame MUST be exactly 1200x630px."**

- "Yes, I'll paste the Figma URL" — prompt for URL
- "No, I'll add it manually later" — skip this step

### If Figma URL is provided:

1. Use `mcp__figma__get_screenshot` on the OG Figma URL
2. Use `mcp__figma__get_design_context` to **validate the frame dimensions**

**Validate frame size:**

- The frame MUST be exactly **1200x630px**
- If the frame is NOT 1200x630, **stop and report the error**:
  > "The Open Graph frame is {width}x{height}px but must be exactly 1200x630px. Please resize the frame in Figma and provide the URL again."
- Use `AskUserQuestion` to ask for the corrected URL. Do NOT proceed until the frame is 1200x630.

3. Use the Figma REST API (with `FIGMA_PERSONAL_ACCESS_TOKEN` from Step 0) to download the frame as PNG and save to **`assets/images/open-graph.png`** (1200x630)

### If no Figma URL:

- Leave the existing placeholder image
- Note in summary that `assets/images/open-graph.png` needs to be replaced (1200x630px)

---

## Step 4: Replace All Placeholders

Using the collected information, replace all `PLACEHOLDER_*` values across the codebase.

### `package.json`

```
"name": "placeholder-project-name" → "{kebab-case-project-name}"
```

### `config/website.ts`

```
title: 'PLACEHOLDER_SITE_TITLE' → '{site title}'
titleTemplate: '%s - PLACEHOLDER_SHORT_NAME' → '%s - {short name}'
description: 'PLACEHOLDER_SITE_DESCRIPTION' → '{site description}'
siteName: 'PLACEHOLDER_SITE_NAME' → '{site title}'
shortName: 'PLACEHOLDER' → '{short name}'
author: 'PLACEHOLDER_AUTHOR' → '{author}'
themeColor: '#000000' → '{brand color}'
backgroundColor: '#000000' → '{brand color}'
```

### `config/metadata.ts`

**No placeholders to replace.** This file imports all values (`title`, `description`, `siteName`, `author`) from `config/website.ts` as a single source of truth. Updating `website.ts` automatically updates metadata.

### `tools/sanity/config/theme.ts`

```
'--custom-primary': '#000000' → '{sanity studio theme color}'
```

### `.env.template`

```
NEXT_PUBLIC_SANITY_PROJECT_NAME="PLACEHOLDER_PROJECT_NAME" → "{project name}"
```

### `.env.development` and `.env.production` (if they exist)

Update `NEXT_PUBLIC_SANITY_PROJECT_NAME` with the project name. Do NOT overwrite existing Sanity project IDs or API tokens — those are environment-specific.

### `readme.md`

Replace `PLACEHOLDER_PROJECT_NAME` in the title and overview with the actual project name.

---

## Step 5: Verify

1. Run `yarn install` — **required** after changing `package.json` name (Yarn PnP caches workspace names)
2. Run `/check` to lint, format, and type-check the project

---

## Step 6: Remove Placeholder Sections

Remove all boilerplate sections that shipped with the template, keeping select sections as pattern references for future development.

### 6a: Archive reference sections

Move these three sections to `.claude/references/sections/` — they demonstrate every key pattern (sub-schemas, sub-components, TextTitle, TextBlock, Image, Link, repeatable items, media alignment, accordion):

```bash
mkdir -p .claude/references/sections
```

For each of **GridSection**, **TwoColumnDefaultSection**, **FaqSection**:

1. Copy the entire section folder: `cp -r sections/{Name}Section .claude/references/sections/{Name}Section`
2. Copy the schema file: `cp tools/sanity/schema/sections/{camelCase}Section.ts .claude/references/sections/{Name}Section/schema.ts`
3. Copy the GROQ projection: already in the section folder as `queries.groq.ts`

These are read-only references — not registered, not imported, not built. They exist so `/create-section` and Claude Code can read real working examples of:

- **GridSection**: Repeatable card sub-schema (`gridCard`), Image with `aspectRatio`, TextBlock, Link with button pattern, sub-type exports
- **TwoColumnDefaultSection**: TextTitle, Image, TextBlock, Link, `alignMedia` option, `getSectionTheme` with default
- **FaqSection**: TextTitle, TextBlock, Link, sub-component in separate file (`FaqItems/`), accordion pattern

### 6a-ii: Rebrand the Storybook chrome

`.storybook/theme.ts` holds five hex values **copied** from `tools/sass/global/_variables.scss` — the
manager renders outside the preview iframe, so it cannot read the site's CSS custom properties and
there is no way to reference the real tokens.

Update them to the new project's palette, keeping the trailing comment on each line pointing at the
token it mirrors:

- `appBg` / `appContentBg` / `appPreviewBg` — the dark surface (a `--gray-900`-ish token)
- `barBg` / `appBorderColor` — one step up
- `colorPrimary` / `colorSecondary` — the brand
- `brandTitle` — the design system's name, as shown next to the sidebar logo

Two rules that are easy to get wrong:

- **Check `colorSecondary` against white.** Storybook renders the selected sidebar item as hardcoded
  white text on `darken(0.18, colorSecondary)`. A pale brand colour fails contrast here, in a repo
  that ships `addon-a11y`. Pick a darker member of the same family if it does not clear 4.5:1.
- **If the logo is authored with `fill="currentColor"`**, it renders black inside the `<img>` the
  manager uses, because there is no inherited colour to resolve against. Recolour it in `managerHead`
  in `.storybook/main.ts` with `filter: brightness(0) invert(1)`, matched on `img[alt='<brandTitle>']`.
  A logo with explicit fills needs nothing.

Nothing warns if this is skipped — the Storybook simply keeps the boilerplate's colours.

### 6b: Delete all placeholder sections

Remove every section from the live codebase:

1. Read `sections/index.ts` to get the full list of registered sections
2. For each section:
   - Delete the section folder: `rm -rf sections/{Name}Section`
   - Delete the schema file: `rm tools/sanity/schema/sections/{camelCase}Section.ts`
3. Clear all exports from `sections/index.ts`, leaving exactly `export {};`

   Not an empty file. A `.ts` file with no top-level `import`/`export` is not a module, so
   `components/Sections/index.tsx` fails with _"File 'sections/index.ts' is not a module"_ and the
   project does not typecheck until the first section is built.

4. Clear all section entries from `tools/sanity/helpers/sections.ts` (leave `pageSections` as an empty array)
5. Remove all section imports and projections from `tools/sanity/projections/common/sections.groq.ts`
6. Remove all section imports from `tools/sanity/schema/index.ts` (both section types and their sub-types like `gridCard`)

### 6c: Verify

Run `yarn fix && yarn ts:check` to ensure no broken imports remain.

---

## Step 7: Summary

Report to the user:

### Files updated

List every file that was modified with what changed.

### Icons generated (if Figma was used)

| File                           | Size     | Source                        |
| ------------------------------ | -------- | ----------------------------- |
| `app/icon.png`                 | 512x512  | Figma icon frame              |
| `app/apple-icon.png`           | 180x180  | Figma icon frame (downscaled) |
| `app/favicon.png`              | 64x64    | Figma icon frame (downscaled) |
| `public/schema-icon.png`       | 512x512  | Copy of `app/icon.png`        |
| `assets/images/open-graph.png` | 1200x630 | Figma OG frame (if provided)  |
| Sanity Studio icon             | —        | SVG or PNG fallback           |

### Sections archived

- 3 reference sections moved to `.claude/references/sections/` (GridSection, TwoColumnDefaultSection, FaqSection)
- All placeholder sections removed from live codebase and unregistered
- Reference sections are available for `/create-section` to read as pattern examples

### Still needs manual attention

- Any icons that couldn't be generated (list which ones and their required sizes)
- `assets/images/open-graph.png` — 1200x630px (if no OG image was provided)
- `assets/logo/logo.svg` — vector SVG (if no logo was provided)
- Netlify deployment URL — once available, update the Sanity revalidation webhook URL from `https://mammoth.tech` to the real URL
- Social links — added by the editor in Sanity Studio (`socialMediaDocument` singleton)
- Twitter handle in `config/website.ts` (if left empty)

### Required Figma frame sizes (for reference)

| Asset              | Required size          | Format |
| ------------------ | ---------------------- | ------ |
| App icon           | **512x512** (exact)    | PNG    |
| Open Graph image   | **1200x630** (exact)   | PNG    |
| Site logo          | Any (vector)           | SVG    |
| Sanity Studio icon | Any (vector preferred) | SVG    |

---

## Step 8: Post Linear Project Update

Post a status update to Linear so the team has visibility on project setup progress.

1. Check if the `mcp__linear__save_status_update` tool is available **and** `LINEAR_PROJECT_ID` is set (non-empty) in `.env.development`
2. If **either** is missing, skip this step silently — do not warn or error
3. Read the `LINEAR_PROJECT_ID` value from `.env.development`
4. Call `mcp__linear__save_status_update` with:
   - `type`: `"project"`
   - `project`: the `LINEAR_PROJECT_ID` value
   - `health`: `"onTrack"`
   - `body`: A Markdown summary including:
     - Project name that was configured
     - Icons generated (list which ones, with sizes)
     - Placeholders replaced (list of config files updated)
     - Items still needing manual attention (e.g., missing OG image, logo)
