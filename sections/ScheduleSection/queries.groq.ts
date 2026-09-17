import { groq } from 'next-sanity';

import blockContentProjection from '@/tools/sanity/projections/common/blockContent.groq';

/*
 * `_key` is selected explicitly on both repeaters, and it is not optional.
 *
 * A GROQ object projection returns exactly the keys it names — `days[]{ eyebrow, title }` drops
 * `_key` even though Sanity stores one on every array member. The component keys its `<li>`s by it
 * (an index key leaves an editor's reordered day rendering the previous day's text in the previous
 * day's node), so omitting it here would put React back on index keys via `undefined` and log a
 * missing-key warning on every row.
 *
 * `title` needs no sub-projection: the `title` element is a plain string holding an HTML tag, which
 * `TextTitle` strips. Same as `headerDisplaySection`.
 */
const scheduleSectionProjection = groq`
  _type == 'scheduleSection' => {
    days[]{
      _key,
      eyebrow,
      title,
      date,
      content[]${blockContentProjection},
      events[]{
        _key,
        time,
        title,
        description[]${blockContentProjection},
        location
      }
    }
  },
`;

export default scheduleSectionProjection;
