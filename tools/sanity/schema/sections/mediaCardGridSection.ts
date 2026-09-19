import { TbLayoutGrid } from 'react-icons/tb';
import { defineType } from 'sanity';
import type { FieldDefinition } from 'sanity';

import thumbnail from '../../../../sections/MediaCardGridSection/thumbnail.png';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import stripTitleTags from '../../helpers/stripTitleTags';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import type { ILinkElement } from '../elements/link';

/**
 * A grid of `components/MediaCard`s — a photograph with a caption chip, a name, a category, a
 * paragraph, and a rule with short mono items under it.
 *
 * Drawn as the feature-venue pair on `/the-lodge` (nodes `16:134` desktop, `16:282` mobile): Lulu's
 * light and bordered, Fin's Bar dark and filled, side by side.
 *
 * ## The theme is on the card, not on the section
 *
 * Unusual here — `sectionFields.themeOptions.theme` is section-level and every other section takes
 * its theme from it. This one keeps that field (it still paints the surface the cards sit on) and
 * adds a per-card override, because the design's whole point is a light card beside a dark one.
 *
 * It costs nothing to model: `MediaCard` writes `data-theme` on its own root and the entire
 * `[data-theme]` block in `_variables.scss` re-points beneath it — fill, border, hairline, body ink,
 * label accent and caption chip all move together, because nothing in that stylesheet names a
 * colour. So the field is a plain two-value string wired straight to the prop. Left unset, the card
 * inherits the section's theme, which is what a single-theme grid wants and is therefore the
 * default.
 *
 * ## Hours are a repeatable list of strings
 *
 * Not one field and not a structured open/close pair. The design draws "LUNCH 12PM–3PM" beside
 * "DINNER 5PM–10PM" on one card and "OPEN 12PM – LATE" alone on the other — two ranges on one day,
 * and a range with no closing time. A `{ opens, closes }` object cannot express "late", cannot
 * express two sittings without becoming an array anyway, and forces a format on copy that is
 * deliberately written as prose. An array of short strings is the smallest thing that holds all
 * three.
 *
 * ## The heading row is optional and unset on `/the-lodge`
 *
 * `tagline` / `title` / `content` sit above the grid and render only when filled. The drawn region
 * has no heading — the "BETWEEN EVENTS" row below the cards belongs to the facilities grid, not to
 * this section. They are here because an editor expects a heading to travel with the grid it heads
 * rather than to be a second section they must remember to place, and because every other grid-style
 * section in this repo carries one. Leave them blank to reproduce `/the-lodge`.
 */
interface IMediaCardGridSectionCard {
  _key: string;
  /**
   * The chip inset at the bottom-left of the photograph (`16:137`, `16:152`).
   *
   * Reproduced verbatim — the design fills it with file names as often as with prose, and a file
   * name has to render as stored. `components/Tag` applies no `text-transform` here for that reason.
   */
  caption?: string;
  /** The paragraph between the name and the rule. */
  content?: SanityTextBlock[];
  /**
   * The row under the hairline — one short item per entry, laid inline side by side.
   *
   * Unbounded and allowed to be empty: the AC requires a card with one item and a card with none,
   * and `MediaCard` renders no footer *and no hairline* for an empty array.
   */
  hours?: string[];
  image?: SanityImage;
  /**
   * The category, right-aligned against the name on the same baseline — "Restaurant", "Cocktails".
   *
   * Stored sentence case and uppercased in CSS, which is the right authoring practice — but not for
   * the reason this comment used to give. Measured through Chromium's accessibility tree, the node
   * is named from the *rendered* text, so it reads `StaticText "RESTAURANT"` regardless. Sentence
   * case still helps every consumer that reads `textContent` rather than the AX name, and it keeps
   * the stored copy correct; it does not keep capitals out of the accessibility tree. Nothing else
   * in the repo should claim that it does.
   */
  label?: string;
  /** Optional. Makes the whole card a link — see `components/MediaCard`. */
  link?: ILinkElement;
  /**
   * Per-card light/dark. Unset inherits the section's theme.
   *
   * Typed as the literal pair rather than as `ProjectTheme` so the schema's `list` and this
   * interface cannot drift; they are the same two values for the same reason CLAUDE.md gives — this
   * design system has two themes.
   */
  theme?: 'light' | 'dark';
  /** The venue name, as the markup string `TitleInput` stores. */
  title?: string;
}

interface IMediaCardGridSection {
  cards?: IMediaCardGridSectionCard[];
  content?: SanityTextBlock[];
  tagline?: string;
  title?: string;
}

