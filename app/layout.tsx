import type { Viewport } from 'next';
import type { ReactNode } from 'react';

import '@/sass/global/styles.scss';
import fonts from '@/config/fonts';

/*
 * `data-theme` belongs on the document, not only on the things that paint a surface.
 *
 * Every theme-aware token in `_variables.scss` is declared under `[data-theme='light']` /
 * `['dark']`, never on `:root`. Until this was set, the only elements writing that attribute were
 * `Section`, `Header` and `Footer` — so anything rendered directly under `<body>` resolved *no*
 * theme token at all, and an undefined `var()` with no fallback is invalid at computed-value time,
 * which drops the whole declaration.
 *
 * `AccessibilityMenu` is exactly that: a direct child of the body fragment styled entirely from
 * `--bg-accent`, `--stroke-divider`, `--fg-default` and `--fg-link`. The skip bar therefore
 * rendered transparent with default black ink over whatever sat beneath it — the site's first
 * keyboard affordance, invisible in production, with nothing logged. The same root cause had
 * already deleted the site-wide focus ring (see `_reset.scss`) and made Storybook flash unthemed
 * for a second on every cold load (see `.storybook/preview.tsx`); this is the fix at the level all
 * three of them share.
 *
 * Declaring the default here changes nothing for anything that sets its own — `Section` and the two
 * chrome components still shadow it on their own subtree, which is how a dark section inside a
 * light page keeps working.
 */
const RootLayout = ({ children }: { children: ReactNode }) => (
  <html data-theme="light" lang="en-AU">
    <body className={fonts}>{children}</body>
  </html>
);

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: '#fff',
  width: 'device-width'
};

export default RootLayout;
