import { TbWorld, TbLayoutNavbar, TbBrandInstagram } from 'react-icons/tb';
import type { StructureBuilder } from 'sanity/structure';

const GlobalMenuItem = (S: StructureBuilder) =>
  S.listItem()
    .title('Global')
    .icon(TbWorld)
    .child(() =>
      S.list()
        .title('Global Data')
        .items([
          // Header
          S.listItem()
            .title('Header')
            .child(S.document().schemaType('headerDocument').documentId('headerDocument'))
            .icon(TbLayoutNavbar),
          /*
           * No Footer entry. `components/Footer` renders the header's own `navItems` plus the date
           * and venue from Wedding Settings, so there is nothing here an editor could fill in — the
           * `footerDocument` singleton that used to sit here held a `sitemap` and a `disclaimer`
           * that nothing rendered. Both of the documents it now reads from are still in this list.
           */
          // Social Media
          S.listItem()
            .title('Social Media')
            .child(S.document().schemaType('socialMediaDocument').documentId('socialMediaDocument'))
            .icon(TbBrandInstagram)
        ])
    );

export default GlobalMenuItem;
