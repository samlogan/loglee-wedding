import { TbLayoutColumns } from 'react-icons/tb';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/TwoColumnListSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import stripTitleTags from '../../helpers/stripTitleTags';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

/**
 * A dark two-column panel: an oversized statement on the left, and on the right either a numbered
 * list or a paragraph of contribution copy.
 *
 * Drawn twice — the dress-code band on Planner (nodes 1:426 desktop, 1:566 mobile) and the
 * contribution band on Stay (1:669, 1:737). The two share their left column exactly (optional mono
 * eyebrow, oversized Archivo Black statement, optional body copy) and differ only in what the right
 * column holds, which is why this is one section with a `variant` rather than two sections.
 *
 * ## The right column is a variant, not two optional fields
 *
 * A pair of optional fields — a list *and* a rich-text body, render whichever is filled — would have
 * been fewer controls. It would also have had no answer for both being filled, and would have hidden
 * the fact that the two right-hand treatments are mutually exclusive by design rather than by
 * convention. The variant makes the choice explicit and lets the irrelevant fields hide themselves.
 *
 * ## `richText` has no authored copy, on purpose
 *
 * `weddingSettings.contribution.copy` already holds this wording, and this section is its only
 * renderer. Giving the variant its
 * own rich-text field would duplicate content an editor already maintains, in a place where the two
 * could disagree about what the wedding is asking for. The copy is joined in by the projection
 * instead (see `sections/TwoColumnListSection/queries.groq.ts`), so the section receives it as props
 * like any other field and fetches nothing itself.
 */
interface ITwoColumnListSection {
  variant?: 'list' | 'richText';
  eyebrow?: string;
  title?: string;
  content?: SanityTextBlock[];
  asideEyebrow?: string;
  items?: string[];
  /**
   * Joined from the `weddingSettings` singleton by the projection, and present only on the
   * `richText` variant — a GROQ conditional projection does not fire on a `list` section, so the key
   * is genuinely absent there rather than null.
   *
   */
  contribution?: { copy?: SanityTextBlock[] | null } | null;
}

