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

// Body font (Google Font)
const bodyFont = BodyFont({
  adjustFontFallback: false,
  display: 'swap',
  style: ['normal'],
  subsets: ['latin'],
  variable: '--body-font',
  weight: ['400', '500']
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
