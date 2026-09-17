import { withThemeByDataAttribute } from '@storybook/addon-themes';
import type { Preview, ReactRenderer } from '@storybook/nextjs-vite';

import fonts from '@/config/fonts';
import { sectionDecorator } from '@/tools/storybook/sectionStory';

import projectTheme from './theme';

import '../tools/sass/global/styles.scss';
// Unlayered, so it must come after the global stylesheet it corrects.
import './overrides.css';

/**
 * Apply the `next/font` classes to `<body>` at module scope, not in a decorator.
 *
 * Two bugs live in the decorator version. Decorators do not run on docs pages, so `--body-font` is
 * empty there, which makes `font-family: var(--body-font), sans-serif` invalid at computed-value
 * time and drops the declaration entirely. And a decorator's cleanup calling `classList.remove` on
 * unmount breaks story pages too: a docs page mounts several stories that all add the same classes,
 * so the *first* unmount strips the fonts for every remaining story on the page.
 *
 * The classes must land on `<body>` itself, because the global stylesheet sets
 * `body { font-family: var(--body-font) }` and a nested wrapper leaves body's own declaration
 * resolving to an empty custom property.
 *
 * Note the layer order is declared in `main.ts`'s `previewHead`, not by importing
 * `AaCSSLayerDefinitions` here — that import is dropped by the bundler. See the comment there.
 */
if (typeof document !== 'undefined') {
  document.body.classList.add(...fonts.split(' ').filter(Boolean));
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    layout: 'fullscreen',
    /**
     * Accessibility violations are reported, not failed, under the Vitest addon.
     *
     * `'todo'` rather than `'error'` deliberately, and the reason is measured rather than assumed.
     * With `'error'` the suite is red on arrival with two failures, both `color-contrast` and both
     * the same root cause: the `secondary` and `tertiary` themes set `--fg-default` to white on
     * `--bg-default`, which resolves to `--secondary-500` (#ee46bc, 3.36:1) and `--tertiary-500`
     * (#3abe97, 2.33:1). AA wants 4.5:1 for body copy.
     *
     * That is a token decision for whoever owns the palette, not a code fix, and a suite that is red
     * on arrival for something nobody can resolve in the same change gets switched off. The four
     * `link-name` violations the same run found *were* code bugs and are fixed — an empty
     * `aria-label` on icon-only links in `Link`, `SocialsShare` and the `Card` overlay.
     *
     * Be clear about what `'todo'` does and does not do: the checks **run**, and violations appear in
     * the a11y panel in the Storybook UI, but they are **not printed by the CLI reporter**. This is a
     * signal you have to go and look at, not one that will find you.
     *
     * Ratchet to `'error'` once those two themes have a foreground that clears AA — on this palette
     * that is the whole remaining gap.
     */
    a11y: { test: 'todo' },
    // The docs bundle is separate from the manager and defaults to Storybook's stock light chrome,
    // which reads as an unstyled page inside a themed app. Reusing the one theme object keeps them
    // from drifting — and is why `docsChrome.ts` sets DOCS_TEXT to white.
    docs: {
      theme: projectTheme
    }
  },
  decorators: [
    withThemeByDataAttribute<ReactRenderer>({
      themes: {
        light: 'light',
        dark: 'dark',
        primary: 'primary',
        secondary: 'secondary',
        tertiary: 'tertiary'
      },
      defaultTheme: 'light',
      attributeName: 'data-theme',
      parentSelector: 'body'
    }),
    // Theme injection, the error boundary and the full-bleed marker for every `Sections/*` story.
    // Lives in tools/storybook/sectionStory.tsx so section story files can reason about it in one
    // place; see the notes there on why the theme is an arg rather than a wrapper.
    sectionDecorator,
    /*
     * Widen the docs preview for a non-section story that is genuinely full-width — site chrome like
     * a header or footer, which is capped at the 1000px reading column on a docs page even though
     * `layout: 'fullscreen'` gives it the full canvas on a story page.
     *
     * Opt in explicitly with `parameters: { fullBleed: true }`. It deliberately does **not** key off
     * `layout: 'fullscreen'`, because that is set globally above — so every story inherits it, and
     * keying on it marked roughly 76 of the 80 non-section stories, widening docs previews that are
     * better off at the narrower measure. An inherited default cannot express an opt-in.
     *
     * Sections get their marker from `sectionStory.tsx` instead, so this skips them.
     */
    (Story, context) => {
      const isSection = typeof context.title === 'string' && context.title.startsWith('Sections/');
      if (!isSection && context.parameters.fullBleed === true) {
        return (
          <div data-full-bleed>
            <Story />
          </div>
        );
      }
      return <Story />;
    }
  ]
};

export default preview;
