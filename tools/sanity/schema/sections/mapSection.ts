import { TbMap } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/MapSection/thumbnail.png';
import type { MapLocation } from '../../../helpers/mapLocation';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

/**
 * The ratios an editor can pick. `value` doubles as the SCSS module class suffix, so a value here
 * without a matching entry in `sections/MapSection/styles.module.scss` silently falls back to the
 * default — the two lists are kept side by side on purpose.
 *
 * `fullscreen` is not a ratio: it is the height of the viewport, whatever its shape.
 */
const MAP_ASPECT_RATIOS = [
  { title: 'Full screen (viewport height)', value: 'fullscreen' },
  { title: '21:9 — panoramic', value: '21x9' },
  { title: '16:9 — widescreen', value: '16x9' },
  { title: '3:2', value: '3x2' },
  { title: '4:3', value: '4x3' },
  { title: '1:1 — square', value: '1x1' },
  { title: '4:5 — portrait', value: '4x5' },
  { title: '3:4 — portrait', value: '3x4' },
  { title: '9:16 — tall', value: '9x16' }
] as const;

type MapAspectRatio = (typeof MAP_ASPECT_RATIOS)[number]['value'];

interface IMapSection {
  location?: MapLocation | null;
  /** The place's name or address — the map's accessible name and the marker's tooltip. */
  label?: string | null;
  aspectRatioDesktop?: MapAspectRatio | null;
  aspectRatioMobile?: MapAspectRatio | null;
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
    {
      description: 'The shape of the map on laptops and desktops.',
      group: 'styles',
      initialValue: '21x9',
      name: 'aspectRatioDesktop',
      options: { list: [...MAP_ASPECT_RATIOS] },
      title: 'Aspect Ratio — Desktop',
      type: 'string'
    },
    {
      description: 'The shape of the map on phones and small tablets.',
      group: 'styles',
      initialValue: '4x5',
      name: 'aspectRatioMobile',
      options: { list: [...MAP_ASPECT_RATIOS] },
      title: 'Aspect Ratio — Mobile',
      type: 'string'
    },
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
export type { IMapSection, MapAspectRatio };
