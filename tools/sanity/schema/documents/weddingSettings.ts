import { FiDatabase } from 'react-icons/fi';
import { TbCoin, TbHeart, TbMailHeart, TbMapPin } from 'react-icons/tb';
import { defineType } from 'sanity';

import type { MapLocation } from '../../../helpers/mapLocation';

interface IWeddingSettingsDocument {
  // Sanity fields
  _createdAt: string;
  _updatedAt: string;

  // Defined fields
  title: string;
  coupleNames: {
    partnerOne?: string;
    partnerTwo?: string;
  };
  startDate?: string;
  endDate?: string;
  venue: {
    name?: string;
    address?: string;
    travelNote?: string;
    mapUrl?: string;
    location?: MapLocation | null;
  };
  rsvpDeadline?: string;
  rsvpLabel?: string;
  /** The note under the RSVP heading, e.g. the reply-by date and why it matters. */
  rsvpNote?: SanityTextBlock[];
  contribution: {
    showAmount: boolean;
    amountPerNight?: number;
    copyWithAmount?: SanityTextBlock[];
    copyWithoutAmount?: SanityTextBlock[];
    /** Bank transfer to the Australian account — for guests whose Nationality is blank or Australian. */
    paymentDetailsAustralia?: SanityTextBlock[];
    /** Wise — for everyone else. */
    paymentDetailsInternational?: SanityTextBlock[];
  };
}

