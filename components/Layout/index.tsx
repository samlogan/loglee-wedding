import { draftMode } from 'next/headers';
import type { ReactNode } from 'react';

import CSSLayerDefinitions from '@/components/AaCSSLayerDefinitions';
import AccessibilityMenu from '@/components/AccessibilityMenu';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ModalPortal from '@/components/Modal/ModalPortal';
import Scripts from '@/components/Scripts';
import VisualEditing from '@/components/VisualEditing';
import WmAscii from '@/components/WmAscii';
import { sanityFetch } from '@/tools/sanity/lib/fetch';
import {
  FOOTER_QUERY,
  HEADER_QUERY,
  SOCIAL_MEDIA_QUERY,
  WEDDING_SETTINGS_QUERY
} from '@/tools/sanity/lib/queries.groq';
import type { IFooterDocument } from '@/tools/sanity/schema/documents/footerDocument';
import type { IHeaderDocument } from '@/tools/sanity/schema/documents/headerDocument';
import type { IWeddingSettingsDocument } from '@/tools/sanity/schema/documents/weddingSettings';

import styles from './styles.module.scss';
import '@/sass/global/styles.scss';

const Layout = async (props: { children: ReactNode }) => {
  const { children } = props;
  const headerDocument = await sanityFetch<IHeaderDocument>({ query: HEADER_QUERY });
  const footerDocument = await sanityFetch<IFooterDocument>({ query: FOOTER_QUERY });
  const socialMediaDocument = await sanityFetch<{ socials?: { _key: string; name: string; link: string }[] }>({
    query: SOCIAL_MEDIA_QUERY
  });
  /*
   * `Partial<>` because `WEDDING_SETTINGS_QUERY` is a projection, not the document: it returns a
   * shaped object with null leaves for every field an editor has left blank, and the interface
   * declares several of them required. The header reads one field off it — `rsvpLabel` — and is
   * built to render without it.
   */
  const weddingSettings = await sanityFetch<Partial<IWeddingSettingsDocument> | null>({
    query: WEDDING_SETTINGS_QUERY
  });

  return (
    <>
      <CSSLayerDefinitions />
      <AccessibilityMenu />
      <WmAscii />
      <Header header={headerDocument?.header} rsvpLabel={weddingSettings?.rsvpLabel} />
      <main>{children}</main>
      {(await draftMode()).isEnabled && <VisualEditing />}
      <Footer {...footerDocument} socials={socialMediaDocument?.socials} />
      <ModalPortal />
      <Scripts loadAll />
    </>
  );
};

export default Layout;
