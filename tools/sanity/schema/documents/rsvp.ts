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
  /** No longer asked — present only on replies sent before the form dropped the question. */
  attending?: IRsvpDay[];
  dietary?: string;
  plusOne: {
    bringing: boolean;
    name?: string;
    dietary?: string;
  };
  songRequest?: string;
  /** Anything the guest needs — a cot, a ground-floor room. */
  specialRequirements?: string;
  /** The guest sheet's ID for whoever sent this, when they were signed in. */
  guestId?: string;
  submittedAt?: string;
  /** No longer asked — present only on replies sent before the form dropped the question. */
  roomPreference?: string;
  kidsCount?: number;
  kidsAges?: string;
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
      description:
        'The days of the weekend this guest is coming to. No longer asked on the form — shown only on replies sent before it was removed.',
      group: 'response',
      hidden: ({ value }) => !(Array.isArray(value) && value.length > 0),
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
      description: 'Anything this guest needs for the weekend — a cot, a ground-floor room.',
      group: 'response',
      name: `specialRequirements`,
      title: `Special Requirements`,
      type: `text`
    },
    {
      description: 'The guest sheet ID of whoever sent this reply, when they were signed in with one.',
      group: 'response',
      name: `guestId`,
      title: `Guest ID`,
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
        'The room this guest asked for. No longer asked on the form — shown only on replies sent before it was removed.',
      group: 'stay',
      hidden: ({ value }) => !value,
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
    /*
     * One string for all of a guest's children, as the form asks for it — not a number per child.
     * Guests write "2 and 5", "18 months" or "newborn and 4", and a parse into `number[]` would drop
     * exactly the answers the nannies most need. Changed in MAM-1902, before any reply was stored.
     */
    {
      description: 'As the guest wrote it — one line for all their children, e.g. "2 and 5". Used to plan the nannies.',
      group: 'stay',
      name: `kidsAges`,
      title: `Kids' Ages`,
      type: `string`
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