const weddingSettings = defineType({
  fields: [
    {
      description: 'Used for the browser tab, link previews and anywhere the site is named.',
      group: 'data',
      name: `title`,
      title: `Site Title`,
      type: `string`,
      validation: (Rule) => Rule.required()
    },
    {
      description: 'Shown together across the site, and stacked in oversized type on the homepage.',
      fields: [
        {
          name: `partnerOne`,
          title: `Partner One`,
          type: `string`
        },
        {
          name: `partnerTwo`,
          title: `Partner Two`,
          type: `string`
        }
      ],
      group: 'data',
      name: `coupleNames`,
      options: {
        collapsible: false
      },
      title: `Couple Names`,
      type: `object`
    },
    {
      description: 'The first day of the wedding weekend.',
      group: 'data',
      name: `startDate`,
      title: `Start Date`,
      type: `date`
    },
    {
      description: 'The last day of the wedding weekend.',
      group: 'data',
      name: `endDate`,
      title: `End Date`,
      type: `date`
    },
    {
      fields: [
        {
          name: `name`,
          title: `Venue Name`,
          type: `string`
        },
        /*
         * The description is there because the home hero reads this field by *line*: it prints the
         * first line with text as the street, beneath the couple's names, and drops the rest. An
         * editor who puts the venue name or the town first gets that printed instead — so the order
         * of the lines is the one thing worth saying.
         */
        {
          description: 'Street on the first line. The home page shows that line beneath the names.',
          name: `address`,
          rows: 3,
          title: `Address`,
          type: `text`
        },
        /*
         * On the venue rather than on the hero section, per MAM-1939: it describes where the venue
         * is, so it belongs with the rest of the venue, and the footer or a later section can read it
         * without a second copy. The hero joins it in through its projection.
         *
         * Sentence case in the Studio and capitals from CSS, for the reason `headerDisplaySection.items`
         * gives — short literal all-caps runs are what screen readers most often spell out letter by
         * letter, and `text-transform` already guarantees the display.
         *
         * 40 characters is the one line it gets on a phone: the hero sets it in the mono role at 11px
         * with 0.1em tracking, about 7.7px a character, and a 375px screen leaves a 335px column.
         * `.warning()` rather than `.error()` — a longer note wraps onto a second line, it is not lost.
         */
        {
          description:
            'One short line on where the venue is, from somewhere guests know — “90 min south of Sydney”. Shown beside the address on the home page. Type it in normal sentence case; it is displayed in uppercase automatically.',
          name: `travelNote`,
          title: `Travel Note`,
          type: `string`,
          validation: (Rule) =>
            Rule.max(40).warning('Longer than this wraps onto a second line under the names on a phone.')
        },
        {
          description: 'Link used by the "Get directions" action and the map section.',
          name: `mapUrl`,
          title: `Map URL`,
          type: `url`
        },
        /*
         * The venue's pin, set once for the site: the RSVP page's map card draws it, and a FAQ map
         * card with no pin of its own falls back to it (see `sections/FaqSection/queries.groq.ts`).
         */
        {
          description:
            'Pin the venue. Used by the map on the RSVP page, and by the FAQ map when it has no location of its own. The zoom you leave the picker at is the zoom the maps open at.',
          name: `location`,
          title: `Location`,
          type: `geopoint`
        }
      ],
      group: 'venue',
      name: `venue`,
      options: {
        collapsible: false
      },
      title: `Venue`,
      type: `object`
    },
    {
      description: 'The date guests need to have replied by.',
      group: 'rsvp',
      name: `rsvpDeadline`,
      title: `RSVP Deadline`,
      type: `date`
    },
    {
      description: `The short "reply by" line shown in the navigation, e.g. "RSVP by 13 November".`,
      group: 'rsvp',
      name: `rsvpLabel`,
      title: `RSVP Label`,
      type: `string`
    },
    {
      description: 'Shown under the RSVP heading on the RSVP page, e.g. "Please RSVP by 30 November…".',
      group: 'rsvp',
      name: `rsvpNote`,
      title: `RSVP Note`,
      type: `blockContentSimple`
    },
    {
      description: 'The accommodation contribution ask, and the payment details guests see once they have replied.',
      fields: [
        {
          description: 'Turn this on to name a figure on the site. Leave it off for the softer, amount-free wording.',
          initialValue: false,
          name: `showAmount`,
          title: `Name An Amount`,
          type: `boolean`
        },
        {
          description: 'Contribution per room, per night, in AUD. Rendered as a highlighted token inside the copy.',
          hidden: ({ parent }) => !parent?.showAmount,
          name: `amountPerNight`,
          title: `Amount Per Night`,
          type: `number`,
          validation: (Rule) => Rule.min(0)
        },
        /*
         * `blockContentSimple`, not `Standard` — matching the guard `twoColumnListSection.content`
         * already carries and for exactly the same reason, which the joined field slipped past
         * because it is typed on a different document.
         *
         * `Standard` offers H1–H6, and `TextBlock` renders an `h1` style as a real `<h1>` at
         * `--heading-lg`. One click of it here puts a second `<h1>` on `/stay` — after the section's
         * own `<h2>`, inside a ~540px column — on a page that already has one from
         * `headerDisplaySection`. That is an h2→h1 order break (WCAG 1.3.1) authored from a settings
         * document, three files away from the section it breaks.
         *
         * Nothing is lost: both fields hold one sentence, `Simple` keeps strong/em/underline and
         * link annotations, and `TwoColumnListSection` is their only renderer. The two payment fields
         * below stay `Standard` — different surface, different renderer, and a list of bank
         * details is a fair use of one.
         */
        {
          description:
            'Shown when an amount is named. Write "{amount}" where the figure belongs — it is swapped in mid-sentence as a highlighted token.',
          hidden: ({ parent }) => !parent?.showAmount,
          name: `copyWithAmount`,
          title: `Copy (With Amount)`,
          type: `blockContentSimple`
        },
        /*
         * **Never hidden**, and that is a fix rather than an omission.
         *
         * This field carried `hidden: ({ parent }) => parent?.showAmount` — hiding itself in exactly
         * the state where it is most likely to be what publishes. `resolveAmountCopy` falls back to
         * it from three separate branches while `showAmount` is on: the with-amount copy is blank,
         * the figure is unset, or the figure is unusable (negative, `NaN`). In every one of those an
         * editor with the toggle on has this sentence on the live site and no control in the Studio
         * that shows it to them — and the toggle is the field they would flip *back* to find it,
         * which is the one action that makes the problem look fixed.
         *
         * It is not conditional on anything, so it takes no predicate at all. The description does
         * the work the predicate was doing badly: it says when the field is used.
         */
        {
          description:
            'Shown when no amount is named, so the sentence still reads on its own. Also the fallback whenever an amount is named but not usable — the figure left blank, or the copy above left empty — so keep it filled in even with the toggle on.',
          name: `copyWithoutAmount`,
          title: `Copy (Without Amount)`,
          type: `blockContentSimple`
        },
        {
          description:
            'Bank transfer details for the Australian account. Shown after they RSVP to guests whose Nationality in the guest sheet is blank or Australian.',
          name: `paymentDetailsAustralia`,
          title: `Payment Details — Australian Guests`,
          type: `blockContentStandard`
        },
        {
          description: 'Wise details. Shown after they RSVP to every other guest.',
          name: `paymentDetailsInternational`,
          title: `Payment Details — International Guests (Wise)`,
          type: `blockContentStandard`
        }
      ],
      group: 'contribution',
      name: `contribution`,
      options: {
        collapsible: false
      },
      title: `Contribution`,
      type: `object`
    }
  ],
  groups: [
    {
      default: true,
      icon: FiDatabase,
      name: 'data',
      title: 'Data'
    },
    {
      icon: TbMapPin,
      name: 'venue',
      title: 'Venue'
    },
    {
      icon: TbMailHeart,
      name: 'rsvp',
      title: 'RSVP'
    },
    {
      icon: TbCoin,
      name: 'contribution',
      title: 'Contribution'
    }
  ],
  icon: TbHeart,
  name: `weddingSettings`,
  preview: {
    prepare(selection) {
      const { partnerOne, partnerTwo, startDate } = selection;
      const names = [partnerOne, partnerTwo].filter(Boolean).join(' & ');
      return {
        subtitle: [names, startDate].filter(Boolean).join(' — ') || undefined,
        title: `Wedding Settings`
      };
    },
    select: {
      partnerOne: 'coupleNames.partnerOne',
      partnerTwo: 'coupleNames.partnerTwo',
      startDate: 'startDate'
    }
  },
  title: `Wedding Settings`,
  type: `document`
});

export default weddingSettings;
export type { IWeddingSettingsDocument };
