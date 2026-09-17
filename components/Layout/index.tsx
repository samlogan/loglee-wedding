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
import { FOOTER_QUERY, HEADER_QUERY, SOCIAL_MEDIA_QUERY } from '@/tools/sanity/lib/queries.groq';
import type { IFooterDocument } from '@/tools/sanity/schema/documents/footerDocument';
import type { IHeaderDocument } from '@/tools/sanity/schema/documents/headerDocument';

import styles from './styles.module.scss';
import '@/sass/global/styles.scss';

const Layout = async (props: { children: ReactNode }) => {
  const { children } = props;
  const headerDocument = await sanityFetch<IHeaderDocument>({ query: HEADER_QUERY });
  const footerDocument = await sanityFetch<IFooterDocument>({ query: FOOTER_QUERY });
  const socialMediaDocument = await sanityFetch<{ socials?: { _key: string; name: string; link: string }[] }>({
    query: SOCIAL_MEDIA_QUERY
  });

  return (
    <>
      <CSSLayerDefinitions />
      <AccessibilityMenu />
      <WmAscii />
      <Header {...headerDocument} />
      <main>{children}</main>
      {(await draftMode()).isEnabled && <VisualEditing />}
      <Footer {...footerDocument} socials={socialMediaDocument?.socials} />
      <ModalPortal />
      <Scripts loadAll />
    </>
  );
};

export default Layout;
