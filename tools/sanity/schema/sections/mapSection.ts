import { TbMap } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/MapSection/thumbnail.png';
import type { MapLocation } from '../../../helpers/mapLocation';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import { aspectRatioFields } from '../common/aspectRatioFields';
import type { IAspectRatioFields } from '../common/aspectRatioFields';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import sectionWidthField from '../common/sectionWidthField';
import type { ISectionWidthField } from '../common/sectionWidthField';
import { mapCardFields } from '../objects/mapCard';
import type { IMapCard } from '../objects/mapCard';

/**
 * A full-bleed map with the FAQ card's furniture over it — the corner chip, and the address bar with
 * its "Open in maps" link — drawn by the same `components/MapCard`.
 */
interface IMapSection extends IAspectRatioFields, ISectionWidthField, Pick<IMapCard, 'address' | 'badge' | 'link'> {
  /** Optional heading above the map — the markup string `TitleInput` stores. */
  title?: string | null;
  /** Optional copy beside the heading. */
  content?: SanityTextBlock[] | null;
  location?: MapLocation | null;
  /**
   * Superseded by `address`, which is shown in the bar and names the map. Read as the address when
   * that is empty, so a section saved before the bar existed keeps its name; hidden in the Studio
   * once it is blank.
   */
  label?: string | null;
}

/** The chip, the address and the link, exactly as the FAQ card defines them. */
const cardFields = mapCardFields
  .filter((field) => ['badge', 'address', 'link'].includes(field.name))
  .map((field) => ({ ...field, group: 'data' }));

const mapSection = defineType({
  fields: [
    internalLabelField,
    {
      name: 'sectionPreview',
      title: 'Section Preview',
      type: 'image',
      components: { input: ReadOnlyImageInput },
      // @ts-expect-error -- `imageUrl` is read by ReadOnlyImageInput, not by Sanity's image type
      imageUrl: thumbnail.src,
      readOnly: true,
      group: 'internal'
    },
    {
      description: 'Optional. Shown above the map.',
      group: 'data',
      name: 'title',
      title: 'Title',
      type: 'title'
    },
    {
      description: 'Optional. A short paragraph beside the title — directions, parking, how long the drive is.',
      group: 'data',
      name: 'content',
      title: 'Content',
      type: 'blockContentSimple'
    },
    {
      description:
        'Search for the place, or drag the pin. The zoom you leave the picker at is the zoom the map opens at.',
      group: 'data',
      name: 'location',
      title: 'Location',
      type: 'geopoint',
      validation: (Rule) => Rule.required()
    },
    ...cardFields,
    {
      description: 'Replaced by the Address field above. Used as the address only while that is empty.',
      group: 'data',
      hidden: ({ value }) => !value,
      name: 'label',
      title: 'Place Name (old)',
      type: 'string'
    },
    sectionWidthField,
    ...aspectRatioFields({ desktop: '21x9', mobile: '4x5' }),
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbMap,
  name: 'mapSection',
  preview: {
    prepare(selection: { address?: string; internalLabel?: string; label?: string }) {
      return {
        subtitle: selection?.internalLabel || selection?.address || selection?.label,
        title: 'Map Section'
      };
    },
    select: {
      address: 'address',
      internalLabel: 'internalLabel',
      label: 'label'
    }
  },
  title: 'Map Section',
  type: 'object'
});

export { mapSection };
export type { IMapSection };
