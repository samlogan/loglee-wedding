import { TbLayoutGrid } from 'react-icons/tb';
import { defineType } from 'sanity';
import type { FieldDefinition } from 'sanity';

import thumbnail from '../../../../sections/SpecCardGridSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import stripTitleTags from '../../helpers/stripTitleTags';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';

/**
 * A grid of bordered media cards, each carrying a short spec label beside its name and a footnote
 * line under a rule — the room-type grid on `/stay` (nodes 1:630 desktop, 1:700 mobile).
 *
 * ## One inline repeater, not a document type
 *
 * Nothing outside this section references a room. A document type would buy a reference picker
 * nobody needs and cost an editor a second place to look; `scheduleSection.days` and
 * `faqSection.faqItems` set the precedent. The ticket says so explicitly.
 *
 * ## What the design does **not** have, and so neither does this
 *
 * The source brief specified `beds` and `sleeps` as structured fields. The design draws neither:
 *
 * - **Beds are prose.** "One king bed, ensuite, furnished balcony with pool view" is one sentence in
 *   the description (1:640); there is no bed row, no icon list and nothing to align a structured
 *   value against. A `beds` field would be a control with nowhere to render.
 * - **The label is free text, not a number.** It reads "2 max" and "4 max" on two cards and
 *   "2 ROOMS" on the third (1:638, 1:651, 1:664) — occupancy on two, a unit count on the other. A
 *   numeric `sleeps` cannot say "2 rooms", and a `sleeps` + `unit` pair would be two controls to
 *   express one short run the editor can simply type.
 *
 * ## The footnote is a list, and the punctuation is the renderer's
 *
 * Every card's footnote is short items separated by a middot — "EXTRA BEDS AT A CHARGE · COT FREE"
 * (1:643). Authored as one string it would accumulate inconsistent separators the first time two
 * people edited two cards: a middot here, a bullet there, an em dash on the third. So the CMS holds
 * the items and `sections/SpecCardGridSection` joins them, which makes the separator a property of
 * the design rather than of the content.
 */
interface ISpecCardGridSectionCard {
  /*
   * Required here while every sibling is optional, for the reason `scheduleSection` states at
   * length: the Studio always writes a `_key`, so what the strict type buys is that a story or a
   * fixture cannot omit one — not a promise from GROQ, which projects `_key: null` for an array
   * member created by a raw mutation.
   */
  _key: string;
  caption?: string;
  description?: SanityTextBlock[];
  footnotes?: string[];
  image?: SanityImageSimple;
  label?: string;
  title?: string;
}

interface ISpecCardGridSection {
  cards?: ISpecCardGridSectionCard[];
}

/*
 * The card's fields, lifted out of the `cards` definition purely so the array stays readable.
 * Sanity inlines it either way — this is an anonymous object inside `cards[]`, not a registered
 * type, so it needs no entry in `schema/index.ts` and `yarn sections:register` has nothing to warn
 * about. `scheduleSection` does the same with its events.
 */
