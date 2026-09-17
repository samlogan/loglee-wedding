import type { Viewport } from 'next';
import type { ReactNode } from 'react';

import '@/sass/global/styles.scss';
import fonts from '@/config/fonts';

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en-AU">
    <body className={fonts}>{children}</body>
  </html>
);

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: '#fff',
  width: 'device-width'
};

export default RootLayout;
