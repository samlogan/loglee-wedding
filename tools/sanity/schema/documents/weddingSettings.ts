import { FiDatabase } from 'react-icons/fi';
import { TbCoin, TbHeart, TbMail, TbMailHeart, TbMapPin } from 'react-icons/tb';
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
  /** The photo on the entry page, under the couple's names. */
  entryImage?: SanityImageSimple;
  rsvpDeadline?: string;
  rsvpLabel?: string;
  /** The note under the RSVP heading, e.g. the reply-by date and why it matters. */
  rsvpNote?: SanityTextBlock[];
  contribution: {
    /** The accommodation wording on the Stay page. Prices are per guest, from the guest sheet. */
    copy?: SanityTextBlock[];
  };
  /** The RSVP form's words — see `RsvpFormCopy`. Every one falls back to the form's own when blank. */
  rsvpForm?: RsvpFormCopy;
  invitationEmail?: {
    /** The invitation's opening paragraphs, under "Hi {firstName},". Up to three. */
    intro?: string[];
  };
  thankYouEmail?: {
    /** The thank-you email's opening paragraphs, under "Thank you, {firstName}!". */
    intro?: string[];
  };
}

/** The editable words on the RSVP form. */
interface RsvpFormCopy {
  heading?: string;
  intro?: string;
  introDetail?: string;
  stayNote?: string;
  stayingLabel?: string;
  extraNightLabel?: string;
  extraNightDescription?: string;
  placeholders?: Partial<Record<RsvpPlaceholder, string>>;
}

/** The form's free-text answers, each with a placeholder an editor can change. */
const RSVP_PLACEHOLDERS = [
  { name: 'name', title: 'Name' },
  { name: 'email', title: 'Email' },
  { name: 'dietary', title: 'Dietary requirements' },
  { name: 'plusOneName', title: 'Plus one name' },
  { name: 'plusOneDietary', title: 'Plus one dietary requirements' },
  { name: 'kidsAges', title: 'Kids’ ages' },
  { name: 'specialRequirements', title: 'Special requirements' },
  { name: 'songRequest', title: 'Song request' }
] as const;

type RsvpPlaceholder = (typeof RSVP_PLACEHOLDERS)[number]['name'];

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
      description:
        'The photo on the page guests see first, where they enter their guest ID — under the couple’s names, as in the invitation email.',
      group: 'data',
      name: 'entryImage',
      options: { hotspot: true },
      title: 'Entry Page Photo',
      type: 'image'
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
      description: 'The words on the RSVP form. Leave any blank to use the form’s own.',
      fields: [
        { description: 'The big heading, e.g. “RSVP”.', name: 'heading', title: 'Heading', type: 'string' },
        {
          description: 'The first sentence beside the form, shown at every width.',
          name: 'intro',
          title: 'Intro',
          type: 'string'
        },
        {
          description: 'The rest of the intro. Shown on wider screens only — phones keep just the first sentence.',
          name: 'introDetail',
          rows: 2,
          title: 'Intro (continued)',
          type: 'text'
        },
        {
          description: 'Under the guest’s stay and price, e.g. how and when they pay.',
          name: 'stayNote',
          title: 'Stay Note',
          type: 'string'
        },
        {
          description:
            'The last question, on by default, e.g. “Want to stay with us at The Lodge?”. Switched off, the guest sees no stay, price or payment details.',
          name: 'stayingLabel',
          title: 'Staying — Label',
          type: 'string'
        },
        {
          description:
            'The switch that adds the Sunday night to a guest’s stay, e.g. “Spend the Sunday evening with us”.',
          name: 'extraNightLabel',
          title: 'Sunday Night — Label',
          type: 'string'
        },
        {
          description: 'Under that switch, e.g. “Add an extra night to your stay and recover in style by the pool.”',
          name: 'extraNightDescription',
          rows: 2,
          title: 'Sunday Night — Description',
          type: 'text'
        },
        {
          description: 'The grey hint text inside each empty answer.',
          fields: RSVP_PLACEHOLDERS.map(({ name, title }) => ({ name, title, type: 'string' })),
          name: 'placeholders',
          options: { collapsible: true, collapsed: true },
          title: 'Placeholders',
          type: 'object'
        }
      ],
      group: 'rsvp',
      name: 'rsvpForm',
      options: { collapsible: false },
      title: 'RSVP Form',
      type: 'object'
    },
    {
      fields: [
        {
          description:
            'The opening paragraphs, under “Hi {first name},”. One item per paragraph, up to three. Goes out with each invitation the site sends — a test send shows it.',
          name: 'intro',
          of: [{ rows: 3, type: 'text' }],
          title: 'Intro',
          type: 'array',
          validation: (Rule) => Rule.max(3)
        }
      ],
      group: 'emails',
      name: 'invitationEmail',
      options: { collapsible: false },
      title: 'Invitation Email',
      type: 'object'
    },
    {
      fields: [
        {
          description:
            'The opening paragraphs, under “Thank you, {first name}!”. One item per paragraph. Sent to each guest the moment their RSVP is saved.',
          name: 'intro',
          of: [{ rows: 3, type: 'text' }],
          title: 'Intro',
          type: 'array'
        }
      ],
      group: 'emails',
      name: 'thankYouEmail',
      options: { collapsible: false },
      title: 'Thank-you Email',
      type: 'object'
    },
    {
      description:
        'The accommodation wording on the Stay page. Each guest’s own price is on their RSVP, from the guest sheet; the payment details are under Nationalities & payment.',
      fields: [
        {
          description: 'Shown beside the heading of the Stay page’s rooms panel.',
          name: `copy`,
          title: `Stay Page Copy`,
          type: `blockContentSimple`
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
    },
    {
      icon: TbMail,
      name: 'emails',
      title: 'Emails'
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
export type { IWeddingSettingsDocument, RsvpFormCopy, RsvpPlaceholder };
