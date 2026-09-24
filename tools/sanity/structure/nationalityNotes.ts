import { TbPlaneArrival } from 'react-icons/tb';
import type { StructureBuilder } from 'sanity/structure';

import { NATIONALITIES, NATIONALITY_TITLES, nationalityNoteId } from '../../helpers/nationality';

/**
 * The three travel notes, as three fixed documents — no list to add to. A guest whose nationality is
 * not one of these is shown no note; see `tools/sanity/schema/documents/nationalityNote.ts`.
 */
const NationalityNotesMenuItem = (S: StructureBuilder) =>
  S.listItem()
    .title('Nationality notes')
    .icon(TbPlaneArrival)
    .child(() =>
      S.list()
        .title('Nationality notes')
        .items(
          NATIONALITIES.map((nationality) =>
            S.listItem()
              .title(NATIONALITY_TITLES[nationality])
              .icon(TbPlaneArrival)
              .child(S.document().schemaType('nationalityNote').documentId(nationalityNoteId(nationality)))
          )
        )
    );

export default NationalityNotesMenuItem;
