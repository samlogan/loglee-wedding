import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/nextjs-vite';
import remarkGfm from 'remark-gfm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const config: StorybookConfig = {
  framework: {
    name: '@storybook/nextjs-vite',
    options: {
      // Exclude SVGs from the framework's next/image handling so vite-plugin-svgr
      // (configured in viteFinal) can import them as React components — matching
      // the project's Turbopack `*.svg → @svgr/webpack` rule. Without this the
      // image plugin claims every bare `.svg` import and returns a `{ src }`
      // object, forcing the Icon/Logo components down their next/image branch
      // (so icons render as <img> and can't inherit currentColor or be themed).
      image: {
        excludeFiles: ['**/*.svg']
      }
    }
  },
  stories: [
    // MDX first so the Foundations pages sort above the component stories in the sidebar.
    '../tools/storybook/docs/**/*.mdx',
    '../components/**/*.stories.@(ts|tsx)',
    '../sections/**/*.stories.@(ts|tsx)'
  ],
  addons: [
    '@storybook/addon-a11y',
    // Runs every story as a component test under Vitest, in a real browser via Playwright.
    // See vitest.config.ts — the `storybook` project gets its whole Vite config from this file.
    '@storybook/addon-vitest',
    '@storybook/addon-themes',
    {
      name: '@storybook/addon-docs',
      options: {
        // Without GFM a markdown table in an MDX page renders as literal pipe characters, and the
        // Foundations/Design System pages are mostly tables — load-bearing rather than cosmetic.
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm]
          }
        }
      }
    },
    '@storybook/addon-designs'
  ],
  /**
   * Establish the cascade layer order before any bundled CSS is parsed.
   *
   * `preview.tsx` used to rely on importing `AaCSSLayerDefinitions/styles.module.scss` first, which
   * declares `@layer global, defaults;` — the trick that works in Next.js, where the `Aa-` prefix
   * sorts the component first. It does **not** survive this build: the module is imported for its
   * side effect only, nothing references its `.layers` class, and the whole chunk is dropped.
   * Neither the declaration nor the class appears anywhere in `storybook-static/assets/*.css`.
   *
   * Without the declaration, layer order falls back to first appearance, which put `defaults` first
   * and let the global reset's `padding: 0` beat every `@layer defaults` component style. The
   * symptom is `Section` rendering every spacing token as `0px` — invisible until you measure
   * computed padding, so verify it early if you touch this.
   *
   * An inline `<style>` in the preview head is parsed before any bundled stylesheet, so the order
   * holds regardless of how Vite chunks or orders the CSS.
   */
  previewHead: (head) => `${head}
    <style>@layer global, defaults;</style>
  `,
  /**
   * The modal portal target, present in the DOM before React renders anything.
   *
   * `Modal` calls `createPortal(…, document.querySelector('#modal'))` **during render**, and React
   * commits DOM only after the whole tree has rendered. A decorator rendering `<ModalPortal />` as a
   * sibling of the story therefore does not help: both are in the same render pass, so the node does
   * not exist yet when the modal looks for it. Under the Vitest runner that surfaces as "Target
   * container is not a DOM element" — intermittently, because whether it fails depends on how the
   * `next/dynamic` entry happens to resolve on that run.
   *
   * Putting it in `previewBody` matches the app, where `Layout` mounts it as part of the page rather
   * than alongside the modal. The two inline properties are the whole of
   * `components/Modal/ModalPortal/styles.module.scss`.
   */
  previewBody: (body) => `${body}
    <div id="modal" style="position:relative;z-index:1003"></div>
  `,
  // '../public' is shared with the Next.js app; './static' is Storybook-only (see .storybook/static/_headers).
  staticDirs: ['../public', './static'],
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript'
  },
  async viteFinal(viteConfig) {
    const { default: svgr } = await import('vite-plugin-svgr');

    viteConfig.plugins = viteConfig.plugins ?? [];

    /**
     * Swap modules Storybook cannot render for a `.mock.` sibling, keyed on the **resolved absolute
     * path** rather than the import specifier.
     *
     * The specifier is the wrong key: `@storybook/nextjs-vite` applies the tsconfig `@/*` paths
     * before this hook runs, so `@/components/Foo` arrives already rewritten and a string comparison
     * never fires. That failure is silent and expensive — an async server component whose fetch
     * chain throws on a missing read token *at module scope* kills the whole story file on import,
     * whether or not the component ever renders.
     *
     * Add async server components (anything fetching from Sanity) and `'use server'` modules here as
     * the project grows, alongside an `index.mock.tsx` / `actions.mock.ts` sibling.
     */
    const mocksByRealPath = new Map(
      (
        [
          // The shipped fallback is a 1×1 transparent PNG, which is right in production — a broken
          // image should take up no room — and useless in Storybook, where it is indistinguishable
          // from a component that renders no image at all. Swapped for a visible light-grey block so
          // a missing image reads as a missing image. Storybook only; the site keeps the 1×1.
          ['assets/images/fallback.png', '.storybook/image-placeholder.png']
        ] as const
      ).map(([real, mock]) => [path.resolve(root, real), path.resolve(root, mock)])
    );

    viteConfig.plugins.unshift({
      name: 'mock-server-components',
      enforce: 'pre',
      async resolveId(id, importer, options) {
        // Two lookups, because two different things can have happened by the time this runs.
        //
        // Vite applies `resolve.alias` before any plugin, so a `@/…` specifier usually arrives here
        // already rewritten to an absolute path — check that first. Doing only the resolve below is
        // not enough for static images: `@storybook/nextjs-vite` rewrites those into
        // `virtual:next-image:<base64>` modules, so `this.resolve` hands back a virtual id that
        // matches nothing in the map and the swap silently does not happen.
        const direct = mocksByRealPath.get(id.split('?')[0]);
        if (direct) {
          // Resolved through the pipeline rather than returned as a bare path, so the rest of the
          // plugin chain still gets to process it. That matters for the image: returning the path
          // outright skips the framework's static-image handling, and `fallback` arrives as a URL
          // string where `ImageSanity` reads `.src` off an object.
          return (await this.resolve(direct, importer, { ...options, skipSelf: true })) ?? direct;
        }
        // Otherwise resolve normally and swap the result. `skipSelf` stops this recursing.
        const resolved = await this.resolve(id, importer, { ...options, skipSelf: true });
        if (!resolved) {
          return null;
        }
        const swap = mocksByRealPath.get(resolved.id.split('?')[0]);
        return swap ? ((await this.resolve(swap, importer, { ...options, skipSelf: true })) ?? swap) : null;
      }
    });

    // Unshift (not push) so SVGR claims `.svg` modules before
    // @storybook/nextjs-vite's built-in handler, which otherwise imports SVGs
    // as static image objects (`{ src }`) — that makes the Icon/Logo components
    // take their `next/image` branch instead of rendering inline `<svg>`, so
    // icons can't inherit `currentColor` or respond to the `color` prop.
    // `exportType: 'default'` matches the project's Turbopack SVGR rule, where
    // `import Icon from './icon.svg'` is a React component.
    viteConfig.plugins.unshift(
      svgr({
        include: '**/*.svg',
        svgrOptions: { exportType: 'default' }
      })
    );

    viteConfig.resolve = viteConfig.resolve ?? {};
    viteConfig.resolve.alias = {
      ...viteConfig.resolve.alias,
      '@/helpers': path.resolve(root, 'tools/helpers'),
      '@/hooks': path.resolve(root, 'tools/hooks'),
      '@/sanity': path.resolve(root, 'tools/sanity'),
      '@/projections': path.resolve(root, 'tools/sanity/projections'),
      '@/sass': path.resolve(root, 'tools/sass'),
      '@/types': path.resolve(root, 'types'),
      '@/assets': path.resolve(root, 'assets'),
      '@/config': path.resolve(root, 'config'),
      '@': root
    };

    const resourcesImport = `@import "${path.resolve(root, 'tools/sass/base/resources').replaceAll('\\', '/')}";`;

    viteConfig.css = viteConfig.css ?? {};
    viteConfig.css.preprocessorOptions = {
      ...viteConfig.css.preprocessorOptions,
      scss: {
        // Inject the global resources AFTER any leading `@use`/`@forward` rules. Sass requires those
        // to precede every other statement, so a module opening with e.g. `@use 'sass:math'` fails
        // to compile if the import is blindly prepended. Splicing it in after the leading load rules
        // keeps both valid.
        additionalData: (source: string) => {
          // Leading comments count as "before the load rules". A module opening with a `//` or
          // `/* */` comment above its `@use` would otherwise not match, and the import would be
          // spliced in above the `@use` — which Sass rejects, since load rules must come first.
          const leadingLoadRules = /^(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*(?:@(?:use|forward)\b[^;]*;\s*)+/;
          const match = source.match(leadingLoadRules);
          if (match) {
            return `${match[0]}${resourcesImport}${source.slice(match[0].length)}`;
          }
          return `${resourcesImport}${source}`;
        },
        silenceDeprecations: ['legacy-js-api', 'import']
      }
    };

    return viteConfig;
  }
};

export default config;
