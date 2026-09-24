import 'server-only';
import {
  SKIP_REASON_LABEL,
  eligibleFor,
  invitationIntroProperties,
  isSendConfirmed,
  sendConfirmationPhrase
} from '@/helpers/guestEmails';
import type { GuestEmailKind, Replies } from '@/helpers/guestEmails';
import type { Guest } from '@/helpers/guests';
import { normaliseGuestId } from '@/helpers/guests';
import { INVITATION_EMAIL_QUERY } from '@/tools/sanity/lib/queries.groq';
import writeClient from '@/tools/sanity/lib/writeClient';
import type { IGuestEmailSend } from '@/tools/sanity/schema/documents/guestEmailSend';

import { hasGoogleCredentials } from './googleAuth';
import { ensureContactProperties, hasLoopsKey, hasThankYouEmail, sendGuestEmail, sendThankYouEmail } from './loops';
import { markSent, readGuests, sentColumn } from './sheet';
import { thankYouVariablesFor } from './thankYou';

/**
 * Guests per webhook call. Each one is an email and a sheet write; ten fits comfortably inside a
 * serverless function's time limit. The next batch starts when this one's write to the send document
 * fires the Sanity webhook again.
 */
const BATCH = 10;

/** A send marked `sending` for longer than this is assumed to have died mid-batch, and is picked up again. */
const STALE_MS = 5 * 60 * 1000;

const nameOf = (guest: Guest) => [guest.firstName, guest.lastName].filter(Boolean).join(' ');

const keyOf = (value: string) => value.replaceAll(/[^\w-]/g, '').slice(0, 60) || 'x';

/** The guest a test is filled in with: the one asked for by ID, or the first in the sheet. */
const testGuestOf = (guests: Guest[], guestId?: string): Guest => {
  const wanted = guestId?.trim() ? normaliseGuestId(guestId) : undefined;
  const sample = wanted ? guests.find((guest) => guest.id === wanted) : guests[0];
  if (!sample) {
    throw new Error(
      wanted
        ? `No guest with the ID ${wanted} in the guest sheet.`
        : 'The guest sheet has no guests to fill the test with.'
    );
  }
  return sample;
};

const repliesOf = async (): Promise<Replies> => {
  const rows = writeClient
    ? await writeClient.fetch<{ guestId?: string; email?: string }[]>('*[_type == "rsvp"]{guestId, email}')
    : [];
  return {
    emails: new Set(rows.flatMap((row) => (row.email ? [row.email.trim().toLowerCase()] : []))),
    guestIds: new Set(rows.flatMap((row) => (row.guestId ? [row.guestId] : [])))
  };
};

/**
 * The contact properties an email of this kind carries on top of the guest's own: for an invitation,
 * its intro from Wedding Settings → Emails, read straight from the dataset so a send just after an
 * edit goes out with the edit.
 */
const emailPropertiesFor = async (kind: GuestEmailKind): Promise<Record<string, string> | undefined> =>
  kind === 'invitation' ? invitationIntroProperties(await writeClient?.fetch(INVITATION_EMAIL_QUERY)) : undefined;

/**
 * Take the next batch of a published guest email send. Called by the Sanity webhook for every
 * `guestEmailSend` change, including the ones this makes: each batch ends by writing its progress,
 * which calls this again for the next, until nobody is left.
 *
 * - A revision-checked lock (`status: sending`) means two webhook calls can never send one batch.
 * - Who may receive the email is decided afresh each batch from the sheet and the replies in Sanity
 *   (`eligibleFor`), minus the guests this send already reached — so a reminder cannot go twice
 *   within one send, and an invitation cannot go to anyone whose Invite sent cell is filled.
 * - Each guest's sheet cell is written the moment their email goes.
 */
