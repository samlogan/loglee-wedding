# Loglee Wedding

## Overview

A boilerplate template for building modern web applications using Next.js and Sanity. This template provides a robust starting point with pre-configured tools and best practices for rapid development.

Run `/project-setup` to replace all placeholders with your project's branding.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **CMS:** Sanity v5 (Studio at `/studio`)
- **Styling:** SCSS modules with CSS layers
- **Animations:** Motion (Framer Motion)
- **Carousel:** Embla Carousel
- **Media:** React Player
- **Forms:** React Hook Form
- **Icons:** React Icons (Tabler), Sanity Icon Manager
- **Component workshop:** Storybook 10 (`@storybook/nextjs-vite`) + Playwright UI testing
- **Linting & Formatting:** Ultracite (oxlint + oxfmt)
- **Language:** TypeScript (strict mode)
- **Package Manager:** Yarn v4.1.1

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- Yarn v4.1.1
- Sanity account credentials

### Installation

1. **Create a New Repository:**
   - Click **'Use this template'**, then **'Create a new repository'**
   - Enter your repository details and click **'Create repository'**
   - Clone the new repository to your local machine

2. **Set Up Environment:**
   - Duplicate `.env.template` to `.env.development`

3. **Set Up Sanity:**
   - Log in to Sanity
   - Click **'Create a new project'** in the Dashboard
   - Enter your project name
   - Choose **'From scratch with CLI'** option
   - Click **'Create project'**

4. **Update Environment Variables:**
   - Update `NEXT_PUBLIC_SANITY_PROJECT_NAME` with your Sanity project name
   - Update `NEXT_PUBLIC_SANITY_PROJECT_ID` with your Sanity project ID

5. **Configure Sanity API:**
   - Navigate to the **API** tab in your Sanity project
   - Under **CORS Origins**:
     - Click **'Add CORS origin'**
     - Set Origin to `http://localhost:3000`
     - Enable **'Allow credentials'**
     - Save changes
   - Under **Tokens**:
     - Click **'Add API token'**
     - Name it **'Read Token'**
     - Set Permissions to **'Viewer'**
     - Save and copy the token
   - Update `SANITY_API_READ_TOKEN` with the new token
   - Create another token named **'Write Token'** with **'Editor'** permissions
   - Update `SANITY_WRITE_TOKEN` with the new token (used for content mutations and visual editing)
   - Under **Webhooks** (or via Sanity CLI):
     - Create a webhook pointing to `{SITE_URL}/api/revalidate/` — with the trailing slash. Without it the site answers
       `308`, and the redirected request loses its body, so nothing is revalidated
     - Add an HTTP header `Authorization` with the value `Bearer {secret}`, and set the same `{secret}` as
       `SANITY_WEBHOOK_SECRET` in your environment. The endpoint checks that header, not the webhook's own Secret field

6. **Set Up MCP Integrations (Claude Code):**
   - Duplicate `.mcp.template.json` to `.mcp.json` at the project root
   - Configure as needed — remove any MCP servers you don't use
   - For Coda: add your Coda API key to the `coda.env.API_KEY` field
   - Open a fresh Claude Code session and run `/mcp` to verify connections

7. **Run Setup Command:**

   ```sh
   # Replace all placeholders with your project branding
   /project-setup
   ```

8. **Install & Run:**

   ```sh
   yarn install
   yarn dev
   ```

   - Website: `http://localhost:3000`
   - Sanity Studio: `http://localhost:3000/studio`

## Available Scripts

| Script                    | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| `yarn dev`                | Start Next.js dev server                                        |
| `yarn build`              | Build for production                                            |
| `yarn start`              | Start production server                                         |
| `yarn clean`              | Remove `.next` build cache                                      |
| `yarn lint`               | Run Ultracite check                                             |
| `yarn lint:fix`           | Auto-fix lint + formatting                                      |
| `yarn check`              | Alias for ultracite check                                       |
| `yarn fix`                | Alias for ultracite fix                                         |
| `yarn ts:check`           | TypeScript type checking                                        |
| `yarn ts:watch`           | TypeScript watch mode                                           |
| `yarn storybook`          | Start Storybook on `http://localhost:6006`                      |
| `yarn storybook:build`    | Build static Storybook to `storybook-static/` (CI smoke check)  |
| `yarn test`               | Both Vitest projects — unit logic, and every story in a browser |
| `yarn test:unit`          | Pure logic only, no browser — well under a second               |
| `yarn test:stories`       | Every story as a component test in headless chromium            |
| `yarn audit:groups`       | Story sidebar taxonomy guard — hard-blocks `/commit` and `/pr`  |
| `yarn audit:sections`     | Section registry: placeable vs rendered vs projected vs used    |
| `yarn audit:layout`       | Spacing/container usage across sections, and dead spacing props |
| `yarn audit:projections`  | GROQ weight each section adds to every page query               |
| `yarn storybook:fixtures` | Regenerate section fixtures from the Sanity dataset             |

