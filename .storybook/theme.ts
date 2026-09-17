import { create } from 'storybook/theming';

/**
 * Storybook's own chrome, themed to the project palette.
 *
 * Shared by the manager (sidebar, toolbar, canvas surround) and by the docs pages via
 * `parameters.docs.theme` in `preview.tsx`. The docs bundle is separate from the manager and
 * defaults to Storybook's stock light chrome otherwise, which reads as an unstyled page sitting
 * inside a themed app.
 *
 * Because the chrome is dark and the docs pages reuse the same object, **the docs pages are dark
 * too** — which is why `tools/storybook/docsChrome.ts` exports `DOCS_TEXT: '#ffffff'`. Chrome colour
 * and `DOCS_TEXT` are one decision: flip them together or the docs pages become unreadable.
 *
 * The values are **copied** from `tools/sass/global/_variables.scss` rather than referenced. The
 * manager renders in its own document, outside the preview iframe, so it cannot read the site's
 * custom properties; there is no way to point at the real tokens from here.
 *
 * ## This file is project-specific — update it during setup
 *
 * These hex values mirror this project's palette and were set during `/project-setup`. A project
 * built from this repo replaces its tokens but inherits this file, so **the Storybook chrome stays
 * the boilerplate's colours until someone changes it here.** Nothing breaks and nothing warns; it
 * just looks like a different product's design system.
 *
 * `/project-setup` calls this out, and `/design-system-import` should update these alongside
 * `_variables.scss`. Keep the constant names pointing at the token they mirror, so the mapping stays
 * obvious when it is done by hand.
 */
const pine900 = '#0b1c14'; // --pine-900, the dark surface
const pine800 = '#112a1e'; // --pine-800, one step up for bars and borders
const pine100 = '#c7dbcd'; // --pine-100, muted text on dark — mirrors fg/muted in the dark theme
const pine600 = '#1e4632'; // --pine-600, brand — mirrors fg/accent in the light theme
const pine500 = '#33654a'; // --pine-500, brand one step lighter, for the selected sidebar item
const white = '#ffffff';

const projectTheme = create({
  base: 'dark',

  brandTitle: 'Sam & Lauren',
  brandUrl: '/',
  // Without this, Storybook computes `target = url === './' ? '' : '_blank'`, so clicking the logo
  // opens a new tab. Nobody wants that from a home link.
  brandTarget: '_self',

  // Chrome — sidebar, toolbar, and the surface behind the canvas.
  appBg: pine900,
  appContentBg: pine900,
  appPreviewBg: pine900,
  barBg: pine800,
  appBorderColor: pine800,
  appBorderRadius: 8,

  colorPrimary: pine600,
  /**
   * Check this one before changing it, and check it against *white*.
   *
   * Storybook renders the selected sidebar item as hardcoded white text on
   * `darken(0.18, colorSecondary)`, so a pale brand colour here is an accessibility failure in a
   * repo that ships `addon-a11y`. Measured for this palette: `#33654a` darkens to `#14281d`, which
   * is 15.54:1 against white — comfortably over AA.
   *
   * Do **not** reach for the accent here. `signal/300` (`#d6ff3b`) is this project's brand accent
   * and the obvious-looking choice, but it darkens to `#b0de00` — **1.58:1** against white, a clear
   * failure. The accent is reserved for interactive states on the site, where it sits under dark
   * text; it is the wrong role for a surface that carries white text.
   *
   * `pine600` is used for `colorPrimary` above but darkens to near-black (`#020604`, 20.38:1),
   * which reads as a heavy slab behind the selected item — hence `pine500` here.
   */
  colorSecondary: pine500,

  textColor: white,
  textInverseColor: pine900,
  textMutedColor: pine100,

  barTextColor: pine100,
  barSelectedColor: white,
  barHoverColor: white,

  inputBg: pine800,
  inputBorder: pine800,
  inputTextColor: white,
  inputBorderRadius: 8
});

export default projectTheme;
