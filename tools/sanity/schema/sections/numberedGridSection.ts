import { TbTable } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/NumberedGridSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import stripTitleTags from '../../helpers/stripTitleTags';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

/**
 * One cell of the grid — an auto-numbered facility.
 *
 * `_key` is not optional. A GROQ object projection returns exactly the keys it names, so
 * `queries.groq.ts` selects it explicitly and the component keys its `<li>`s by it; see the note
 * there, and the longer one on `IScheduleSectionEvent`, for why an index key is wrong on a repeater
 * an editor reorders.
 *
 * There is no `index` / `number` field, deliberately. The two-digit ordinal is a **function of array
 * position** (`tools/helpers/formatOrdinal`), so an editor who reorders the list renumbers it by
 * doing so, and cannot type "03" twice.
 */
interface INumberedGridSectionItem {
  _key: string;
  title?: string;
  /**
   * The right-aligned micro-label. **One free-text string, not an enum.**
   *
   * The design draws four different kinds of thing in this one slot — a category ("OUTDOOR",
   * "WELLNESS"), a booking state ("BOOKINGS"), an opening time ("FROM 12PM") and a joke
   * ("BYO SKILL"). A `list` option would have to enumerate all four kinds and would still be wrong
   * for the fifth, and an `hours` field would be wrong for six of the nine cells the design draws.
   */
  tag?: string;
  content?: SanityTextBlock[];
}

/**
 * The facilities table on The Lodge — a bordered grid of compact, auto-numbered cells sharing one
 * outer border, under a heading row.
 *
 * Drawn once so far: nodes `16:163` (the heading row) + `16:166` (the grid) on desktop, `16:310` +
 * `16:312` on mobile. The design has no wrapper frame around the pair — they are siblings at page
 * level — which is why `parameters.design` on the story points at the grid, the larger of the two
 * and the part that identifies the section.
 *
 * ## It reads as a table; it is marked up as a list, and that is deliberate
 *
 * The prose here and in `styles.module.scss` calls this a table throughout, because that is what the
 * treatment *looks* like and the shared border is the whole point. The markup is an `<ol>` of `<li>`
 * and should stay one. There are no header cells and no row/column relationships to convey —
 * position in the grid is flow order, not meaning — so a real `<table>` would promise navigable
 * headers that do not exist, and it could not reflow three columns to two without re-grouping the
 * DOM. `<ol>` rather than `<ul>` because reordering the items renumbers them, which is the test for
 * an ordered list.
 *
 * ## Why this is not the venue-card grid beside it
 *
 * The cards above it (MAM-1909) carry an image, a divider and a body; these carry none of the three.
 * A cell here is a *row of a table* — index, tag, name, one line of copy — and the whole point of
 * the treatment is that the cells share their borders rather than standing apart as objects. Two
 * schemas, because an editor choosing between them is choosing between "this amenity deserves a
 * photograph" and "this amenity is a line in a list", which is a content decision rather than a
 * style one.
 *
 * ## Unbounded, and an odd count is a supported state
 *
 * No `max()` on `items`. Nine into three columns is exact and nine into two is not, so the last cell
 * renders beside an empty neighbour on the phone — that empty slot is enclosed by the table's own
 * border and needs no filler item. See the note on `.grid` in `styles.module.scss` for the
 * mechanism.
 */
interface INumberedGridSection {
  title?: string;
  /**
   * The uppercase mono qualifier set to the right of the heading — "Free for all guests".
   *
   * Optional, and **not drawn on the phone**: node `16:310` is the heading alone. The component
   * keeps it in the markup and hides it with `display: none` below the switch rather than branching
   * on a viewport it cannot know server-side; `display: none` drops it from the accessibility tree
   * too, so every reader gets the same page. The note at the call site records the alternatives.
   */
  meta?: string;
  items?: INumberedGridSectionItem[];
}