export const processEmailSend = async (id: string) => {
  if (!writeClient || id.startsWith('drafts.')) {
    return;
  }
  const send = await writeClient.getDocument<IGuestEmailSend>(id);
  if (!send || send._type !== 'guestEmailSend' || !send.kind) {
    return;
  }
  const busy = send.status === 'sending' && Date.now() - Date.parse(send.lockedAt ?? '') < STALE_MS;
  if (send.status === 'done' || send.status === 'failed' || busy) {
    return;
  }

  const now = new Date();
  try {
    await writeClient
      .patch(id)
      .ifRevisionId(send._rev)
      .set({ lockedAt: now.toISOString(), status: 'sending' })
      .commit();
  } catch {
    // Another call took the lock first.
    return;
  }

  const finish = (fields: Partial<IGuestEmailSend>) =>
    writeClient
      ?.patch(id)
      .set({ finishedAt: new Date().toISOString(), ...fields })
      .commit();

  try {
    if (!hasLoopsKey() || !hasGoogleCredentials()) {
      throw new Error('The Loops key or the guest sheet credentials are not set on this site.');
    }
    const guests = await readGuests({ fresh: true });

    // The thank-you goes to guests on its own, as each RSVP is saved; from here it is only ever a test.
    if (send.kind === 'thankYou') {
      if (!send.testEmail) {
        await finish({
          status: 'failed',
          summary: 'Not sent: the thank-you email can only be sent as a test. Guests get it when they RSVP.'
        });
        return;
      }
      if (!hasThankYouEmail()) {
        throw new Error('LOOPS_THANK_YOU_ID is not set on this site.');
      }
      const sample = testGuestOf(guests, send.testGuestId);
      await sendThankYouEmail({
        dataVariables: await thankYouVariablesFor(sample, { extraNight: send.testExtraNight }),
        idempotencyKey: `test-thank-you-${keyOf(id)}`,
        to: send.testEmail
      });
      await finish({
        status: 'done',
        summary: `Test sent to ${send.testEmail}, filled in with ${nameOf(sample)}’s details. No guest was emailed.`
      });
      return;
    }

    const kind: GuestEmailKind = send.kind;
    await ensureContactProperties();
    const properties = await emailPropertiesFor(kind);

    if (send.testEmail) {
      const sample = testGuestOf(guests, send.testGuestId);
      await sendGuestEmail(kind, sample, {
        idempotencyKey: `test-${kind}-${keyOf(id)}`,
        properties,
        to: send.testEmail
      });
      await finish({
        status: 'done',
        summary: `Test sent to ${send.testEmail}, filled in with ${nameOf(sample)}’s details. No guest was emailed.`
      });
      return;
    }

    // The Studio will not publish a guest-list send without its typed confirmation; check again here,
    // so one that reached the site some other way — an API write, a schema change — emails nobody.
    if (!isSendConfirmed(kind, send.confirm)) {
      await finish({
        status: 'failed',
        summary: `Not sent: a send to the guest list needs “${sendConfirmationPhrase(kind)}” typed to confirm. No guest was emailed.`
      });
      return;
    }

    const alreadySent = new Set(send.sent);
    const { send: eligible, skipped } = eligibleFor(kind, guests, await repliesOf());
    const remaining = eligible.filter((guest) => !alreadySent.has(guest.id));
    const batch = remaining.slice(0, BATCH);

    const column = await sentColumn(kind === 'invitation' ? 'inviteSent' : 'reminderSent');
    const label = kind === 'invitation' ? 'Invite sent' : 'Reminder sent';
    const sentNow: string[] = [];
    const failed = [...(send.failed ?? [])];

    for (const guest of batch) {
      try {
        // Per guest for an invitation, so no two sends within Loops's 24 hours can invite anyone twice;
        // per send for a reminder, since a later reminder is allowed.
        const idempotencyKey =
          kind === 'invitation' ? `invitation-${keyOf(guest.id)}` : `reminder-${keyOf(guest.id)}-${keyOf(id)}`;
        await sendGuestEmail(kind, guest, { idempotencyKey, properties });
        sentNow.push(guest.id);
        await markSent(guest, column, label, new Date());
      } catch (error) {
        failed.push({
          _key: keyOf(`${guest.id}-${failed.length}`),
          error: error instanceof Error ? error.message : String(error),
          guestId: guest.id,
          name: nameOf(guest)
        });
      }
    }

    const sent = [...alreadySent, ...sentNow];
    const failedIds = new Set(failed.map((entry) => entry.guestId));
    const left = remaining.filter((guest) => !sentNow.includes(guest.id) && !failedIds.has(guest.id));
    // Guests sent earlier in this send now read as "already invited" — they are in `sent`, not skipped.
    const skippedList = skipped
      .filter(({ guest }) => !alreadySent.has(guest.id) && !sentNow.includes(guest.id))
      .map(({ guest, reason }) => ({
        _key: keyOf(guest.id),
        guestId: guest.id,
        name: nameOf(guest),
        reason: SKIP_REASON_LABEL[reason]
      }));

    if (left.length > 0 && sentNow.length > 0) {
      // More to go: hand back to `requested`, which fires the webhook again for the next batch.
      await writeClient
        .patch(id)
        .set({
          failed,
          sent,
          skipped: skippedList,
          status: 'requested',
          summary: `Sending… ${sent.length} sent, ${left.length} to go.`
        })
        .commit();
      return;
    }

    await finish({
      failed,
      sent,
      skipped: skippedList,
      status: sent.length === 0 && failed.length > 0 ? 'failed' : 'done',
      summary: [
        `Sent to ${sent.length} ${sent.length === 1 ? 'guest' : 'guests'}.`,
        skippedList.length > 0 && `Skipped ${skippedList.length} — see below.`,
        failed.length > 0 && `${failed.length} failed — see below.`
      ]
        .filter(Boolean)
        .join(' ')
    });
  } catch (error) {
    console.error('[Guest emails] Send failed.', error);
    await finish({ status: 'failed', summary: error instanceof Error ? error.message : String(error) });
  }
};
