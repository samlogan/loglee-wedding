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
  /*
   * `SanityImageSimple` **plus the two keys `imageProjection` returns and the global type does not
   * declare**, listed in render order like every other field here.
   *
   * `tools/sanity/types/SanityImage.ts` models only `asset` and `altText`, but the shared
   * projection returns `crop` and `hotspot` on every image field in the repo, `components/Image`
   * reads both, and `imageElementSimple` sets `options: { hotspot: true }` so an editor can set
   * them. Today they reach the card anyway, because the renderer spreads the whole object and a
   * spread is a runtime operation — which is exactly the problem: the obvious future refactor to
   * passing props explicitly would drop them silently, re-centring every crop with nothing to
   * notice it by. Declared locally rather than by widening the global type, which is a shared file
   * and a separate change.
   */
  image?: SanityImageSimple & {
    crop?: { top?: number; bottom?: number; left?: number; right?: number };
    hotspot?: { x?: number; y?: number; height?: number; width?: number };
  };
  caption?: string;
  title?: string;
  label?: string;
  description?: SanityTextBlock[];
  footnotes?: string[];
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
   * and the crop rectangle — the two things that do have an effect here — are both on the simple
   * element.
   *
   * **The hotspot does not re-frame this band, and the description must not imply that it does.**
   * `ImageSanity` asks the CDN for `options.width` by `options.croppedImageDimensions.height`, which
   * preserves the *source's* ratio, so `useNextSanityImage` is never asked to re-crop and the hotspot
   * never reaches the delivered file. `components/Image`'s `.ratio_natural` then sets
   * `object-position: center` under `object-fit: cover`, so the band always takes the middle of the
   * frame. The **crop rectangle** is honoured — it is what `croppedImageDimensions` derives from — so
   * the crop handles are the control that works. Invisible on a landscape upload, which the drawn
   * photos are; a real framing failure on a square or portrait one, where the editor drags the
   * hotspot and nothing moves.
   *
   * ## The alt text is validated here rather than trusted
   *
   * `imageElementSimple` sets `initialValue: process.env.NEXT_PUBLIC_SANITY_PROJECT_NAME` on its
   * `altText`, so an editor who uploads a photo and does not retype that field publishes a room
   * photograph announced as the site's name — three times over on `/stay`, once per list item,
   * immediately before each room name. That is worse than a missing alt, which a screen reader would
   * at least skip. The default belongs to the shared element and is a repo-wide problem; refusing to
   * publish it is this section's business and costs four lines.
   */
  {
    description:
      'The photo at the top of the card. Landscape — it is centre-cropped to a fixed band, so use the crop handles to choose the framing; the hotspot has no effect here. Describe the room in the alt text. Optional: a card with no photo renders as a card with no photo.',
    name: 'image',
    title: 'Image',
    type: 'imageElementSimple',
    validation: (Rule) =>
      Rule.custom((value?: { altText?: string; asset?: { _ref?: string } }) => {
        if (!value?.asset) {
          return true;
        }

        const alt = value.altText?.trim();

        if (!alt) {
          return 'Describe the room in the alt text, or remove the photo.';
        }

        /*
         * Compared against the same env var the placeholder is seeded from rather than against a
         * literal, so a project rename cannot leave this rule quietly matching nothing.
         */
        if (alt === process.env.NEXT_PUBLIC_SANITY_PROJECT_NAME) {
          return 'Replace the placeholder alt text with a description of the room.';
        }

        return true;
      })
  },
  /*
   * Not in the acceptance criteria, and drawn on all three cards (1:633, 1:646, 1:659) — so it is a
   * real editable field rather than a placeholder. `components/MediaCard` renders it as a `Tag`,
   * verbatim and with no transform, because the design fills it with file names as often as with
   * prose and a file name has to be reproduced as stored.
   *
   * Rendered only when there is a photo to inset it into; the card drops it with the band.
   *
   * Capped in the same shape as `label` below and for the same kind of reason, measured the same
   * way. The chip is absolutely positioned inside the media band with both inline insets set, so a
   * long caption wraps rather than escaping — but it wraps **upward, over the photograph**, and each
   * extra line takes another ~20px of the image. In the narrowest track this grid produces (a 2-up
   * row at a 608px container, ~260px of chip width) the second line arrives at about 34 characters;
   * the drawn captions are 13 to 15.
   *
   * `warning()` rather than an error, like `label`: a two-line chip is ugly, not broken, and this is
   * a site an editor updates the week of the wedding.
   *
   * Worth knowing when writing one: the chip is inside `.media`, which precedes the body, so a
   * screen reader reads the caption *before* the room name — three file names before any room on
   * `/stay`. That is a reason to keep captions short and readable, or to leave them blank on cards
   * where the chip is a contact-sheet affectation rather than information.
   */
  {
    description:
      'The small chip over the bottom-left of the photo — “king-room.jpg”. Shown exactly as typed, so capitals and punctuation are yours, and it is read out before the room name. Ignored when the card has no photo.',
    name: 'caption',
    title: 'Image Caption',
    type: 'string',
    validation: (Rule) =>
      Rule.max(34).warning('A caption this long wraps onto a second line and covers more of the photo.')
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
   * ## Capped at 8, and the number is measured rather than picked
   *
   * The label shares the header row with the room name, and `components/MediaCard` gives it
   * `flex: 0 0 auto` — deliberately, so a long name wraps rather than squeezing what is meant to be a
   * one- or two-word run. The consequence is that the label **cannot shrink**: a flex item with
   * `flex-shrink: 0` is sized by its content, so the section's `overflow-wrap: anywhere` (which
   * rescues the name) does nothing for it, and past a certain length it is clipped by the card's own
   * `overflow: hidden` — silently, with no ellipsis.
   *
   * Measured in a browser on the `Reflow320` story, stepping this field through real values at a
   * 320px wrapper:
   *
   *   default root   5, 7, 8, 10, 12, 13 characters   all fit
   *   32px root      5, 7, 8 fit   ·   10, 12, 13 clip
   *
   * So the length only matters for a reader at double text size on a small phone, and 8 is where
   * that stops working. It is not tight in practice: the three drawn labels are "2 MAX", "4 MAX" and
   * "2 ROOMS".
   *
   * `warning()` rather than an error, because it is a threshold for one combination of viewport and
   * text size rather than a data-integrity rule, and blocking a publish over it is the wrong trade
   * for a site an editor updates the week of. The durable fix is `flex: 0 1 auto` plus
   * `min-width: 0` on `MediaCard`'s `.label`, at which point this cap can be relaxed.
   */
  {
    description:
      'The short spec beside the name — “2 max”, “4 max”, “2 rooms”. Free text, so it can be an occupancy or a count. Type it in normal sentence case; it is displayed in uppercase automatically.',
    name: 'label',
    title: 'Spec Label',
    type: 'string',
    validation: (Rule) =>
      Rule.max(8).warning('Longer than this is cut off for a reader on a small phone at double text size.')
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
    of: [
      {
        /*
         * Capped per **item**, not per line. The count is unbounded by design — a fourth item wraps
         * to a second line inside the card rather than widening it — but one item long enough to be
         * a sentence turns the footnote into three lines on its own, and the footnote's line count
         * is the variable the whole bottom-alignment mechanism is measured against. The drawn items
         * are 8 to 29 characters.
         */
        type: 'string',
        validation: (Rule) =>
          Rule.max(40).warning('A footnote item this long wraps the line and unbalances the row of cards.')
      }
    ],
    title: 'Footnote Items',
    type: 'array',
    /*
     * Not for React's benefit — the renderer joins these into one string, so there are no keys to
     * collide. It is for the reader: two identical items render as "Cot free · Cot free", which is
     * visible on the page and invisible in a list of text inputs. `twoColumnListSection.items`
     * carries the same rule for a stricter reason.
     */
    validation: (Rule) => Rule.unique()
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
                /*
                 * `.trim()`, which the section-level prepare below also does and this one did not.
                 * `TitleInput` stores markup, so a name of a single space is `'<h2> </h2>'` — the
                 * exact case the field's own `custom()` rule exists to catch — and it strips to
                 * `' '`, which is truthy. Without the trim the array row renders with a blank label
                 * instead of falling through to "Card".
                 */
                title: stripTitleTags(title).trim() || 'Card'
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
    prepare(selection: {
      cards?: {
        description?: unknown[];
        footnotes?: string[];
        image?: { asset?: unknown };
        label?: string;
        title?: string;
      }[];
      internalLabel?: string;
    }) {
      /*
       * Counted the way the page counts them — cards with nothing in them filtered out — rather than
       * `cards.length`, following `twoColumnListSection`. A raw length promises "4 cards" in the
       * document list for a grid that renders three, and an editor reads that as the page being
       * wrong rather than the preview.
       *
       * **The predicate has to be the renderer's, and for a while it was not.** This counted cards
       * with a *name*, on the reasoning that a card without one is a half-built state the component
       * drops. The component does no such thing: `hasCardContent` in
       * `sections/SpecCardGridSection/index.tsx` renders a card with **any** of image, name, label,
       * description or footnotes. So a draft card holding a photo and a description but no name yet
       * was drawn on the page and not counted here — the same disagreement this comment's first
       * paragraph argues against, pointing the other way, and visible in exactly the state an editor
       * is looking at the preview in.
       *
       * `select` returns the raw array members, so every field the renderer looks at is reachable.
       * The `description` check is shallower than the renderer's `hasBlockContent` — a rich-text
       * field holding one emptied block counts as content here and does not on the page. Deliberate:
       * `prepare` cannot import the app-side helper, and the remaining disagreement is one card, in
       * one draft, off by one, rather than the whole predicate.
       */
      const count =
        selection?.cards?.filter((card) =>
          Boolean(
            card?.image?.asset ||
            stripTitleTags(card?.title).trim() ||
            card?.label?.trim() ||
            card?.description?.length ||
            card?.footnotes?.some((item) => item?.trim())
          )
        ).length ?? 0;

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
