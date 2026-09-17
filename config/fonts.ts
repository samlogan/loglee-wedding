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

// Display font (Google Font)
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
 * 600 is loaded because `Text`'s public `weight="semibold"` resolves to it
 * (`components/Text/styles.module.scss` → `--font-weight-semibold: 600`), and a weight the API
 * offers but the family does not carry is not a lighter-touch choice — it is a **synthesised**
 * face. The browser skews and smears the 500 outlines rather than falling back, so the difference
 * is visible rather than silent, and it is the one thing the design tokens cannot express.
 *
 * Measured before adding it: `[...document.fonts]` held exactly two Instrument Sans faces, 400 and
 * 500, while `sections/ScheduleSection`'s event title computed `font-weight: 600` — the design's
 * Instrument Sans SemiBold (Figma node 1:333), rendered synthetic. `document.fonts.check('600 …')`
 * returns `true` in that state, so it is not the test; the face list is.
 *
 * Note that this is the *same* trap `--button-font-weight` documents from the other side in
 * `tools/sass/global/_variables.scss` — that one resolved it by asking for a weight that was
 * loaded, because the design's buttons are drawn Medium. Here the design genuinely draws SemiBold,
 * so the face is what has to move.
 */
const bodyFont = BodyFont({
  adjustFontFallback: false,
  display: 'swap',
  style: ['normal'],
  subsets: ['latin'],
  variable: '--body-font',
  /*
   * Every weight the token layer can ask for, because a weight that is used but not loaded is
   * silently synthesised by the browser rather than erroring.
   *
   * `600` is `--font-weight-semibold`, reachable through `Text`'s public `weight="semibold"`.
   * `700` is `--body-bold-font-weight`, which the global `strong` rule consumes — so it is reachable
   * by any editor typing bold in a rich-text field, on every page. Both were rendering a faux-bold
   * before: `document.fonts` held only the 400 and 500 faces while the element computed 600.
   *
   * `document.fonts.check('600 …')` returns `true` in that state, so it is not the test — the face
   * list is.
   *
   * Four static instances rather than the variable face: the variable file is larger than four
   * subsetted statics at this subset, and `display: 'swap'` means none of them block render.
   */
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