/*
 * Inline in the array's `of`, following `scheduleSection`'s day and event objects rather than
 * `gridCard`'s exported sub-type. A sub-type exported alongside the section is **not derivable from
 * the folder name**, so `yarn sections:register` cannot write its entry in
 * `tools/sanity/schema/index.ts` — it only warns, and the hand-widened import is narrowed again by
 * the next run. Inline, there is nothing to register and nothing to lose.
 */
const cardFields: FieldDefinition[] = [
  {
    /*
     * Write the alt text. `components/Image` resolves `altText || asset.altText || ''`, so a blank
     * one is never *missing* — it renders `alt=""`, which tells a screen reader the photograph is
     * decorative. These are not: each one is the venue. Two project-wide things make the do-nothing
     * outcome worse and are out of scope here — `elements/image` seeds `altText` with
     * `NEXT_PUBLIC_SANITY_PROJECT_NAME`, so an untouched field announces the site name, and no
     * `altText` validation exists anywhere in the schema.
     */
    description:
      'The photograph across the top of the card. Landscape — the card crops to a fixed band height so every card in a row lines up, whatever the asset’s own ratio. Set the Alt Text under Advanced: describe the venue, not the file.',
    name: 'image',
    title: 'Image',
    type: 'imageElementAdvanced'
  },
  {
    description:
      'The small chip sitting on the bottom-left of the photograph — “IMAGE · lulus-interior.jpg · ceiling murals”. Optional, and shown only when there is an image. Reproduced exactly as typed.',
    name: 'caption',
    title: 'Image Caption',
    type: 'string'
  },
  {
    /*
     * `h2`, not `h3`, and the two cases have to be read together.
     *
     * This section's own heading is optional and **blank on `/the-lodge`**, which is the composition
     * it was built for. With no section heading, a card name defaulting to `h3` puts the page outline
     * at h1 → h3 — a heading-order skip (WCAG 1.3.1) in the shipped state. `h2` is also what
     * `scheduleSection` and `twoColumnListSection` default their own headings to.
     *
     * When the section *does* draw a heading, the component derives one level below it and overrides
     * this through `titleAs`, so the editor's choice matters only in the case where nothing outranks
     * it. That is the right division: the page outline is a property of the page.
     */
    description:
      'The venue name — “Lulu’s”. Rendered in the display face at the card’s own size. The level selector sets the heading level for the page outline — but if this section has a Title of its own, the card names are automatically placed one level beneath it.',
    name: 'title',
    options: { defaultTag: 'h2' as const },
    title: 'Name',
    type: 'title',
    validation: (Rule) =>
      Rule.required().custom((value?: string) => (stripTitleTags(value ?? '').trim() ? true : 'Name cannot be blank'))
  },
  {
    /*
     * Capped at 10, and the cap no longer guards against clipping.
     *
     * It used to. `MediaCard` drew this with `flex: 0 0 auto`, so it could not shrink at all, and
     * `overflow-wrap` does not reach a box that refuses to give up width — a long category pushed
     * the name out of the header row and was then clipped mid-word by the card's own
     * `overflow: hidden`, silently and with no ellipsis. Measured at a 320px viewport with a 32px
     * root (200% text), the label overflowed the card's content edge at 11 characters (+8.2px) and
     * was cut outright at 12 (+22.2px): "Coffee house" rendered as "COFFEE HOUS".
     *
     * The card now carries `flex: 0 1 auto` plus `min-width: 0` on `.label` — the fix this note used
     * to name as the durable one — so the label wraps instead of disappearing. `specCardGridSection`
     * had capped its identical field at **8** against the same defect measured on the other page,
     * which is two numbers for one component's bug; both are now advisory and both are 10, the
     * longest label the design draws anywhere ("Restaurant" here, "2 ROOMS" on `/stay`).
     *
     * `.warning()` and not `.error()`, as before and more so: a longer category is now a second line
     * in the header row rather than lost content.
     */
    description:
      'The category, shown small and right-aligned beside the name — “Restaurant”, “Cocktails”. Optional. Keep it short: it shares one line with the name. Type it in normal sentence case; it is displayed in uppercase automatically.',
    name: 'label',
    title: 'Category',
    type: 'string',
    validation: (Rule) =>
      Rule.max(10).warning('Longer than this wraps onto a second line beside the name on a narrow screen.')
  },
  {
    description: 'A short paragraph under the name. Optional — the card closes up around it.',
    name: 'content',
    title: 'Description',
    type: 'blockContentSimple'
  },
  {
    /*
     * Plain strings, following `headerDisplaySection.items` and `twoColumnListSection.items` — every
     * item the design draws is one short line with nothing to hang a second field on.
     *
     * No `layout: 'tags'`: these read as a sentence fragment ("Lunch 12pm–3pm"), and a tags input
     * gives each one a chip-width box. The default array layout gives a proper repeater.
     */
    description:
      'The row under the rule — one entry per item, laid side by side. “Lunch 12pm–3pm”, “Open 12pm – late”. Optional; a card with none simply has no rule. Type them in sentence case; they are displayed in uppercase automatically.',
    name: 'hours',
    of: [{ type: 'string' }],
    title: 'Hours',
    type: 'array',
    /*
     * The component keys these by their own text, because an editor reorders them in place and an
     * index key would leave the old text in the old node. The rule and the key move together — and
     * the component still disambiguates duplicates itself, because a `Rule.unique()` is publish-time
     * and Presentation renders drafts.
     */
    validation: (Rule) => Rule.unique()
  },
  {
    description:
      'Optional. Makes the whole card clickable — a page on the site, or an external link such as the Lodge’s own room page. Needs a Name on the card.',
    name: 'link',
    title: 'Link',
    type: 'linkElement'
  },
  {
    /*
     * In the Data group rather than Styles, deliberately. Every other theme control in this repo is
     * a section-level style; this one is a property of the individual venue — Fin's Bar is the dark
     * room — so it belongs beside the copy that describes it, where an editor filling the card in
     * will meet it.
     */
    description:
      'Light or dark, per card. Leave unset to follow the section’s own theme — set it only where the design puts a dark card beside a light one.',
    name: 'theme',
    options: {
      direction: 'horizontal' as const,
      layout: 'radio' as const,
      list: [
        { value: 'light', title: 'Light' },
        { value: 'dark', title: 'Dark' }
      ]
    },
    title: 'Card Theme',
    type: 'string'
  }
];

