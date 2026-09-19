import { TbMap } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/MapSection/thumbnail.png';
import type { MapLocation } from '../../../helpers/mapLocation';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import { aspectRatioFields } from '../common/aspectRatioFields';
import type { IAspectRatioFields } from '../common/aspectRatioFields';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

interface IMapSection extends IAspectRatioFields {
  location?: MapLocation | null;
  /** The place's name or address — the map's accessible name and the marker's tooltip. */
  label?: string | null;
}

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
      description:
        'Search for the place, or drag the pin. The zoom you leave the picker at is the zoom the map opens at.',
      group: 'data',
      name: 'location',
      title: 'Location',
      type: 'geopoint',
      validation: (Rule) => Rule.required()
    },
    {
      description:
        'The name or address of the place — “Jamberoo Valley Lodge”. Read out to screen-reader users as “Map of …” and shown when hovering the pin.',
      group: 'data',
      name: 'label',
      title: 'Place Name',
      type: 'string'
    },
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
    prepare(selection: { internalLabel?: string; label?: string }) {
      return {
        subtitle: selection?.internalLabel || selection?.label,
        title: 'Map Section'
      };
    },
    select: {
      internalLabel: 'internalLabel',
      label: 'label'
    }
  },
  title: 'Map',
  type: 'object'
});

export { mapSection };
export type { IMapSection };
