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
           * No Footer entry. `components/Footer` renders the header's own `navItems`, the date and
           * venue from Wedding Settings, and the icons from Social Media — so there is nothing here
           * an editor could fill in that is not already edited somewhere else. The `footerDocument`
           * singleton that used to sit here held a `sitemap` and a `disclaimer` that nothing
           * rendered.
           *
           * Two of its three sources are in this list; Wedding Settings is its own top-level item
           * (`tools/sanity/structure/weddingSettings.ts`), so every field the footer shows is still
           * reachable in the Studio.
           */
          // Social Media
          S.listItem()
            .title('Social Media')
            .child(S.document().schemaType('socialMediaDocument').documentId('socialMediaDocument'))
            .icon(TbBrandInstagram)
        ])
    );

export default GlobalMenuItem;
