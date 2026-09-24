'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import type { RsvpFormState } from '@/components/RsvpForm/contract';
import { currentGuest } from '@/tools/guests/session';
import { markReplied } from '@/tools/guests/sheet';
import { sendThankYou } from '@/tools/guests/thankYou';
import createRateLimiter from '@/tools/helpers/rateLimiter';
import {
  isHoneypotFilled,
  isRepeatTooSoon,
  isSameRsvpReply,
  parseRsvpSubmission,
  rsvpDocumentId,
  toRsvpDocument
} from '@/tools/helpers/rsvpSubmission';
import type { RsvpReply } from '@/tools/helpers/rsvpSubmission';
import writeClient from '@/tools/sanity/lib/writeClient';

const SAVED: RsvpFormState = { status: 'success' };

/** Every refusal says the reply was not stored. `fieldErrors` is empty: none of these is one field's. */
const notSaved = (message: string): RsvpFormState => ({ fieldErrors: {}, message, status: 'error' });

const MESSAGE = {
  failed: "Something went wrong on our side and your reply hasn't been saved. Please try again in a minute.",
  // Deliberately says nothing about why. A bot is told it failed, never what gave it away.
  refused: "We couldn't save your reply. Please try again.",
  tooMany:
    "A lot of replies have come from your connection in the last few minutes, so this one hasn't been saved. Please try again a little later.",
  tooSoon:
    "You sent a reply a moment ago, so this change hasn't been saved yet. Give it a few seconds, then send it again."
};

/**
 * The second, best-effort layer: ten stored replies per connection per ten minutes, per instance.
 *
 * It sees only the requests that reach this warm instance — see `createRateLimiter` — so it slows a
 * naive flood that varies the email address and cannot stop a distributed one. A household on one
 * connection sending a reply each stays well under it. Counted after validation, so a guest fixing
 * mistakes is never charged for them.
 */
const connectionLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

/**
 * The caller's address, or `undefined` when there is none to go on — and then no per-connection
 * limit applies, rather than one bucket shared by every guest.
 *
 * Netlify's `x-nf-client-connection-ip` is set by its edge and cannot be supplied by the client.
 * `x-forwarded-for` is the fallback elsewhere, and its first entry can be forged — acceptable for a
 * limit that is only ever best effort.
 */
const connectionOf = async (): Promise<string | undefined> => {
  const requestHeaders = await headers();
  const address =
    requestHeaders.get('x-nf-client-connection-ip') ?? requestHeaders.get('x-forwarded-for')?.split(',')[0];
  return address?.trim() || undefined;
};

/** Sanity answers 409 when a `create` finds the ID taken, or an `ifRevisionId` finds the revision moved on. */
const isConflict = (error: unknown) =>
  typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 409;

/**
 * What goes to the log: the status and message, and nothing else. Never the error object — it can
 * carry the request, and this client's requests carry the write token.
 */
const summarise = (error: unknown) => {
  if (!(error instanceof Error)) {
    return 'a value that is not an Error was thrown';
  }
  const status = 'statusCode' in error ? ` (${String(error.statusCode)})` : '';
  return `${error.name}${status}: ${error.message}`;
};

/**
 * The RSVP form's server action. See `components/RsvpForm/contract.ts` for the `FormData` it
 * receives and the state it returns; every check it makes lives in `tools/helpers/rsvpSubmission`.
 *
 * In order, cheapest first, and nothing touches Sanity until a reply has passed every check:
 *
 * 1. **Honeypot** — a ticked `_gotcha` is refused before validation, so a bot learns nothing about
 *    which of its answers were wrong, and nothing is read or written.
 * 2. **Validation** — per-field errors, keyed by the names the controls submit under.
 * 3. **Per connection** — the best-effort in-memory limit above.
 * 4. **Per guest** — the document ID is derived from the guest's email, so their reply always lands
 *    on the same document and a second one replaces the first rather than joining it. Its
 *    `_updatedAt` is the rate limit: a changed reply within `RSVP_REPEAT_WINDOW_MS` of the last is
 *    refused, and an identical one is answered as saved without a write. That holds across every
 *    function instance, because the store is the dataset itself.
 * 5. **Write** — guarded, so two requests racing past step 4 cannot both land: a new guest's reply
 *    is a `create`, which fails if the ID was taken meanwhile, and a returning guest's is a
 *    `createOrReplace` in one transaction with a patch pinned to the revision just read.
 *
 * Anyone who knows a guest's email can replace that guest's reply. The earlier version is still in
 * the document's history in the Studio; the invitation code (MAM-1917) is what keeps strangers out.

 */
const storeRsvp = async (formData: FormData): Promise<RsvpFormState> => {
  if (isHoneypotFilled(formData)) {
    return notSaved(MESSAGE.refused);
  }

  const parsed = parseRsvpSubmission(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors, status: 'error' };
  }

  const connection = await connectionOf();
  if (connection && !connectionLimiter.attempt(connection)) {
    return notSaved(MESSAGE.tooMany);
  }

  if (!writeClient) {
    console.error('RSVP not saved: SANITY_WRITE_TOKEN or the Sanity project settings are not configured.');
    return notSaved(MESSAGE.failed);
  }

  const { reply } = parsed;
  const id = rsvpDocumentId(reply.email);
  const now = new Date();

  try {
    const stored = await writeClient.getDocument<Partial<RsvpReply>>(id);

    if (stored && isRepeatTooSoon(stored._updatedAt, now.getTime())) {
      return isSameRsvpReply(stored, reply) ? SAVED : notSaved(MESSAGE.tooSoon);
    }

    // Whose reply this is, from the guest cookie. A sheet error must not stop a reply being saved.
    const guest = await currentGuest().catch(() => undefined);
    const document = toRsvpDocument(reply, now, guest?.id);

    await (stored
      ? writeClient
          .transaction()
          .patch(id, (patch) => patch.ifRevisionId(stored._rev).set({ submittedAt: document.submittedAt }))
          .createOrReplace(document)
          .commit()
      : writeClient.create(document));

    if (guest) {
      await markReplied(guest, now, { extraNight: reply.extraNight, staying: reply.staying });
      await sendThankYou(guest, reply, now);
    }
    return SAVED;
  } catch (error) {
    if (isConflict(error)) {
      // Another request for this guest was stored between the read and the write. If it holds this
      // very reply — a double submit — it is saved; if not, this one is too soon after it.
      const current = await writeClient.getDocument<Partial<RsvpReply>>(id).catch(() => undefined);
      return current && isSameRsvpReply(current, reply) ? SAVED : notSaved(MESSAGE.tooSoon);
    }

    console.error(`RSVP not saved: ${summarise(error)}`);
    return notSaved(MESSAGE.failed);
  }
};

/**
 * Where a guest lands once their reply is stored.
 */
const THANK_YOU_PATH = '/thank-you';

/**
 * The form's action: store the reply, then send the guest to the thank-you page.
 *
 * `_previousState` is unused: every call carries the guest's whole reply.
 *
 * The redirect is here rather than in `storeRsvp` because `redirect` works by throwing — inside that
 * function's `try` it would be caught and reported as a failed save. It fires for every saved reply,
 * including a double submit answered as saved without writing, and for a post made without JavaScript
 * as well: the browser follows it like any other response. Anything else — field errors, a refusal,
 * a failure — comes back as state, and the form shows it where the guest is.
 */
export const submitRsvp = async (_previousState: RsvpFormState, formData: FormData): Promise<RsvpFormState> => {
  const state = await storeRsvp(formData);

  if (state.status === 'success') {
    redirect(THANK_YOU_PATH);
  }

  return state;
};