const specCardFields: FieldDefinition[] = [
  /*
   * `imageElementSimple` and **not** `imageElementAdvanced`, which is the type a card image would
   * normally reach for.
   *
   * `components/MediaCard` fixes the media band's height (`--media-card-media-height`) and covers,
   * because an intrinsic ratio would make each card's body start at a different `y` and break the
   * row. It therefore writes `aspectRatio="natural"` *after* spreading the projection, so the
   * advanced element's aspect-ratio radio would be a control that provably does nothing. Alt text
   * and the hotspot — the two things that do have an effect here — are both on the simple element.
   */
  {
    description:
      'The photo at the top of the card. Landscape — it is cropped to a fixed band, so the hotspot decides what stays in frame. Optional: a card with no photo renders as a card with no photo.',
    name: 'image',
    title: 'Image',
    type: 'imageElementSimple'
  },
  /*
   * Not in the acceptance criteria, and drawn on all three cards (1:633, 1:646, 1:659) — so it is a
   * real editable field rather than a placeholder. `components/MediaCard` renders it as a `Tag`,
   * verbatim and with no transform, because the design fills it with file names as often as with
   * prose and a file name has to be reproduced as stored.
   *
   * Rendered only when there is a photo to inset it into; the card drops it with the band.
   */
  {
    description:
      'The small chip over the bottom-left of the photo — “king-room.jpg”. Shown exactly as typed, so capitals and punctuation are yours. Ignored when the card has no photo.',
    name: 'caption',
    title: 'Image Caption',
    type: 'string'
  },
  /*
   * `type: 'title'`, so the room name gets the same rich-text `TitleInput` every other heading in
   * the CMS has. The *level* is fixed by the section — see the note at the `titleAs` call site in
   * `sections/SpecCardGridSection/index.tsx` — and `defaultTag` opens the selector on the tag that
   * will actually be used so the two never appear to disagree.
   *
   * The two-part guard `headerDisplaySection.title` and `twoColumnListSection.title` both carry:
   * `TitleInput` unsets an emptied field, so `required()` covers the blank case, but a single space
   * is stored as `<h2> </h2>` — a non-empty string to `required()` and an empty heading to the
   * renderer. Stripping the tags before testing catches it.
   */
  {
    description:
      'The room name — “King Room”. Always rendered as an <h2>; the level selector beside this field does not change that. Type it in normal sentence case; it is displayed in uppercase automatically.',
    name: 'title',
    options: { defaultTag: 'h2' as const },
    title: 'Name',
    type: 'title',
    validation: (Rule) =>
      Rule.required().custom((value?: string) => (stripTitleTags(value ?? '').trim() ? true : 'Name cannot be blank'))
  },
  /*
   * **Free text, and deliberately not `sleeps`.** See the type's note: the three drawn values are
   * "2 max", "4 max" and "2 rooms", so the field has to hold a unit as well as a figure, and the
   * cheapest honest way to do that is to let the editor type the whole run.
   *
   * Capped, and the number is measured rather than picked for tidiness. The label shares the header
   * row with the name and is `flex: 0 0 auto`, so it takes width from the name before it wraps. In
   * the narrowest column this grid produces (a 2-up row at 660px, ~300px of card content) the name
   * has already dropped to two lines by about 14 characters of label; 20 is where the label starts
   * taking the row on its own.
   *
   * `warning()` rather than an error — this is a legibility threshold, not a data-integrity one, and
   * blocking a publish over a long label is the wrong trade for a site an editor updates the week
   * of.
   */
  {
    description:
      'The short spec beside the name — “2 max”, “4 max”, “2 rooms”. Free text, so it can be an occupancy or a count. Type it in normal sentence case; it is displayed in uppercase automatically.',
    name: 'label',
    title: 'Spec Label',
    type: 'string',
    validation: (Rule) => Rule.max(20).warning('A label this long squeezes the room name out of its row on a phone.')
  },
  /*
   * `description` rather than `content`, following `faqSection.answer` and `scheduleSection`: a
   * rich-text field belonging to a repeater item is named for its role in that item, and `content`
   * is reserved for the body of the thing that owns it.
   *
   * `blockContentSimple` and not `Standard`: the design draws two or three lines of plain sentences
   * (1:640, 1:653, 1:666), and the heading styles `Standard` adds would put a heading inside a card
   * whose own heading is the name above it.
   */
  {
    description:
      'Two or three lines about the room — beds, ensuite, outlook. Sentence case, written as prose: there is no separate beds field, because the design has no separate beds row.',
    name: 'description',
    title: 'Description',
    type: 'blockContentSimple'
  },
  /*
   * **A list of short items, never one authored string.** The middot between them is added by the
   * renderer — see the type's note.
   *
   * Plain strings, following `twoColumnListSection.items`: every item the design draws is a couple
   * of words ("Cot free", "Pool view", "Balcony") with nothing to hang a second field on.
   *
   * No `layout: 'tags'`. These are short enough that a tags input is tempting, and it is still the
   * wrong control: it commits an editor to typing into a chip field with no way to see the rendered
   * order as a list, and `twoColumnListSection` already rejected it for the neighbouring field.
   *
   * Unbounded, per the AC. A fourth item wraps to a second line inside the card rather than
   * widening it — `.footer` in `components/MediaCard` is a wrapping flex row.
   */
  {
    description:
      'The line under the rule, as separate items — “Extra beds at a charge”, “Cot free”. Do not type the “·” between them; it is added automatically, which is what keeps every card punctuated the same way. Type them in normal sentence case; they are displayed in uppercase automatically.',
    name: 'footnotes',
    of: [{ type: 'string' }],
    title: 'Footnote Items',
    type: 'array'
  }
];

const specCardGridSection = defineType({
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
     * Unbounded, per the AC: "cards are an unbounded repeater, not fixed slots". No `max(3)` even
     * though the design draws three — the grid is three columns that wrap, so a fourth card starts a
     * second row and a second row of two stretches to its own height. Capping it would make the
     * layout's own behaviour unreachable.
     *
     * No `min()` either, and no `required()`. The component renders nothing at all rather than an
     * empty grid, which is the honest signal in the Studio's Presentation preview while a section is
     * half-built. `twoColumnListSection` and `scheduleSection` both bail the same way.
     */
    {
      description: 'The cards, in the order they should read. Three fill a desktop row; more wrap onto the next one.',
      group: 'data',
      name: 'cards',
      of: [
        {
          fields: specCardFields,
          name: 'specCard',
          /*
           * The selection is left unannotated, unlike the section-level `prepare` below.
           *
           * `media` is what forces it: Sanity types a preview's `media` as a `SanityImageSource` or a
           * `ReactNode`, and an explicit `media?: unknown` on the parameter widens the *return* type
           * past what `ArrayOfType` accepts — a type error that reads as if the field were wrong
           * rather than the annotation. The array member's fields are already declared by
           * `specCardFields`, so inference here costs nothing. `elements/image.ts` does the same.
           */
          preview: {
            prepare({ label, media, title }) {
              return {
                media,
                subtitle: label,
                title: stripTitleTags(title) || 'Card'
              };
            },
            select: { label: 'label', media: 'image', title: 'title' }
          },
          title: 'Card',
          type: 'object'
        }
      ],
      title: 'Cards',
      type: 'array'
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: TbLayoutGrid,
  name: 'specCardGridSection',
  preview: {
    prepare(selection: { cards?: { title?: string }[]; internalLabel?: string }) {
      /*
       * Counted the way the page counts them — cards with nothing in them filtered out — rather than
       * `cards.length`, following `twoColumnListSection`. A raw length promises "4 cards" in the
       * document list for a grid that renders three, and an editor reads that as the page being
       * wrong rather than the preview.
       *
       * The name is the only field selected per card, because `select` cannot reach into an array
       * item's rich text and the name is `required()` anyway — a card without one is the same
       * half-built state the component drops.
       */
      const count = selection?.cards?.filter((card) => Boolean(stripTitleTags(card?.title).trim())).length ?? 0;

      return {
        subtitle: selection?.internalLabel || `${count} card${count === 1 ? '' : 's'}`,
        title: 'Spec Card Grid'
      };
    },
    select: {
      cards: 'cards',
      internalLabel: 'internalLabel'
    }
  },
  title: 'Spec Card Grid',
  type: 'object'
});

export { specCardGridSection };
export type { ISpecCardGridSection, ISpecCardGridSectionCard };
