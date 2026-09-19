import { MdQuestionAnswer } from 'react-icons/md';
import { defineType } from 'sanity';

import thumbnail from '../../../../sections/FaqSection/thumbnail.png';
import type { MapLocation } from '../../../helpers/mapLocation';
import ReadOnlyImageInput from '../../components/ReadOnlyImageInput';
import defaultSectionGroups from '../common/defaultSectionGroups';
import internalLabelField from '../common/internalLabelField';
import type { IButtonElement } from '../elements/button';

/**
 * The compact map card in the left rail — nodes 16:643 (desktop) and 16:799 (mobile).
 *
 * ## Why this is an inline object and not a registered type
 *
 * `tools/sanity/register-sections.ts` derives all four registrations from the section folder name,
 * and a *second* exported schema type sitting beside a section is the one thing it cannot derive —
 * it warns and asks for a hand-written entry in the `// Objects` block. An anonymous
 * `type: 'object'` field needs none of that. What the card shares with `MapSection` is the
 * `geopoint` and `components/Map`, not the card's own chrome.
 *
 * ## `location` **or** `image`
 *
 * A location draws a live Google map through `components/Map` — the same component and the same
 * Studio picker `MapSection` uses. The image is the fallback for a card without one: a static
 * render, or anything else the editor wants in the frame. Stating the precedence once, in the
 * component, keeps the failure mode "the card shows the map you pinned" rather than "the card is
 * blank because a radio says image".
 *
 * `location` replaced an `embedUrl` field (a pasted Google Maps iframe `src`). No published document
 * had filled it in.
 */
interface IFaqMapCard {
  location?: MapLocation | null;
  image?: SanityImageSimple;
  badge?: string;
  address?: string;
  link?: IButtonElement;
}

interface IFaqSection {
  tagline?: string;
  title?: string;
  content?: SanityTextBlock[];
  addMap?: boolean;
  map?: IFaqMapCard;
  /*
   * Optional, like its twin `addMap` — a section authored before this toggle existed has no value
   * for it at all, and `initialValue: false` only applies to documents created after it was added.
   */
  addButton?: boolean;
  /**
   * The small uppercase label beside the closing button — "Still stuck?" (node 16:716).
   *
   * Desktop only: the mobile comp (16:797) drops it and gives the button the full width. See the
   * note in `sections/FaqSection/styles.module.scss` for why it is hidden with a `px` media query.
   */
  buttonEyebrow?: string;
  button?: IButtonElement;
  /*
   * Optional, because an unset array projects as absent rather than as `[]`. Declared required, the
   * `faqItems?.map` and `faqItems && faqItems.length > 0` guards both consumers already carry were
   * dead code that the type promised could never fire.
   */
  faqItems?: {
    _key?: string;
    question: string;
    answer: SanityTextBlock[];
    /**
     * The optional outline chip beneath an answer — "SHUTTLE · [FRI 2PM CENTRAL] · TBC" (nodes
     * 16:667 desktop, 16:750 mobile).
     *
     * A field rather than copy inside `answer`, because the chip is a *boxed* mono run and the
     * rich-text editor has no mark that draws one. It renders through `components/Tag` in its
     * `outline` variant.
     */
    note?: string;
  }[];
}

