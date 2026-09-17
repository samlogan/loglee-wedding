import { TbWorld, TbLayoutNavbar, TbLayoutBottombar, TbBrandInstagram } from 'react-icons/tb';
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
          // Footer
          S.listItem()
            .title('Footer')
            .child(S.document().schemaType('footerDocument').documentId('footerDocument'))
            .icon(TbLayoutBottombar),
          // Social Media
          S.listItem()
            .title('Social Media')
            .child(S.document().schemaType('socialMediaDocument').documentId('socialMediaDocument'))
            .icon(TbBrandInstagram)
        ])
    );

export default GlobalMenuItem;
