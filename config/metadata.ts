import type { Metadata } from 'next';

import openGraphImage from '@/assets/images/open-graph.jpg';

import website from './website';

const metadata: Metadata = {
  applicationName: website.siteName,
  authors: [{ name: website.author }],
  creator: website.author,
  description: website.description,
  formatDetection: {
    address: false,
    email: false,
    telephone: false
  },
  generator: website.siteName,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || ''),
  openGraph: {
    description: website.description,
    images: [
      {
        height: openGraphImage.height,
        url: process.env.NEXT_PUBLIC_SITE_URL + openGraphImage.src,
        width: openGraphImage.width
      }
    ],
    locale: website.ogLanguage,
    siteName: website.siteName,
    title: website.title,
    type: 'website',
    url: process.env.NEXT_PUBLIC_SITE_URL
  },
  publisher: website.author,
  // The large card, so a shared link shows the whole image rather than a thumbnail beside the title.
  twitter: {
    card: 'summary_large_image',
    description: website.description,
    images: [process.env.NEXT_PUBLIC_SITE_URL + openGraphImage.src],
    title: website.title
  },
  referrer: 'origin-when-cross-origin',
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1
    },
    index: true,
    nocache: true
  },
  title: website.title
};

export default metadata;
