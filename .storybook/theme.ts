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
 * These five hex values are the boilerplate's palette. A project built from this repo replaces its
 * tokens but inherits this file, so **the Storybook chrome stays the boilerplate's colours until
 * someone changes it here.** Nothing breaks and nothing warns; it just looks like a different
 * product's design system.
 *
 * `/project-setup` calls this out, and `/design-system-import` should update these alongside
 * `_variables.scss`. Keep the constant names pointing at the token they mirror, so the mapping stays
 * obvious when it is done by hand.
 */
const gray900 = '#111927'; // --gray-900, the dark surface
const gray800 = '#1f2a37'; // --gray-800, one step up for bars and borders
const gray100 = '#ccd1d1'; // --gray-100
const primary500 = '#7a5af8'; // --primary-500, brand
const white = '#ffffff';

const projectTheme = create({
  base: 'dark',

  brandTitle: 'Design System',
  brandUrl: '/',
  // Without this, Storybook computes `target = url === './' ? '' : '_blank'`, so clicking the logo
  // opens a new tab. Nobody wants that from a home link.
  brandTarget: '_self',

  // Chrome — sidebar, toolbar, and the surface behind the canvas.
  appBg: gray900,
  appContentBg: gray900,
  appPreviewBg: gray900,
  barBg: gray800,
  appBorderColor: gray800,
  appBorderRadius: 8,

  colorPrimary: primary500,
  /**
   * Check this one before changing it, and check it against *white*.
   *
   * Storybook renders the selected sidebar item as hardcoded white text on
   * `darken(0.18, colorSecondary)`, so a pale brand colour here is an accessibility failure in a
   * repo that ships `addon-a11y`. Measured for this palette: `#7a5af8` darkens to `#644acb`, which
   * is 6.21:1 against white — comfortably over AA. A paler brand colour would need a darker
   * substitute from the same family instead.
   */
  colorSecondary: primary500,

  textColor: white,
  textInverseColor: gray900,
  textMutedColor: gray100,

  barTextColor: gray100,
  barSelectedColor: white,
  barHoverColor: white,

  inputBg: gray800,
  inputBorder: gray800,
  inputTextColor: white,
  inputBorderRadius: 8
});

export default projectTheme;
