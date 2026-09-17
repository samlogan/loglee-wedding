# Update Docs

Scan the current project state and update both `CLAUDE.md` and `README.md` to match reality.

## Arguments

`$ARGUMENTS`

Optional flags: `--claude-only`, `--readme-only`

If `--claude-only` is passed, only update `CLAUDE.md`. If `--readme-only` is passed, only update `README.md`. If no flags, update both.

---

## No interactive prompts — fully automated

---

## Step 1: Scan Project State

Read and extract data from all of these sources:

| Source                                | What to extract                                           |
| ------------------------------------- | --------------------------------------------------------- |
| `package.json`                        | Project name, version, all scripts, dependencies/versions |
| `components/` directory listing       | All component names (every subdirectory)                  |
| `sections/index.ts`                   | Exported section components                               |
| `tools/sanity/helpers/sections.ts`    | `pageSections` array (registered section types)           |
| `tools/sanity/projections/common/`    | Available GROQ projection files                           |
| `tools/sanity/schema/sections/`       | Section schema files                                      |
| `tools/sanity/schema/elements/`       | Element schema files                                      |
| `tools/helpers/`                      | Available helper functions                                |
| `tools/hooks/`                        | Available custom hooks                                    |
| `config/`                             | Config file names and extensions                          |
| `tsconfig.json`                       | Path aliases, strict mode, target                         |
| `eslint.config.mjs`                   | ESLint setup (flat config, plugins)                       |
| `next.config.ts` or `next.config.mjs` | Next.js config (images, headers, etc.)                    |
| `.claude/commands/`                   | Available slash commands                                  |
| `.claude/mcp.json`                    | MCP integrations                                          |
| `tools/sass/global/_variables.scss`   | CSS custom properties and Sass variables                  |
| `tools/sass/base/__media.scss`        | Media breakpoints and mixin names                         |

### Linear Project Documents (optional)

If `mcp__linear__get_project` is available **and** `LINEAR_PROJECT_ID` is set in `.env.development`, also read:

1. Call `mcp__linear__get_project` with the `LINEAR_PROJECT_ID` value to get the project summary (the `description` field)
2. Call `mcp__linear__list_documents` filtered to the project to find the **"Project Brief"** and **"Technical Brief"** documents
3. Call `mcp__linear__get_document` for each to read their full content

If Linear MCP or `LINEAR_PROJECT_ID` is unavailable, skip silently — do not warn or error.

Store the Linear context for use in Steps 3, 4, and 6.

---

## Step 2: Update Slash Commands (skip if `--readme-only`)

After scanning project state, check if any changes impact the `/create-section` or `/create-component` commands. Read both command files:

- `.claude/commands/create-section.md`
- `.claude/commands/create-component.md`

Cross-reference against the scanned data and update the commands if any of the following have changed:

| What to check          | Where to look                                                                                                                               | What to update in commands                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Component conventions  | Existing components in `components/` — arrow functions, props patterns, import order, `classNames` usage                                    | `/create-component` template code and conventions                                 |
| SCSS patterns          | `tools/sass/global/_variables.scss`, `tools/sass/base/__media.scss`, existing `styles.module.scss` files                                    | CSS variable names, spacing scale values, breakpoint names/values, `@layer` usage |
| Schema patterns        | `tools/sanity/schema/sections/`, `tools/sanity/schema/common/`                                                                              | `/create-section` schema template, available field types, common helpers          |
| GROQ projections       | `tools/sanity/projections/common/`                                                                                                          | Available projections list in both commands                                       |
| Registration locations | `tools/sanity/schema/index.ts`, `tools/sanity/helpers/sections.ts`, `sections/index.ts`, `tools/sanity/projections/common/sections.groq.ts` | Registration steps in `/create-section`                                           |
| Sanity element types   | `tools/sanity/schema/elements/`                                                                                                             | Available element types referenced in schema templates                            |
| Icon library           | Check imports in schema files                                                                                                               | Icon import source (e.g., `react-icons/tb`)                                       |
| Dependencies           | `package.json`                                                                                                                              | Any imports or APIs that changed between major versions                           |

Only modify the command files if something has actually changed. Do not rewrite them unnecessarily. Report any updates made.

---

## Step 3: Update CLAUDE.md (skip if `--readme-only`)

Preserve the existing structure and voice. Update each section with accurate data from the scan.

**Linear context:** If a Project Brief was read from Linear, factor in any relevant technical context — e.g., third-party integrations, architectural decisions, conventions, or constraints that should be documented in CLAUDE.md but aren't yet. Do NOT reproduce the brief verbatim; extract only what helps Claude Code work more effectively on this codebase.

Required sections in order:

### 1. Development Commands

- Extract all scripts from `package.json`
- Include pre-commit checklist: `yarn lint:fix && yarn prettier:fix && yarn ts:check`

### 2. Architecture Overview

- **Tech Stack** — actual major versions from `package.json` (Next.js, React, Sanity, TypeScript, Yarn)
- **Project Structure** — routing (`[...slug]/page.tsx`), key directories with correct paths, config files with correct extensions
- **Available Components** — table of all components found in `components/` with brief descriptions based on their props/exports

### 3. Sanity Integration

