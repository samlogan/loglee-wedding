import { TbMap } from 'react-icons/tb';
import { defineType } from 'sanity';
import type { FieldDefinition } from 'sanity';

import type { MapLocation } from '../../../helpers/mapLocation';
import type { IButtonElement } from '../elements/button';

/**
 * The compact map card — a live map (or a static image), a corner badge and an address bar with an
 * "Open in maps" link. Rendered by `components/MapCard`.
 *
 * Lifted out of `faqSection` once a second place wanted the same card: the FAQ's left rail authors one
 * here, and the RSVP page builds one from `weddingSettings.venue`. The stored shape is unchanged from
 * the inline object it replaced, so existing FAQ content reads as before.
 *
 * ## `location` **or** `image`
 *
 * A location draws a live Google map through `components/Map`. The image is the fallback for a card
 * without one. In the FAQ, an empty location also falls back to the venue's pin in Wedding Settings —
 * see the section's projection — so the venue is pinned once for the whole site.
 */
interface IMapCard {
  location?: MapLocation | null;
  image?: SanityImageSimple | null;
  badge?: string | null;
  address?: string | null;
  link?: IButtonElement | null;
}

/**
 * The card's fields, exported so `mapSection` can offer the same chip, address and link beside its
 * own location without a second copy of the descriptions.
 */
const mapCardFields = [
  {
    description:
      'Search for the place, or drag the pin. Draws a live map; the zoom you leave the picker at is the zoom it opens at. Leave empty to use the venue location from Wedding Settings.',
    name: 'location',
    title: 'Location',
    type: 'geopoint'
  },
  {
    description: 'A static map image. Only used when there is no location to show.',
    name: 'image',
    title: 'Image',
    type: 'imageElementSimple'
  },
  {
    description:
      'The chip in the top-left corner — “Map · Sydney → Jamberoo, 90 min”. Shown exactly as typed, so any arrow or separator goes in the text.',
    name: 'badge',
    title: 'Badge Label',
    type: 'string'
  },
  {
    description:
      'The address in the bar along the bottom — “406 Jamberoo Mountain Rd”. Type it in normal case; it is displayed in uppercase mono automatically.',
    name: 'address',
    title: 'Address',
    type: 'string'
  },
  {
    description:
      'The “Open in maps” link in the bottom bar. Give it a label; leave the link empty to point it at the pinned location in Google Maps.',
    name: 'link',
    title: 'Maps Link',
    type: 'buttonElement'
  }
] satisfies FieldDefinition[];

const mapCard = defineType({
  fields: mapCardFields,
  icon: TbMap,
  name: 'mapCard',
  title: 'Map Card',
  type: 'object'
});

export default mapCard;
export { mapCardFields };
export type { IMapCard };