## Project Structure

```
app/                    # Next.js App Router pages and API routes
  [...slug]/            # Dynamic CMS page routes
  blog/                 # Blog pages
  api/                  # API routes (draft, revalidate)
  studio/[[...tool]]/   # Sanity Studio
components/             # Reusable UI components
sections/               # Page section components (CMS-driven)
templates/              # Page templates
tools/
  sanity/               # Sanity client, queries, schemas, projections
  helpers/              # Utility functions
  hooks/                # Custom React hooks
  sass/                 # Global SCSS resources, mixins, variables
config/                 # Site config (metadata, fonts, redirects)
assets/                 # Static assets (logos, templates)
```

## Storybook

Every component and section ships with a Storybook story. Storybook is the canonical render environment for visual development and the headless test runner that powers `/review-design`, `/review-code`, and the `design-visual-comparer` agent.

```sh
yarn storybook            # Browse stories at http://localhost:6006
yarn storybook:build      # Static build — recommended as a CI smoke check
yarn test                 # Unit suite + every story as a browser component test
yarn storybook:fixtures   # Regenerate section fixtures from the Sanity dataset
```

Section stories render **real data pulled from Sanity** (committed fixtures in [`tools/storybook/fixtures/`](./tools/storybook/fixtures/), generated by `yarn storybook:fixtures`), falling back to mock helpers when a section has no published content yet. Fixtures self-heal during `/commit` and `/pr` via the `story-fixture-checker` agent. Stories bind to their Figma frame via `parameters.design` (addon-designs). Full conventions are in [`CLAUDE.md`](./CLAUDE.md) under "Storybook".

### Design system pages

Storybook also carries a small design-system reference under `Foundations/Design System/` — Colour,
Typography and Layout — read live from the running stylesheet rather than from a maintained list.
These pages **describe** the system; they never print verdicts. Audit findings live in the
`yarn audit:*` CLI output instead, because this Storybook is shown to clients.

**Wiring Storybook into CI:** add `yarn storybook:build` as a separate command alongside `yarn build` in your deploy pipeline. A failing story (missing import, broken prop shape) will fail the build before deploy.

> **Building Storybook locally proves nothing without the Sanity env vars.** Vite loads
> `.env.production`/`.env` in build mode and never `.env.development`, so with the vars absent
> `yarn storybook:build` exits **0** while producing a manager-only site — no `iframe.html`, no JS
> assets. Export them first (`set -a; . ./.env.development; set +a`) and check `iframe.html` exists.

### Deploying Storybook

Storybook is deployed as a **second Netlify site off the same repo**:

- Build command `yarn storybook:build`, publish directory `storybook-static`.
- **Remove the auto-installed `@netlify/plugin-nextjs`** and keep it removed, or the build fails with
  exit 2. Netlify's framework auto-detection re-adds it; clear it via the site's plugin settings.
- Port the Sanity environment variables from the main site — the preview bundle needs the project ID
  and dataset at build time (see the note above).
- `.storybook/static/_headers` serves `X-Robots-Tag: noindex, nofollow` from the publish root. That
  rather than a `robots.txt` `Disallow`, because a disallowed crawler never fetches the page and so
  never sees the noindex, leaving the URL eligible for index-without-content. Allowing the crawl and
  serving noindex is what actually keeps it out. It lives in `.storybook/static/`, not `/public`,
  which is shared with the Next.js site and would collide with `app/robots.ts`.

## Deployment

This project is deployed via Netlify. Ensure that environment variables are configured correctly in Netlify settings before deploying.

### Testing Features

1. When you open a Pull Request, Netlify will automatically create a deploy preview
2. Find the deploy preview check in your PR
3. Click "Details" to access the preview URL
4. Share this URL with stakeholders for testing and review
5. The preview environment uses the same configuration as production

Note: Deploy previews are automatically deleted when the PR is merged or closed.

## Contributing

### Git Workflow

This project follows the Gitflow workflow:

1. **Main Branch**
   - `main`: Production-ready code

2. **Supporting Branches**
   - `feature/*`: New features
   - `bugfix/*`: Bug fixes for development
   - `hotfix/*`: Emergency fixes for production
   - `updates/*`: Config, dependency, or maintenance changes
   - `release/*`: Release preparation

3. **Branch Naming Convention**
   - Features: `feature/mam-123-feature-name`
   - Bugs: `bugfix/mam-124-bug-description`
   - Hotfixes: `hotfix/mam-125-issue-description`
   - Updates: `updates/mam-126-update-description`

   Use `/branch` in Claude Code to create branches with automatic Linear issue creation.

## Code Style

### Linting & Formatting

This project uses [Ultracite](https://github.com/haydenbleasel/ultracite) with oxlint + oxfmt for linting and formatting. Configuration files:

- `.oxlintrc.json` — oxlint rules (extends Ultracite core + Next.js presets)
- `.oxfmtrc.jsonc` — oxfmt formatting (120 char width, single quotes, no trailing commas)
