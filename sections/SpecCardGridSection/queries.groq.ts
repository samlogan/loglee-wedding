import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';
import imageProjection from '@/tools/sanity/projections/common/image.groq';

/**
 * One array, projected field by field.
 *
 * `cards[]{…}` rather than a bare `cards`, for the reason `image.groq` gives about `asset->`: an
 * unprojected array returns every key on every member, and an array member carries `_type` plus
 * whatever a previous schema revision left behind. Naming the six fields keeps this section's
 * contribution to the page query proportional to what it renders — `yarn audit:projections` counts
 * the difference.
 *
 * `title` needs no sub-projection: the `title` element is a plain string holding an HTML tag, which
 * the renderer strips. `footnotes` is an array of plain strings and projects as-is. Same as
 * `headerDisplaySection.items`.
 *
 * `_key` is projected, and it is the one field here nothing visible depends on. React needs a stable
 * key for the repeater, and every alternative is worse: the array index makes React keep the old
 * card's DOM when an editor reorders, and the room name is `required()` at publish time but a draft
 * mid-rename can hold two identical ones — which is exactly the case `twoColumnListSection` has to
 * work around because its list has no `_key` of its own. This one does; use it.
 *
 * `image${imageProjection}` returns `aspectRatio` as `null`, because the field is an
 * `imageElementSimple` and has no such control. That is one null leaf on the wire rather than a
 * per-section image projection to keep in step with the shared one — see the note on the field in
 * `tools/sanity/schema/sections/specCardGridSection.ts` for why the simple element is the right one
 * here. `components/MediaCard` overrides the ratio unconditionally in any case.
 */
const specCardGridSectionProjection = groq`
  _type == 'specCardGridSection' => {
    cards[]{
      _key,
      image${imageProjection},
      caption,
      title,
      label,
      description[]${blockContentProjection},
      footnotes
    }
  },
`;

export default specCardGridSectionProjection;