const faqSection = defineType({
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
     * Sentence case in the CMS, capitals from CSS — the convention `twoColumnListSection.eyebrow`
     * and `headerDisplaySection.items` both state. `text-transform` does not keep capitals out of
     * the accessibility tree (Chromium names an element from its rendered text), so a stored
     * "HELP MENU" is what a screen reader spells out, letter by letter.
     */
    {
      description:
        'The small label above the title — “Help menu”. Optional. Type it in normal sentence case; it is displayed in uppercase mono automatically.',
      group: 'data',
      name: `tagline`,
      title: `Tagline`,
      type: `string`
    },
    {
      group: 'data',
      name: `title`,
      title: `Title`,
      type: `title`
    },
    {
      group: 'data',
      name: `content`,
      title: `Content`,
      type: 'blockContentStandard'
    },
    /*
     * `addMap` / `map` mirrors the `addButton` / `button` pair this section already has, rather than
     * inferring the answer from the object: a Sanity object field is never *absent*, so "is the map
     * filled in?" would otherwise be answered by inspecting five nullable leaves — the same
     * shaped-object-with-null-leaves problem `tools/storybook/sectionFixture.ts` documents at
     * length. One boolean says it once, and hides five controls on every instance that does not
     * want them.
     */
    {
      description: 'Show the compact map card in the left column.',
      group: 'data',
      initialValue: false,
      name: 'addMap',
      title: 'Add Map Card',
      type: 'boolean'
    },
    {
      description: 'The map card beneath the intro copy. Pin a location for a live map, or upload a map image.',
      fields: [
        {
          description:
            'Search for the place, or drag the pin. Draws a live map; the zoom you leave the picker at is the zoom it opens at.',
          name: 'location',
          title: 'Location',
          type: 'geopoint'
        },
        {
          description: 'A static map image. Only used when no location is pinned.',
          name: 'image',
          title: 'Image',
          type: 'imageElementSimple'
        },
        {
          description:
            'The chip in the top-left corner — “Map · Sydney → Jamberoo, 90 min”. Shown exactly as typed, so any arrow or separator goes in the text.',
          name: 'badge',
          title: 'Badge Label',
          type: 'string'
        },
        {
          description:
            'The address in the bar along the bottom — “406 Jamberoo Mountain Rd”. Type it in normal case; it is displayed in uppercase mono automatically.',
          name: 'address',
          title: 'Address',
          type: 'string'
        },
        {
          description:
            'The “Open in maps” link in the bottom bar. Give it a label; leave the link empty to point it at the pinned location in Google Maps.',
          name: 'link',
          title: 'Maps Link',
          type: 'buttonElement'
        }
      ],
      group: 'data',
      hidden: ({ parent }) => !parent?.addMap,
      name: 'map',
      title: 'Map Card',
      type: 'object'
    },
    /*
     * Above the button pair, deliberately — and moved there by this ticket. The button now renders
     * at the **foot of the accordion** (node 16:714), so an editor meets these controls in the order
     * the page reads them. Field order in a Sanity object is display only; nothing stored moves.
     */
    {
      description:
        'Numbering is added automatically from each item’s position — do not type “01”. Reordering renumbers.',
      group: 'data',
      name: 'faqItems',
      of: [
        {
          fields: [
            {
              name: 'question',
              title: 'Question',
              type: 'string'
            },
            {
              name: 'answer',
              title: 'Answer',
              type: 'blockContentStandard'
            },
            {
              description:
                'An optional outline chip beneath the answer — “Shuttle · [Fri 2pm Central] · TBC”. Type it in normal case; it is displayed in uppercase mono automatically.',
              name: 'note',
              title: 'Note Chip',
              type: 'string'
            }
          ],
          name: 'faqItem',
          preview: {
            prepare(selection: { title?: string }) {
              return { title: selection?.title || 'FAQ Item' };
            },
            select: { title: 'question' }
          },
          title: 'FAQ Item',
          type: 'object'
        }
      ],
      title: 'FAQ Items',
      type: 'array'
    },
    {
      group: 'data',
      initialValue: false,
      name: `addButton`,
      title: `Add Button`,
      type: `boolean`
    },
    {
      description:
        'The small label beside the button — “Still stuck?”. Optional, and hidden on narrow screens where the button goes full width. Type it in normal sentence case; it is displayed in uppercase mono automatically.',
      group: 'data',
      hidden: ({ parent }) => !parent?.addButton,
      name: 'buttonEyebrow',
      title: 'Button Eyebrow',
      type: 'string'
    },
    {
      group: 'data',
      hidden: ({ parent }) => !parent?.addButton,
      name: `button`,
      title: `Button`,
      type: `buttonElement`
    },
    {
      group: 'styles',
      name: 'sectionFields',
      title: 'Section Fields',
      type: 'sectionFields'
    }
  ],
  groups: defaultSectionGroups,
  icon: MdQuestionAnswer,
  name: 'faqSection',
  preview: {
    prepare(selection: { faqItems?: unknown[]; internalLabel?: string }) {
      const count = selection?.faqItems?.length ?? 0;

      return {
        subtitle: selection?.internalLabel || `${count} question${count === 1 ? '' : 's'}`,
        title: `FAQ Section`
      };
    },
    select: {
      faqItems: 'faqItems',
      internalLabel: 'internalLabel'
    }
  },
  title: 'FAQ',
  type: 'object'
});

export { faqSection };
export type { IFaqMapCard, IFaqSection };