const numberedGridSection = defineType({
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
    /*
     * Required, and the two-part guard `headerDisplaySection`, `scheduleSection` and
     * `twoColumnListSection` all carry: `TitleInput` unsets an emptied field, so `required()` covers
     * the blank case, but a single space is stored as `<h2> </h2>` — a non-empty string to
     * `required()` and an empty heading to `TextTitle`. Stripping the tags before testing catches
     * it.
     *
     * Always rendered as an `<h2>`, whatever the level selector says, for the reason
     * `headerDisplaySection` forces `<h1>`: the page's outline is a property of the page, and this
     * section sits beneath a `headerDisplaySection` on the one page that draws it. `defaultTag` at
     * least opens the selector on the tag that will be used.
     */
    {
      description:
        'The heading above the grid — “Between events”. Always rendered as an <h2>; the level selector beside this field does not change that. Type it in normal sentence case; it is displayed in uppercase automatically.',
      group: 'data',
      name: 'title',
      options: { defaultTag: 'h2' as const },
      title: 'Heading',
      type: 'title',
      validation: (Rule) =>
        Rule.required().custom((value?: string) =>
          stripTitleTags(value ?? '').trim() ? true : 'Heading cannot be blank'
        )
    },
    /*
     * Sentence case in the CMS and capitals from CSS, for the reason `headerDisplaySection.items`
     * gives — short literal all-caps runs are what screen readers most often spell out letter by
     * letter, and `text-transform` already guarantees the display.
     */
    {
      description:
        'The small label set to the right of the heading — “Free for all guests”. Optional, and hidden on phones, where the design draws the heading alone. Type it in normal sentence case; it is displayed in uppercase automatically.',
      group: 'data',
      name: 'meta',
      title: 'Heading Meta',
      type: 'string',
      /*
       * A warning rather than an error, matching `scheduleSection.location` — the constraint is
       * about fit, not validity. The run is drawn `white-space: nowrap` in a `space-between` row, so
       * past roughly forty characters it stops sharing a line with the heading at the width the
       * container-query switch reveals it at.
       */
      validation: (Rule) =>
        Rule.max(40).warning('A label this long stops sharing a line with the heading on a narrow desktop.')
    },
    /*
     * An inline anonymous object rather than a named `defineType` exported alongside the section.
     *
     * `yarn sections:register` writes the plain `import { numberedGridSection } from …` form and
     * **warns** about any other export, so a named `numberedGridItem` would need hand-registering in
     * the `// Objects` block of `tools/sanity/schema/index.ts` and would be silently narrowed again
     * by the next run of the generator. CLAUDE.md names the durable alternatives — inline it, or
     * move it to `tools/sanity/schema/objects/` — and nothing outside this section refers to a cell,
     * so inlining is the smaller of the two.
     *
     * Unbounded: no `max()`. See the note on the interface for what an odd count does.
     */
    {
      description:
        'The facilities, in the order they should be read. Numbering is added automatically from the position — do not type “01”. Reordering renumbers.',
      group: 'data',
      name: 'items',
      of: [
        {
          fields: [
            {
              description:
                'The facility name — “Champagne garden”. Always rendered as an <h3> beneath the section heading; the level selector beside this field does not change that. Type it in normal sentence case; it is displayed in uppercase automatically.',
              name: 'title',
              options: { defaultTag: 'h3' as const },
              title: 'Name',
              type: 'title',
              validation: (Rule) =>
                Rule.required().custom((value?: string) =>
                  stripTitleTags(value ?? '').trim() ? true : 'Name cannot be blank'
                )
            },
            {
              description:
                'The short label on the right of the number — a category (“Outdoor”), a state (“Bookings”), a time (“From 12pm”), anything. Free text, and optional. Displayed in uppercase automatically.',
              name: 'tag',
              title: 'Tag',
              type: 'string',
              // Same reasoning as `meta` above: it shares one line with the ordinal, and the cell is
              // a ~122px measure on a phone. The component clamps it rather than letting it overflow,
              // so this guides the editor instead of enforcing anything.
              validation: (Rule) => Rule.max(24).warning('A tag this long wraps to a second line inside the cell.')
            },
            /*
             * `blockContentSimple` and not `Standard`: the design draws one short sentence (node
             * 16:176) and the heading styles `Standard` adds would put an `<h1>` inside a cell whose
             * own name is an `<h3>`.
             */
            {
              description: 'One short line beneath the name. Optional.',
              name: 'content',
              title: 'Description',
              type: 'blockContentSimple'
            }
          ],
          name: 'numberedGridItem',
          preview: {
            prepare(selection: { tag?: string; title?: string }) {
              return {
                subtitle: selection?.tag,
                title: stripTitleTags(selection?.title) || 'Item'
              };
            },
            select: { tag: 'tag', title: 'title' }
          },
          title: 'Item',
          type: 'object'
        }
      ],
      title: 'Items',
      type: 'array',
      validation: (Rule) => Rule.required().min(1)
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbTable,
  name: 'numberedGridSection',
  preview: {
    prepare(selection: { internalLabel?: string; items?: unknown[]; title?: string }) {
      const count = selection?.items?.length ?? 0;

      return {
        subtitle: selection?.internalLabel || `${count} item${count === 1 ? '' : 's'}`,
        title: stripTitleTags(selection?.title) || 'Numbered Grid'
      };
    },
    select: {
      internalLabel: 'internalLabel',
      items: 'items',
      title: 'title'
    }
  },
  title: 'Numbered Grid',
  type: 'object'
});

export { numberedGridSection };
export type { INumberedGridSection, INumberedGridSectionItem };
