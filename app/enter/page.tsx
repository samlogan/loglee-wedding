import type { Metadata } from 'next';

import CSSLayerDefinitions from '@/components/AaCSSLayerDefinitions';
import GuestEntry from '@/components/GuestEntry';
import Section from '@/components/Section';
import siteMetadata from '@/config/metadata';
import { couplePartners } from '@/helpers/coupleNames';
import formatDateRange from '@/helpers/formatDateRange';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { ENTRY_PAGE_QUERY } from '@/tools/sanity/lib/queries.groq';
import type { IWeddingSettingsDocument } from '@/tools/sanity/schema/documents/weddingSettings';

import { enterSite } from './actions';

type EntrySettings = Partial<Pick<IWeddingSettingsDocument, 'coupleNames' | 'startDate' | 'endDate' | 'entryImage'>> & {
  venueName?: string | null;
};

/**
 * The entry page every other page sends a guest to until they have entered their guest ID (see
 * `proxy.ts`). Outside the `(frontend)` group on purpose: its header and footer link to pages the
 * guest cannot open yet.
 */
const EnterPage = async ({ searchParams }: { searchParams: Promise<{ next?: string }> }) => {
  const [{ next }, settings] = await Promise.all([
    searchParams,
    sanityFetch<EntrySettings | null>({ query: ENTRY_PAGE_QUERY, tags: ['weddingSettings'] })
  ]);

  return (
    <>
      <CSSLayerDefinitions />
      <main>
        <Section containerWidth="sm" name="enter" spacing="lg" theme="light">
          <GuestEntry
            action={enterSite}
            date={formatDateRange(settings?.startDate, settings?.endDate, { style: 'numeric' })}
            image={settings?.entryImage}
            next={next}
            partners={couplePartners(settings?.coupleNames)}
            summary={[formatDateRange(settings?.startDate, settings?.endDate), settings?.venueName]
              .filter(Boolean)
              .join(' · ')}
          />
        </Section>
      </main>
    </>
  );
};

/*
 * The link preview. Every page is behind the guest gate, so WhatsApp, iMessage and the rest — which
 * fetch a shared link without a guest cookie — are redirected here whichever page was shared, and
 * this page's Open Graph tags are the preview everyone sees. It sits outside the `(frontend)` layout,
 * so it states them itself rather than inheriting the site's.
 */
const PREVIEW_TITLE = 'Sam & Lauren are getting married';

export const metadata: Metadata = {
  description: siteMetadata.description,
  metadataBase: siteMetadata.metadataBase,
  openGraph: { ...siteMetadata.openGraph, title: PREVIEW_TITLE },
  robots: { follow: false, googleBot: { follow: false, index: false }, index: false },
  title: 'Welcome',
  twitter: { ...siteMetadata.twitter, title: PREVIEW_TITLE }
};

export default EnterPage;