- **Key Concepts**: client (`tools/sanity/client.ts`), queries, `sanityFetch`, draft mode, revalidation
- **Schema Patterns**: `defineType` from `sanity`, `defaultSectionGroups`, `internalLabelField`, `sectionFields`, `ReadOnlyImageInput`, `stripTitleTags`, icons from `react-icons/tb`
- **Available GROQ Projections**: list all files from `tools/sanity/projections/common/`
- **Dynamic Page Rendering**: flow from `[...slug]/page.tsx` → template → sections

### 4. Section Architecture

- 4 files + registration in 4 locations
- Naming conventions (PascalCase component, camelCase schema)
- Reference to `/create-section` command

### 5. SCSS Patterns

- **CSS Layers**: `@layer global, defaults` — component styles go in `@layer defaults`
- **Class naming**: lowercase base (`.button`), underscore modifiers (`.theme_primary`, `.size_md`)
- **CSS custom properties**: theme-aware variables (`var(--bg-default)`, `var(--fg-default)`), brand colors (`var(--primary-500)`)
- **Spacing scale**: document actual values from `_variables.scss`
- **Media mixins**: `media-up`, `media-down`, `media-between` with actual named breakpoints from `__media.scss`
- **Responsive co-location rule**: media queries go inside each selector
- **Sass module syntax**: `@use 'sass:map'` (not global `map-get()`)
- **Auto-imported resources**: note that `resources.scss` is auto-imported — no explicit imports needed

### 6. Component Conventions

- Arrow function components, NOT `FC<>` (FC is only for section components)
- Props interface exported from component file
- `classNames` helper for all class composition
- Dynamic module keys: `styles[\`variant\_${variant}\`]`
- Default values via destructuring
- Import order: directive → React → Next.js → Components → Helpers → Types → SCSS
- Server components by default, `'use client'` only when hooks/handlers needed

### 7. Code Style

- **Prettier**: 120 char width, single quotes, no trailing commas
- **ESLint**: flat config (`eslint.config.mjs`), plugins used
- **TypeScript**: strict mode, target from `tsconfig.json`

### 8. Path Aliases

- Extract actual aliases from `tsconfig.json`

### 9. Environment Variables

- List required env vars from `.env.development` (or `.env.example` if present)

### 10. Deployment

- Platform, preview deploys, branch strategy

---

## Step 4: Update README.md (skip if `--claude-only`)

Create or update with a human-readable project overview.

**Linear context:** If a Project Brief was read from Linear, use it to enrich the README — e.g., project description, business context, and key integrations. Do NOT include stakeholder names, contacts, or internal project management details. Keep it concise; the README is for developers.

- **Project name and description** — from `package.json` (enriched with Project Brief context if available)
- **Tech stack** — with actual versions
- **Getting started**:
  - Prerequisites (Node.js version, Yarn)
  - Install: `yarn install`
  - Environment setup: copy `.env.example` (or list required vars)
  - Dev server: `yarn dev`
- **Available scripts** — table of all scripts from `package.json`
- **Project structure** — high-level directory tree
- **Deployment** — Netlify, auto-deploys on PRs
- **Contributing** — Gitflow: `feature/*`, `bugfix/*`, `hotfix/*` branches

---

## Step 5: Verify

Run Prettier to check formatting:

```bash
yarn prettier --check CLAUDE.md README.md
```

If formatting issues are found, fix them:

```bash
yarn prettier --write CLAUDE.md README.md
```

---

## Step 6: Sync Technical Brief to Linear (optional)

If Linear MCP is available **and** `LINEAR_PROJECT_ID` is set in `.env.development`:

### 6a: Update Technical Brief

1. Call `mcp__linear__list_documents` filtered to the project to find the **"Technical Brief"** document
2. If it exists, call `mcp__linear__update_document` with the updated content. If it doesn't exist, call `mcp__linear__create_document` with the title "Technical Brief" attached to the project
3. The Technical Brief content should be a Markdown summary generated from the current `CLAUDE.md` and `README.md`, following this structure:
   - **Tech stack** — framework, versions, CMS, hosting, package manager
   - **Key services & integrations** — third-party APIs, MCP servers, analytics
   - **Architecture** — routing, project structure, build pipeline
   - **Conventions** — coding style, naming patterns, component patterns
   - **Environment** — required env vars (names only, not values)
   - **Deployment** — platform, branch strategy, preview deploys

   Target 500-1000 words. Optimise for information density — this is consumed by an AI automation system, not humans.

### 6b: Post Project Status Update

Call `mcp__linear__save_status_update` with:

- `type`: `"project"`
- `project`: the `LINEAR_PROJECT_ID` value
- `health`: `"onTrack"`
- `body`: A short Markdown summary of what was updated (e.g., "Updated CLAUDE.md and README.md — added 3 new components, updated Next.js version. Synced Technical Brief to Linear.")

If Linear MCP or `LINEAR_PROJECT_ID` is unavailable, skip this entire step silently.

---

## Summary

After completion, report:

- Which files were updated (`CLAUDE.md`, `README.md`, slash commands, or all)
- Key changes made (e.g., "Added 3 new components to the component list", "Updated Next.js version from 15 to 16")
- Any updates to `/create-section` or `/create-component` commands (e.g., "Updated SCSS variable names in create-component", "Added new GROQ projection to create-section")
- Any discrepancies found between docs and reality
- Whether Linear Technical Brief was synced (created/updated) or skipped
- Whether a Linear project status update was posted
