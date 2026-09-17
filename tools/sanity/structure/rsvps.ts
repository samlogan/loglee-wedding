import { TbMailCheck } from 'react-icons/tb';
import type { StructureBuilder } from 'sanity/structure';

// Replies land here newest first. The documents are read-only and written only by the RSVP server
// action, so the list is an inbox to read rather than a collection to edit.
const RsvpsMenuItem = (S: StructureBuilder) =>
  S.listItem()
    .title('RSVPs')
    .icon(TbMailCheck)
    .child(() =>
      S.documentTypeList('rsvp')
        .title('RSVPs')
        .defaultOrdering([{ direction: 'desc', field: 'submittedAt' }])
        .menuItems(S.documentTypeList('rsvp').getMenuItems())
    );

export default RsvpsMenuItem;
