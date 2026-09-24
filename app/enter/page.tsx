import type { Metadata } from 'next';

import CSSLayerDefinitions from '@/components/AaCSSLayerDefinitions';
import GuestEntry from '@/components/GuestEntry';
import Section from '@/components/Section';
import coupleNames from '@/helpers/coupleNames';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { WEDDING_SETTINGS_QUERY } from '@/tools/sanity/lib/queries.groq';
import type { IWeddingSettingsDocument } from '@/tools/sanity/schema/documents/weddingSettings';

import { enterSite } from './actions';

/**
 * The entry page every other page sends a guest to until they have entered their guest ID (see
 * `proxy.ts`). Outside the `(frontend)` group on purpose: its header and footer link to pages the
 * guest cannot open yet.
 */
const EnterPage = async ({ searchParams }: { searchParams: Promise<{ next?: string }> }) => {
  const [{ next }, settings] = await Promise.all([
    searchParams,
    sanityFetch<Partial<IWeddingSettingsDocument> | null>({ query: WEDDING_SETTINGS_QUERY, tags: ['weddingSettings'] })
  ]);

  return (
    <>
      <CSSLayerDefinitions />
      <main>
        <Section containerWidth="sm" name="enter" spacing="xl" theme="light">
          <GuestEntry action={enterSite} names={coupleNames(settings?.coupleNames)} next={next} />
        </Section>
      </main>
    </>
  );
};

export const metadata: Metadata = {
  robots: { follow: false, googleBot: { follow: false, index: false }, index: false },
  title: 'Welcome'
};

export default EnterPage;
