import { groq } from 'next-sanity';

import imageProjection from '@/tools/sanity/projections/common/image.groq';

/**
 * Three fields, one of them through the shared image sub-projection.
 *
 * `imageProjection` is the only non-trivial part: it dereferences the asset and pulls the five
 * fields the image pipeline actually reads (`_id`, `url`, `altText`, `metadata.dimensions`,
 * `metadata.lqip`) plus `crop`/`hotspot`, rather than spreading the whole asset document. The
 * hotspot is load-bearing here and not merely inherited — the frame is roughly 2.3:1 and
 * `object-fit: cover` takes a slice out of the middle of anything taller, so without the crop and
 * hotspot keys an editor's framing decision never reaches the browser.
 *
 * It also projects `aspectRatio`, which this section's `imageElementSimple` field does not have.
 * That is harmless rather than sloppy: the key resolves falsy and `components/Image` falls through
 * to `ratio_natural`, which is the branch this section wants — the frame owns the ratio, not the
 * image. Left as the shared projection rather than hand-rolling a narrower one, because a
 * per-section copy of the asset field list is how the two drift.
 *
 * `caption` and `tags` need no sub-projection: a plain string and an array of plain strings project
 * as they are, the same as `headerDisplaySection.items` and `twoColumnListSection.items`.
 */
const mediaTagsSectionProjection = groq`
  _type == 'mediaTagsSection' => {
    image${imageProjection},
    caption,
    tags
  },
`;

export default mediaTagsSectionProjection;
