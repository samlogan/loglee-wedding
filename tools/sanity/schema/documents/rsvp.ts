import { FiDatabase } from 'react-icons/fi';
import { TbBed, TbMailCheck } from 'react-icons/tb';
import { defineType } from 'sanity';

type IRsvpDay = 'friday' | 'saturday' | 'sunday';

interface IRsvpDocument {
  // Sanity fields
  _createdAt: string;
  _updatedAt: string;

  // Defined fields
  name: string;
  email: string;
  attending: IRsvpDay[];
  dietary?: string;
  plusOne: {
    bringing: boolean;
    name?: string;
    dietary?: string;
  };
  songRequest?: string;
  submittedAt?: string;
  roomPreference?: string;
  kidsCount?: number;
  kidsAges?: number[];
}

// Written by the RSVP server action with a server-only write token, never by hand, so the whole
// document is read-only in the Studio. It is also filtered out of the "Create new" menu in
// tools/sanity/config — creating one here would only produce an uneditable empty reply.
const rsvp = defineType({
  fields: [
    {
      group: 'response',
      name: `name`,
      title: `Name`,
      type: `string`,
      validation: (Rule) => Rule.required()
    },
    {
      group: 'response',
      name: `email`,
      title: `Email`,
      type: `string`,
      validation: (Rule) => Rule.required().email()
    },
    {
      description: 'The days of the weekend this guest is coming to.',
      group: 'response',
      name: `attending`,
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Friday — dinner', value: 'friday' },
          { title: 'Saturday — wedding', value: 'saturday' },
          { title: 'Sunday — breakfast', value: 'sunday' }
        ]
      },
      title: `Attending`,
      type: `array`
    },
    {
      group: 'response',
      name: `dietary`,
      rows: 2,
      title: `Dietary Requirements`,
      type: `text`
    },
    {
      fields: [
        {
          initialValue: false,
          name: `bringing`,
          title: `Bringing A Plus One`,
          type: `boolean`
        },
        {
          hidden: ({ parent }) => !parent?.bringing,
          name: `name`,
          title: `Name`,
          type: `string`
        },
        {
          hidden: ({ parent }) => !parent?.bringing,
          name: `dietary`,
          rows: 2,
          title: `Dietary Requirements`,
          type: `text`
        }
      ],
      group: 'response',
      name: `plusOne`,
      options: {
        collapsible: false
      },
      title: `Plus One`,
      type: `object`
    },
    {
      description: 'Anything this guest would like played on the night.',
      group: 'response',
      name: `songRequest`,
      title: `Song Request`,
      type: `string`
    },
    {
      description: 'Stamped by the server action when the form is submitted.',
      group: 'response',
      name: `submittedAt`,
      title: `Submitted At`,
      type: `datetime`
    },
    {
      description:
        'Free text rather than a reference, because room types are not a document type. The Lodge offers the King Room, the Twin Double and the Family Room.',
      group: 'stay',
      name: `roomPreference`,
      title: `Room Preference`,
      type: `string`
    },
    {
      group: 'stay',
      name: `kidsCount`,
      title: `Number Of Kids`,
      type: `number`,
      validation: (Rule) => Rule.min(0)
    },
    {
      description: 'One entry per child, used to plan the nannies.',
      group: 'stay',
      name: `kidsAges`,
      of: [{ type: 'number' }],
      title: `Kids' Ages`,
      type: `array`
    }
  ],
  groups: [
    {
      default: true,
      icon: FiDatabase,
      name: 'response',
      title: 'Response'
    },
    {
      icon: TbBed,
      name: 'stay',
      title: 'Stay'
    }
  ],
  icon: TbMailCheck,
  name: `rsvp`,
  orderings: [
    {
      by: [{ direction: 'desc', field: 'submittedAt' }],
      name: 'submittedAt',
      title: 'Newest First'
    }
  ],
  preview: {
    prepare(selection) {
      const { name, submittedAt } = selection;
      // Deliberately not formatDate: that helper pins Sanity `date` fields to UTC so a calendar date
      // reads the same everywhere. `submittedAt` is a `datetime` — a real instant — so it should
      // render in the reader's own zone, or a 9am Sydney reply would show as the previous evening.
      const submitted = submittedAt
        ? new Date(submittedAt).toLocaleString('en-GB', {
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        : 'Not submitted';
      return {
        subtitle: submitted,
        title: name || 'RSVP'
      };
    },
    select: {
      name: 'name',
      submittedAt: 'submittedAt'
    }
  },
  readOnly: true,
  title: `RSVP`,
  type: `document`
});

export default rsvp;
export type { IRsvpDay, IRsvpDocument };
