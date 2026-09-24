import { TbBuildingBank, TbPlaneArrival } from 'react-icons/tb';
import type { StructureBuilder } from 'sanity/structure';

import { NATIONALITIES, NATIONALITY_TITLES, nationalityNoteId } from '../../helpers/nationality';

/**
 * What a guest sees depending on their nationality: how they pay (the Australian account or Wise —
 * see `paymentDetails`) and, for the US, the UK and France, a travel note. The notes are three fixed
 * documents — no list to add to. A guest whose nationality is not one of these is shown no note; see
 * `tools/sanity/schema/documents/nationalityNote.ts`.
 */
const NationalityNotesMenuItem = (S: StructureBuilder) =>
  S.listItem()
    .title('Nationalities & payment')
    .icon(TbPlaneArrival)
    .child(() =>
      S.list()
        .title('Nationalities & payment')
        .items([
          S.listItem()
            .title('Payment details')
            .icon(TbBuildingBank)
            .child(S.document().schemaType('paymentDetails').documentId('paymentDetails')),
          S.divider(),
          ...NATIONALITIES.map((nationality) =>
            S.listItem()
              .title(`Travel note — ${NATIONALITY_TITLES[nationality]}`)
              .icon(TbPlaneArrival)
              .child(S.document().schemaType('nationalityNote').documentId(nationalityNoteId(nationality)))
          )
        ])
    );

export default NationalityNotesMenuItem;
