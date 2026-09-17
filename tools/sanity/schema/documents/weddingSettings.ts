import { FiDatabase } from 'react-icons/fi';
import { TbCoin, TbHeart, TbMailHeart, TbMapPin } from 'react-icons/tb';
import { defineType } from 'sanity';

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
    mapUrl?: string;
  };
  rsvpDeadline?: string;
  rsvpLabel?: string;
  contribution: {
    showAmount: boolean;
    amountPerNight?: number;
    copyWithAmount?: SanityTextBlock[];
    copyWithoutAmount?: SanityTextBlock[];
    paymentDetails?: SanityTextBlock[];
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
        {
          name: `address`,
          rows: 3,
          title: `Address`,
          type: `text`
        },
        {
          description: 'Link used by the "Get directions" action and the map section.',
          name: `mapUrl`,
          title: `Map URL`,
          type: `url`
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
        {
          description:
            'Shown when an amount is named. Write "{amount}" where the figure belongs — it is swapped in mid-sentence as a highlighted token.',
          hidden: ({ parent }) => !parent?.showAmount,
          name: `copyWithAmount`,
          title: `Copy (With Amount)`,
          type: `blockContentStandard`
        },
        {
          description: 'Shown when no amount is named, so the sentence still reads on its own.',
          hidden: ({ parent }) => parent?.showAmount,
          name: `copyWithoutAmount`,
          title: `Copy (Without Amount)`,
          type: `blockContentStandard`
        },
        {
          description: 'Bank or payment details. Only shown to guests after they have submitted an RSVP.',
          name: `paymentDetails`,
          title: `Payment Details`,
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