const mediaCardGridSection = defineType({
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
    {
      description:
        'A small label above the heading. Optional, and unset on The Lodge. Type it in normal sentence case; it is displayed in uppercase automatically.',
      group: 'data',
      name: 'tagline',
      title: 'Tagline',
      type: 'string'
    },
    {
      description:
        'A heading above the grid. Optional — leave it blank and the grid starts at the top of the section, which is how The Lodge is drawn.',
      group: 'data',
      name: 'title',
      options: { defaultTag: 'h2' as const },
      title: 'Title',
      type: 'title'
    },
    {
      description: 'A short paragraph under the heading. Optional.',
      group: 'data',
      name: 'content',
      title: 'Body',
      type: 'blockContentSimple'
    },
    {
      /*
       * Unbounded, per the AC — no `max()`. The grid is two columns down to the tablet breakpoint and
       * one below it, so a third and fourth card wrap onto a second row rather than squeezing the
       * first.
       *
       * `min(1)` rather than `required()`: an array field that is present but empty satisfies
       * `required()`, and this section renders nothing at all without cards.
       */
      description: 'The cards, in the order they should read. Two per row on desktop, stacked on mobile.',
      group: 'data',
      name: 'cards',
      of: [
        {
          fields: cardFields,
          name: 'mediaCardGridCard',
          preview: {
            prepare(selection: { label?: string; theme?: string; title?: string }) {
              return {
                subtitle: [selection?.label, selection?.theme === 'dark' && 'Dark'].filter(Boolean).join(' · '),
                title: stripTitleTags(selection?.title) || 'Card'
              };
            },
            select: { label: 'label', theme: 'theme', title: 'title' }
          },
          title: 'Card',
          type: 'object'
        }
      ],
      title: 'Cards',
      type: 'array',
      validation: (Rule) => Rule.min(1)
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
  name: 'mediaCardGridSection',
  preview: {
    prepare(selection: { cards?: IMediaCardGridSectionCard[]; internalLabel?: string; title?: string }) {
      const count = selection?.cards?.length ?? 0;
      const detail = `${count} card${count === 1 ? '' : 's'}`;

      return {
        subtitle: selection?.internalLabel || detail,
        title: stripTitleTags(selection?.title) || 'Media Card Grid'
      };
    },
    select: {
      cards: 'cards',
      internalLabel: 'internalLabel',
      title: 'title'
    }
  },
  title: 'Media Card Grid',
  type: 'object'
});

export { mediaCardGridSection };
export type { IMediaCardGridSection, IMediaCardGridSectionCard };
