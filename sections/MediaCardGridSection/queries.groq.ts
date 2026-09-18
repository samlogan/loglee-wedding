import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
import imageProjection from '@/tools/sanity/projections/common/image.groq';

/**
 * Flat, single-document, no joins — every field is authored on the section itself.
 *
 * ## `_key` is projected, and it is the only field here that is not content
 *
 * The component keys the cards by it. Sanity writes a `_key` on every member of an array of objects,
 * but a projection only returns the keys it asks for, so omitting it hands the component a list with
 * nothing stable to key by and forces an index key — which is the one thing that breaks when an
 * editor reorders the grid in Presentation, since React would then keep the old card's DOM (and its
 * loaded photograph) in the old position.
 *
 * `hours` is an array of plain strings and needs no sub-projection; the same is true of `title`,
 * which is the markup string the `title` element stores and `stripTitleTags` unwraps.
 *
 * ## `image` takes the shared sub-projection rather than being left bare
 *
 * A bare `image` returns the raw field — `{ _type, asset: { _ref } }` — and `_ref` is not a URL.
 * `components/Image` guards on `asset.url`, so an unprojected image renders nothing at all and
 * `MediaCard` silently drops the whole media band and its caption with it. The shared projection
 * dereferences the asset and keeps the field list explicit; see the note in it for why a bare
 * `asset->{...}` is not an option.
 *
 * That same projection is what makes `yarn storybook:fixtures` work here without any generator
 * change: the fixture pass reuses the app's `sectionsProjection`, so once a `mediaCardGridSection`
 * is published the story's real-asset fixture appears on its own.
 */
const mediaCardGridSectionProjection = groq`
  _type == 'mediaCardGridSection' => {
    tagline,
    title,
    content[]${blockContentProjection},
    cards[]{
      _key,
      caption,
      content[]${blockContentProjection},
      hours,
      image${imageProjection},
      label,
      theme,
      title
    }
  },
`;

export default mediaCardGridSectionProjection;
