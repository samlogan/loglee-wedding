import { TbMailForward } from 'react-icons/tb';
import { defineType } from 'sanity';
import type { ConditionalPropertyCallbackContext } from 'sanity';

import { isSendConfirmed, sendConfirmationPhrase } from '../../../helpers/guestEmails';

/**
 * One send of the invitation or the reminder, to the guest list — or a test to one address.
 *
 * **Publishing it sends it.** The Sanity webhook reaches the site, which reads the guest sheet,
 * works out who may receive this email (`eligibleFor` in `tools/helpers/guestEmails.ts`) and sends
 * through Loops in batches, writing the result back here: who it went to, who was skipped and why.
 *
 * The rules are the site's, not the editor's: an invitation never goes to a guest whose Invite sent
 * cell is filled, and a reminder never goes to a guest who has replied or was never invited. So
 * publishing the same kind twice is safe — the second send finds nobody left.
 *
 * Once the site has picked it up the document is read-only: it is a record of what was sent.
 */
interface IGuestEmailSend {
  _id: string;
  _rev: string;
  _type: 'guestEmailSend';
  kind?: 'invitation' | 'reminder';
  testEmail?: string;
  /** The typed confirmation a send to the guest list needs — see `sendConfirmationPhrase`. */
  confirm?: string;
  status?: 'requested' | 'sending' | 'done' | 'failed';
  lockedAt?: string;
  sent?: string[];
  skipped?: { _key: string; guestId: string; name: string; reason: string }[];
  failed?: { _key: string; guestId: string; name: string; error: string }[];
  summary?: string;
  finishedAt?: string;
}

const lockedOnceStarted = ({ document }: ConditionalPropertyCallbackContext) => Boolean(document?.status);

const guestEmailSend = defineType({
  fields: [
    {
      description: 'Which email to send. The emails themselves are designed in Loops.',
      name: 'kind',
      options: {
        layout: 'radio',
        list: [
          { title: 'Invitation — to guests not yet invited', value: 'invitation' },
          { title: 'Reminder — to invited guests who have not replied', value: 'reminder' }
        ]
      },
      readOnly: lockedOnceStarted,
      title: 'Email',
      type: 'string',
      validation: (Rule) => Rule.required()
    },
    {
      description:
        'Send a test to this address only, filled in with the first guest’s details. Leave blank to send to the guest list.',
      name: 'testEmail',
      readOnly: lockedOnceStarted,
      title: 'Test Address',
      type: 'email'
    },
    {
      description:
        'A send to the guest list emails real guests. Type SEND INVITATIONS (or SEND REMINDERS) to confirm — it cannot be published without it. Not needed for a test.',
      hidden: ({ document }) => Boolean(document?.testEmail || document?.status),
      name: 'confirm',
      readOnly: lockedOnceStarted,
      title: 'Confirm Sending to Guests',
      type: 'string',
      validation: (Rule) =>
        Rule.custom((value, { document }) => {
          if (document?.testEmail || document?.status) {
            return true;
          }
          const kind = document?.kind === 'reminder' ? 'reminder' : 'invitation';
          return (
            isSendConfirmed(kind, value as string | undefined) ||
            `Type “${sendConfirmationPhrase(kind)}” to send to guests`
          );
        })
    },
    {
      description: 'Written by the site.',
      hidden: ({ document }) => !document?.status,
      name: 'summary',
      readOnly: true,
      title: 'Result',
      type: 'text',
      rows: 3
    },
    {
      hidden: ({ document }) => !document?.status,
      name: 'status',
      options: {
        list: [
          { title: 'Waiting to send', value: 'requested' },
          { title: 'Sending…', value: 'sending' },
          { title: 'Done', value: 'done' },
          { title: 'Failed', value: 'failed' }
        ]
      },
      readOnly: true,
      title: 'Status',
      type: 'string'
    },
    {
      description: 'Guest IDs this email went to.',
      hidden: ({ document }) => !(document?.sent as unknown[] | undefined)?.length,
      name: 'sent',
      of: [{ type: 'string' }],
      readOnly: true,
      title: 'Sent To',
      type: 'array'
    },
    {
      hidden: ({ document }) => !(document?.skipped as unknown[] | undefined)?.length,
      name: 'skipped',
      of: [
        {
          fields: [
            { name: 'guestId', title: 'Guest ID', type: 'string' },
            { name: 'name', title: 'Name', type: 'string' },
            { name: 'reason', title: 'Reason', type: 'string' }
          ],
          name: 'skippedGuest',
          preview: {
            prepare: ({ name, reason }: { name?: string; reason?: string }) => ({ subtitle: reason, title: name }),
            select: { name: 'name', reason: 'reason' }
          },
          type: 'object'
        }
      ],
      readOnly: true,
      title: 'Skipped',
      type: 'array'
    },
    {
      hidden: ({ document }) => !(document?.failed as unknown[] | undefined)?.length,
      name: 'failed',
      of: [
        {
          fields: [
            { name: 'guestId', title: 'Guest ID', type: 'string' },
            { name: 'name', title: 'Name', type: 'string' },
            { name: 'error', title: 'Error', type: 'string' }
          ],
          name: 'failedGuest',
          preview: {
            prepare: ({ error, name }: { error?: string; name?: string }) => ({ subtitle: error, title: name }),
            select: { error: 'error', name: 'name' }
          },
          type: 'object'
        }
      ],
      readOnly: true,
      title: 'Failed',
      type: 'array'
    },
    { hidden: true, name: 'lockedAt', readOnly: true, type: 'datetime' },
    { hidden: true, name: 'finishedAt', readOnly: true, type: 'datetime' }
  ],
  icon: TbMailForward,
  name: 'guestEmailSend',
  orderings: [{ by: [{ direction: 'desc', field: '_createdAt' }], name: 'newest', title: 'Newest first' }],
  preview: {
    prepare({
      kind,
      sent,
      status,
      testEmail
    }: {
      kind?: string;
      sent?: string[];
      status?: string;
      testEmail?: string;
    }) {
      const what = kind === 'reminder' ? 'Reminder' : kind === 'invitation' ? 'Invitation' : 'Email';
      let subtitle = 'Not sent — publish to send';
      if (status === 'done') {
        subtitle = testEmail ? `Test sent to ${testEmail}` : `Sent to ${sent?.length ?? 0}`;
      } else if (status === 'failed') {
        subtitle = 'Failed';
      } else if (status) {
        subtitle = `Sending… ${sent?.length ?? 0} so far`;
      }
      return { subtitle, title: testEmail ? `${what} (test)` : what };
    },
    select: { kind: 'kind', sent: 'sent', status: 'status', testEmail: 'testEmail' }
  },
  title: 'Guest email',
  type: 'document'
});

export default guestEmailSend;
export type { IGuestEmailSend };