const twoColumnListSection = defineType({
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
     * First in the Data group, and deliberately above the fields it governs: it decides which of
     * them are visible, so an editor who meets it last has already filled in controls that then
     * vanish.
     *
     * `initialValue: 'list'` rather than leaving it unset. The component defaults to `list` too, so
     * an unset value renders correctly either way — but an unset radio presents the section as
     * having no answer to a question it must answer, and the list is the variant with fields to fill
     * in, so it is the more useful thing to open on.
     */
    {
      description:
        'What sits in the right-hand column. “Numbered list” is the dress-code band; “Contribution copy” pulls the accommodation wording from Wedding Settings.',
      group: 'data',
      initialValue: 'list',
      name: 'variant',
      options: {
        direction: 'horizontal' as const,
        layout: 'radio' as const,
        list: [
          { value: 'list', title: 'Numbered list' },
          { value: 'richText', title: 'Contribution copy' }
        ]
      },
      title: 'Right Column',
      type: 'string',
      validation: (Rule) => Rule.required()
    },
    /*
     * Optional on both columns, which is the AC: the Stay instance has neither. Sentence case in the
     * CMS and capitals from CSS, for the reason `headerDisplaySection.items` gives — short literal
     * all-caps runs are what screen readers most often spell out letter by letter, and
     * `text-transform` already guarantees the display.
     */
    {
      description:
        'The small label above the statement — “Dress code”. Optional. Type it in normal sentence case; it is displayed in uppercase mono automatically.',
      group: 'data',
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string'
    },
    /*
     * Required, unlike everything around it: the statement is the section. Rendered as the panel's
     * `<h2>` whatever tag is chosen in `TitleInput`, for the same reason `headerDisplaySection`
     * forces `<h1>` — the page's outline is a property of the page. `defaultTag` at least opens the
     * selector on the tag that will be used.
     *
     * The two-part guard `headerDisplaySection.title` and `scheduleSection` both carry:
     * `TitleInput` unsets an emptied field, so `required()` covers the blank case, but a single
     * space is stored as `<h2> </h2>` — a non-empty string to `required()` and an empty heading to
     * `TextTitle`. Stripping the tags before testing catches it.
     */
    {
      description:
        'The oversized statement — “[Cocktail, but comfortable]”. Always rendered as an <h2> in the display type scale; the level selector beside this field does not change that. Keep it short: the tier is drawn for one or two lines.',
      group: 'data',
      name: 'title',
      options: { defaultTag: 'h2' as const },
      title: 'Statement',
      type: 'title',
      validation: (Rule) =>
        Rule.required().custom((value?: string) =>
          stripTitleTags(value ?? '').trim() ? true : 'Statement cannot be blank'
        )
    },
    /*
     * `content`, per the field-naming rule in CLAUDE.md for a rich-text body, matching
     * `headerDisplaySection` and `scheduleSection`. The Studio title says "Body" so an editor sees
     * the role rather than the convention.
     *
     * `blockContentSimple` and not `Standard`: the design draws one short paragraph under the
     * statement (node 1:433), and the heading styles `Standard` adds would put an `<h1>` inside a
     * column whose own heading is an `<h2>`.
     */
    {
      description: 'A short paragraph beneath the statement. Optional.',
      group: 'data',
      name: 'content',
      title: 'Body',
      type: 'blockContentSimple'
    },
    {
      description:
        'The small label above the right-hand column — “What to bring”. Optional, and shown on both variants. Type it in normal sentence case; it is displayed in uppercase mono automatically.',
      group: 'data',
      name: 'asideEyebrow',
      title: 'Right Column Eyebrow',
      type: 'string'
    },
    /*
     * Plain strings, following `headerDisplaySection.items` — every item the design draws is a
     * single short line ("Swimmers — pool, hot tub, river") with nothing to hang a second field on,
     * and an object of one field is a worse editing experience for no gain.
     *
     * No `layout: 'tags'`, which is the one place this departs from that precedent: these are
     * sentence-length and a tags input gives each one a chip-width box. The default array layout
     * gives a proper repeater of text inputs.
     *
     * Unbounded, per the AC — no `max()`. The `.itemText` measure guard means a long item wraps
     * inside its column rather than widening the panel.
     */
    {
      description:
        'The list, in the order it should be read. Numbering is added automatically from the position — do not type “01”. Reordering renumbers.',
      group: 'data',
      hidden: ({ parent }) => parent?.variant !== 'list',
      name: 'items',
      of: [{ type: 'string' }],
      title: 'List Items',
      type: 'array',
      /*
       * The component keys these by their own text, because an editor reorders them in place and an
       * index key would leave the old text in the old node. That is only safe if they really are
       * unique — this makes the component's premise true rather than assumed. The rule and the key
       * have to move together.
       */
      validation: (Rule) => Rule.unique()
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbLayoutColumns,
  name: 'twoColumnListSection',
  preview: {
    prepare(selection: { internalLabel?: string; items?: string[]; title?: string; variant?: string }) {
      /*
       * Counted the way the page counts them — blanks filtered — rather than `items.length`.
       *
       * An array of plain strings keeps every row an editor tabbed through and moved on from, and
       * the component drops those before numbering. A raw `.length` therefore promised "7 items" in
       * the document list for a band that renders 4, which is the kind of disagreement an editor
       * reads as the page being wrong rather than the preview.
       */
      const count = selection?.items?.filter((item) => Boolean(item?.trim())).length ?? 0;
      const detail = selection?.variant === 'richText' ? 'Contribution copy' : `${count} item${count === 1 ? '' : 's'}`;

      return {
        subtitle: selection?.internalLabel || detail,
        title: stripTitleTags(selection?.title) || 'Two Column List'
      };
    },
    select: {
      internalLabel: 'internalLabel',
      items: 'items',
      title: 'title',
      variant: 'variant'
    }
  },
  title: 'Two Column List',
  type: 'object'
});

export { twoColumnListSection };
export type { ITwoColumnListSection };
