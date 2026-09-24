import { TbMailForward } from 'react-icons/tb';
import type { StructureBuilder } from 'sanity/structure';

// Each send is a record, newest first: create one, pick the email, publish — publishing sends it.
const GuestEmailsMenuItem = (S: StructureBuilder) =>
  S.listItem()
    .title('Guest emails')
    .icon(TbMailForward)
    .child(() =>
      S.documentTypeList('guestEmailSend')
        .title('Guest emails')
        .defaultOrdering([{ direction: 'desc', field: '_createdAt' }])
    );

export default GuestEmailsMenuItem;
