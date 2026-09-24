import { TbPlaneArrival } from 'react-icons/tb';
import { defineType } from 'sanity';

import { NATIONALITIES, NATIONALITY_TITLES } from '../../../helpers/nationality';
import type { Nationality } from '../../../helpers/nationality';

/**
 * A short travel note shown to guests of one nationality on their personal RSVP page — visas,
 * flights, the time difference.
 *
 * Exactly three exist, one each for the US, the UK and France, at fixed IDs
 * (`nationalityNote-us` etc., see `@/helpers/nationality`), and the Studio lists only those three:
 * there is no "create" for a fourth. A guest whose Nationality cell is anything else — or blank — is
 * shown no note, which is the rule, not a gap.
 */
interface INationalityNote {
  _id: string;
  _type: 'nationalityNote';
  nationality?: Nationality;
  title?: string;
  content?: SanityTextBlock[];
}

const nationalityNote = defineType({
  fields: [
    {
      description: 'Which guests see this note. Set by the document; it cannot be changed.',
      name: 'nationality',
      options: { list: NATIONALITIES.map((value) => ({ title: NATIONALITY_TITLES[value], value })) },
      readOnly: true,
      title: 'Nationality',
      type: 'string'
    },
    {
      description: 'The heading above the note, e.g. “Travelling from the US”.',
      name: 'title',
      title: 'Title',
      type: 'string'
    },
    {
      description: 'Visas, flights, the time difference — whatever these guests need to know.',
      name: 'content',
      title: 'Content',
      type: 'blockContentStandard'
    }
  ],
  icon: TbPlaneArrival,
  name: 'nationalityNote',
  preview: {
    prepare(selection: { nationality?: Nationality; title?: string }) {
      return {
        subtitle: selection.nationality ? NATIONALITY_TITLES[selection.nationality] : undefined,
        title: selection.title || 'Nationality note'
      };
    },
    select: { nationality: 'nationality', title: 'title' }
  },
  title: 'Nationality note',
  type: 'document'
});

export default nationalityNote;
export type { INationalityNote };
