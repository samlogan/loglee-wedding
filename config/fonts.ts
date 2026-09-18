import { Archivo as HeadingFont, Instrument_Sans as BodyFont, JetBrains_Mono as MonoFont } from 'next/font/google';
import localFont from 'next/font/local';

// NextJS Fonts
// https://nextjs.org/docs/pages/building-your-application/optimizing/fonts

/* Google Fonts
 * Automatically self-host any Google Font. No requests are sent to Google by the browser.
 * Use variable fonts for the best performance and flexibility.
 * If the font is not variable, you will have to specify the font weights and styles you want to use.
 */

/*
 * Three type roles, taken from the Figma frames rather than the token export — Figma variables
 * do not carry font families.
 *
 *   Display  Archivo         oversized headings. The home page hero is Archivo Black at 176px,
 *                            which is why 900 is loaded and why --font-weight-black exists.
 *   Body     Instrument Sans navigation, body copy, buttons.
 *   Mono     JetBrains Mono  stats, times, tags, filenames and the game-style prompts —
 *                            "SELECT PLAYER", the player chips, the wordmark.
 *
 * Weights are only those the design actually uses. Loading more costs bytes for nothing.
 */

/*
 * Display font (Google Font)
 *
 * **Known gap, deliberately left alone here: `--heading-default-font-weight` is
 * `var(--font-weight-regular)` (400) and there is no Archivo 400 face below.** Every
 * `variant="heading"` therefore renders Archivo *Medium* — `TextBlock`'s h1–h4, `FaqSection`'s
 * title, the HTML sitemap. Measured at 100px: 300, 400 and 500 all come back
 * 788.97px wide, i.e. one face serving three requests.
 *
 * Unlike the body 600/700 case below this is **not** a synthesised face — 400 is *lighter* than the
 * lightest loaded weight, so CSS font matching falls back to 500 cleanly and nothing is skewed. It
 * is a token that says one thing and paints another, which is a design-system decision (load
 * Archivo 400, or re-point the token to `medium`) rather than a section's to make. The re-point is
 * the zero-risk half: it is a visual no-op, because 500 is already what paints.
 */
const headingFont = HeadingFont({
  adjustFontFallback: false,
  display: 'swap',
  style: ['normal'],
  subsets: ['latin'],
  variable: '--heading-font',
  weight: ['500', '700', '900']
});

/*
 * Body font (Google Font)
 *
 * Carries every weight the token layer can ask for, because a weight that is *used* but not loaded
 * is not a lighter-touch choice — the browser skews and smears the nearest lighter outlines into a
 * **synthesised** face rather than erroring, so it is visible but never reported.
 *
 *   400  `--body-default-font-weight`
 *   500  `--font-weight-medium`, via `Text`'s `weight="medium"` and `--button-font-weight`
 *   600  `--font-weight-semibold`, via `Text`'s public `weight="semibold"`
 *   700  `--body-bold-font-weight`, which the global `strong` rule consumes — reachable by any
 *        editor typing bold in a rich-text field, on every page
 *
 * 600 and 700 were both faux-bold before. Measured: `[...document.fonts]` held exactly two
 * Instrument Sans faces, 400 and 500, while `sections/ScheduleSection`'s event title computed
 * `font-weight: 600` — the design's Instrument Sans SemiBold (Figma node 1:333), rendered
 * synthetic. Note the test, because the obvious one lies: `document.fonts.check('600 …')` returns
 * `true` in that state. The **face list** is the test.
 *
 * Four static instances rather than the variable face: the variable file is larger than four
 * subsetted statics at this subset, and `display: 'swap'` means none of them block render.
 */
const bodyFont = BodyFont({
  adjustFontFallback: false,
  display: 'swap',
  style: ['normal'],
  subsets: ['latin'],
  variable: '--body-font',
  weight: ['400', '500', '600', '700']
});

// Monospace UI font (Google Font)
const monoFont = MonoFont({
  adjustFontFallback: false,
  display: 'swap',
  style: ['normal'],
  subsets: ['latin'],
  variable: '--mono-font',
  weight: ['400', '500', '700']
});

// Reference for a font that is not on Google Fonts — drop the .woff into assets/fonts and
// add its variable to the array below. All three roles above are Google Fonts, so this is unused.
// const localExample = localFont({
//   src: '../assets/fonts/helvetica-now-text.woff',
//   weight: '400',
//   style: 'normal',
//   display: 'swap',
//   variable: '--local-font'
// });

const fonts = [headingFont.variable, bodyFont.variable, monoFont.variable].join(' ');

export default fonts;
