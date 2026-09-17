import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const at = (segment: string) => path.resolve(dirname, segment);

/**
 * Load `.env.development` before anything else in this file runs.
 *
 * Vitest initialises **every** project in the config before filtering to the one you asked for, so
 * even `--project=unit` constructs the Storybook plugin. That plugin loads `.storybook/main.ts`,
 * which `@storybook/nextjs-vite` resolves against `next.config.js` — and this project's
 * `next.config.js` calls `fetchSanityRedirects()` in its `redirects()` hook, which throws
 * `Configuration must contain projectId` with no Sanity env present. Startup then fails with an
 * aggregate error naming neither cause.
 *
 * Mirrors `tools/storybook/generate-fixtures.ts`, and it is the same gap that makes
 * `yarn storybook:build` quietly produce a manager-only site: Vite loads `.env.production` and `.env`
 * in build mode, never `.env.development`. Wrapped because CI may inject real env vars and have no
 * file at all.
 */
try {
  process.loadEnvFile(at('.env.development'));
} catch (error) {
  /*
   * Only a missing file is expected — CI may inject real env vars and have no file at all.
   *
   * Anything else is rethrown. A bare `catch` here also swallowed
   * `TypeError: process.loadEnvFile is not a function`, which is what Node below 20.12 raises, and
   * the run then failed with exactly the confusing downstream error this block exists to prevent.
   * `engines` in package.json states the floor; this makes a breach of it say so.
   *
   * That floor is `>=24.0.0` — current LTS, and deliberately well above the toolchain's true
   * minimum. Nothing else in this repo pins Node (no `netlify.toml`, no `.nvmrc`, no CI workflow),
   * so `engines` is the only signal, and Netlify reads it to choose the runtime. A compound range
   * expressing the real intersection would have been `^20.19.0 || ^22.12.0 || >=24.0.0`, whose
   * lowest satisfying version is 20.19 — a line that reached end of life in April 2026. A single
   * floor cannot resolve downwards into an unsupported runtime, and needs no recomputation when
   * Storybook or Vitest move.
   */
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw error;
  }
}

/**
 * Mirrors `compilerOptions.paths` in `tsconfig.json`.
 *
 * Declared here because there is no root `vite.config.ts` — Vite exists in this project only through
 * Storybook, so nothing else supplies these to the unit project. The story project does not need
 * them: it inherits the whole Vite config from `.storybook/main.ts` via `configDir`, which is also
 * what carries SVGR, the SCSS injection and the server-component mock plugin.
 *
 * **Order matters.** Vite resolves aliases in key order, so the bare `@` must come last — put it
 * first and it swallows `@/helpers`, `@/config` and every other prefix below.
 */
const alias = {
  '@/helpers': at('tools/helpers'),
  '@/hooks': at('tools/hooks'),
  '@/projections': at('tools/sanity/projections'),
  '@/sanity': at('tools/sanity'),
  '@/sass': at('tools/sass'),
  '@/types': at('types'),
  '@/assets': at('assets'),
  '@/config': at('config'),
  '@': dirname
};

export default defineConfig({
  test: {
    projects: [
      /**
       * Pure logic. No browser, no Storybook, runs in well under a second — which is what makes it
       * cheap enough to gate every `/commit` on.
       */
      {
        resolve: {
          alias: {
            ...alias,
            /*
             * `server-only` is a marker package whose entry point is a bare `throw`. Next resolves it
             * through the `react-server` export condition, which maps to an empty module; nothing
             * applies that condition here, so importing a server helper under test would throw
             * "This module cannot be imported from a Client Component module" before a single
             * assertion ran.
             *
             * Aliased to that same empty module rather than dropped from the helpers: the import is a
             * real build-time guard that keeps server code out of the client bundle, and deleting it
             * to make a test pass would trade a production safeguard for test convenience.
             *
             * Resolved to an absolute path because the package's `exports` map exposes only `.` — the
             * bare specifier `server-only/empty.js` fails with "Missing ./empty.js specifier".
             */
            'server-only': at('node_modules/server-only/empty.js')
          }
        },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tools/**/*.test.ts', 'config/**/*.test.ts']
        }
      },
      /**
       * The existing stories, run as component tests in a real browser.
       *
       * No test files are written for this project — every `*.stories.tsx` in the repo becomes a test
       * that mounts the story, runs its `play` function if it has one, and fails on a render error or
       * an unhandled rejection. That is the same check the manual Playwright sweeps behind
       * `/review-code` and `/review-design` have been doing by hand.
       *
       * A real browser rather than jsdom, and not only because Storybook requires it: this design
       * system is largely *layout*, and jsdom has no layout engine — `getComputedStyle` there cannot
       * tell you that a spacing token resolved to `0px` or that a container capped at 1248px, which
       * is precisely the class of bug worth catching. The `Foundations/Section` and
       * `Foundations/Container` stories measure exactly those values.
       */
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: at('.storybook'),
            // Matches the `storybook` script in package.json. The addon starts it when it is not
            // already running, so a local run does not require a second terminal.
            storybookScript: 'yarn storybook --no-open'
          })
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }]
          }
          // No `setupFiles`. Since Storybook 10.3 the addon applies the preview annotations itself —
          // the decorators, theme attribute and `layout` parameter from `.storybook/preview.tsx` —
          // and a setup file calling `setProjectAnnotations` is detected and warned about as a
          // conflict. Storybook 10.6 here, so this is handled.
        }
      }
    ]
  }
});
