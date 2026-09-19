import { draftMode } from 'next/headers';
import type { ReactNode } from 'react';

import CSSLayerDefinitions from '@/components/AaCSSLayerDefinitions';
import AccessibilityMenu from '@/components/AccessibilityMenu';
import CountdownBanner from '@/components/CountdownBanner';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ModalPortal from '@/components/Modal/ModalPortal';
import Scripts from '@/components/Scripts';
import type { SocialsProps } from '@/components/Socials';
import VisualEditing from '@/components/VisualEditing';
import WmAscii from '@/components/WmAscii';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import { HEADER_QUERY, SOCIAL_MEDIA_QUERY, WEDDING_SETTINGS_QUERY } from '@/tools/sanity/lib/queries.groq';
import type { IHeaderDocument } from '@/tools/sanity/schema/documents/headerDocument';
import type { IWeddingSettingsDocument } from '@/tools/sanity/schema/documents/weddingSettings';

import styles from './styles.module.scss';
import '@/sass/global/styles.scss';

const Layout = async (props: { children: ReactNode }) => {
  const { children } = props;

  /*
   * Three singletons, fetched together rather than one after another.
   *
   * None of them reads the previous one's result, so awaiting them in sequence bought nothing and
   * cost two round trips of TTFB on every render. It is not only a draft-mode concern: `sanityFetch`
   * drops to the live API with `revalidate: 0` in development *and* in drafts perspective, so in
   * both of those this was three uncached calls to api.sanity.io before a byte of the page streamed.
   *
   * The types, in order:
   *
   * - `socialMediaDocument` is typed as `Socials` consumes it rather than as a bare
   *   `{ name: string }`. The Studio constrains `socialMediaItem.name` to the five platform values,
   *   which are the icon keys — so the narrow type is the true one, and stating it here is what
   *   retired the `as any` the footer used to spread through. An unrecognised value is still
   *   handled rather than assumed away: `Icon` renders nothing for a key it does not have.
   * - `weddingSettings` is `Partial<>` because `WEDDING_SETTINGS_QUERY` is a projection, not the
   *   document: it returns a shaped object with null leaves for every field an editor has left
   *   blank, and the interface declares several of them required. The header reads one field off it
   *   — `rsvpLabel` — and the footer three more; both are built to render without them.
   */
  const [headerDocument, socialMediaDocument, weddingSettings] = await Promise.all([
    sanityFetch<IHeaderDocument>({ query: HEADER_QUERY }),
    sanityFetch<{ socials?: SocialsProps['socials'] }>({ query: SOCIAL_MEDIA_QUERY }),
    sanityFetch<Partial<IWeddingSettingsDocument> | null>({ query: WEDDING_SETTINGS_QUERY })
  ]);

  /*
   * One list, rendered twice.
   *
   * `headerDocument.header` goes to both the bar and the foot, on purpose and on adjacent lines.
   * The footer used to have its own `sitemap` field on a `footerDocument` singleton — a second copy
   * of the same five links that nothing kept in step, and which the component never rendered
   * anyway. Passing the same expression to both is the only version of "these cannot drift" that
   * does not depend on somebody remembering.
   */
  const header = headerDocument?.header;

  return (
    <>
      <CSSLayerDefinitions />
      <AccessibilityMenu />
      <WmAscii />
      <CountdownBanner />
      <Header header={header} rsvpLabel={weddingSettings?.rsvpLabel} />
      <main>{children}</main>
      {(await draftMode()).isEnabled && <VisualEditing />}
      <Footer
        endDate={weddingSettings?.endDate}
        header={header}
        socials={socialMediaDocument?.socials}
        startDate={weddingSettings?.startDate}
        venue={weddingSettings?.venue}
      />
      <ModalPortal />
      <Scripts loadAll />
    </>
  );
};

export default Layout;
