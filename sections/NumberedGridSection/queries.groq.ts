import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';

/*
 * `_key` is selected explicitly on the repeater, and it is not optional.
 *
 * A GROQ object projection returns exactly the keys it names — `items[]{ title, tag }` drops `_key`
 * even though Sanity stores one on every array member. The component keys its `<li>`s by it (an
 * index key leaves an editor's reordered cell rendering the previous cell's text in the previous
 * cell's node, which here would also detach the name from its ordinal), so omitting it would put
 * React back on index keys via `undefined` and log a missing-key warning on every cell.
 * `scheduleSection` says the same thing about the same trap.
 *
 * No `index` or `number` is projected because none is authored: the ordinal is a function of array
 * position, resolved at render by `tools/helpers/formatOrdinal`. The projection's order *is* the
 * numbering, which is why nothing here sorts or filters — a `[defined(title)]` filter would look
 * tidy and would silently renumber the list differently from the way the Studio's preview shows it.
 * The blank-cell filter lives in the component, next to the `map` that numbers them.
 *
 * `title` needs no sub-projection: the `title` element is a plain string holding an HTML tag, which
 * `TextTitle` strips. `tag` is a plain string. Same as `headerDisplaySection` and `scheduleSection`.
 */
const numberedGridSectionProjection = groq`
  _type == 'numberedGridSection' => {
    title,
    meta,
    items[]{
      _key,
      title,
      tag,
      content[]${blockContentProjection}
    }
  },
`;

export default numberedGridSectionProjection;
