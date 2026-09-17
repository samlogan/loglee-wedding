import { Instrument_Sans as HeadingFont, Inter as BodyFont } from 'next/font/google';
import localFont from 'next/font/local';

// NextJS Fonts
// https://nextjs.org/docs/pages/building-your-application/optimizing/fonts

/* Google Fonts
 * Automatically self-host any Google Font. No requests are sent to Google by the browser.
 * Use variable fonts for the best performance and flexibility.
 * If the font is not variable, you will have to specify the font weights and styles you want to use.
 */

// Primary font (Google Font)
const headingFont = HeadingFont({
  adjustFontFallback: false,
  display: 'swap',
  style: ['normal'],
  subsets: ['latin'],
  variable: '--heading-font',
  weight: ['400', '700']
});

// Secondary Font (Google Font)
const bodyFont = BodyFont({
  adjustFontFallback: false,
  display: 'swap',
  style: ['normal'],
  subsets: ['latin'],
  variable: '--body-font',
  weight: ['400', '700']
});

// Tertiary Font (Local font)
// const tertiaryFont = localFont({
//   src: '../assets/fonts/helvetica-now-text.woff',
//   weight: '400',
//   style: 'normal',
//   display: 'swap',
//   variable: '--tertiary-font'
// });

const fonts = [
  headingFont.variable,
  bodyFont.variable
  // tertiaryFont.variable
].join(' ');

export default fonts;
