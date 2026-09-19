import 'server-only';
import { createHash } from 'node:crypto';

import { RSVP_FIELD, RSVP_KIDS_MAX } from '@/components/RsvpForm/contract';
import type { RsvpFieldErrors, RsvpFieldName } from '@/components/RsvpForm/contract';
import type { IRsvpDocument } from '@/tools/sanity/schema/documents/rsvp';

/**
 * The server side of the RSVP form: every check the action makes before it writes, as pure functions.
 *
 * The action in `app/(frontend)/rsvp/actions.ts` is a public endpoint. The form's own validation is a
 * convenience for the guest, not a gate — a post made without JavaScript, or by a script, arrives
 * here unchecked — so every entry is read, bounded and range-checked again, whatever the client did.
 * Kept apart from the action so the `unit` project can test it without a request or a dataset.
 *
 * `server-only` because it hashes with `node:crypto` and has no business in the client bundle; the
 * `unit` project aliases the marker to its empty module.
 */

/**
 * A reply that passed every check, shaped exactly as the `rsvp` document stores it — less the two
 * questions the form no longer asks, which only replies sent before the change carry.
 */
export type RsvpReply = Omit<
  IRsvpDocument,
  '_createdAt' | '_updatedAt' | 'submittedAt' | 'attending' | 'roomPreference'
>;

export type RsvpParseResult = { ok: true; reply: RsvpReply } | { ok: false; fieldErrors: RsvpFieldErrors };

/** The two reads the parser makes, so a test can hand it a plain `FormData`. */
export type RsvpFormEntries = Pick<FormData, 'get' | 'getAll'>;

/** The honeypot's name. `FieldBotCheck` renders it inside every `Form`, and no guest can see it. */
export const RSVP_HONEYPOT_FIELD = '_gotcha';

/**
 * The prefix on every reply's document ID.
 *
 * The dot is load-bearing: Sanity treats an ID containing a `.` as a *path*, and documents in a path
 * are readable only with a token. Drafts are hidden the same way. A reply holds a guest's email and
 * dietary needs, so it should not be readable by anyone who knows the (public) project ID.
 */
export const RSVP_ID_PREFIX = 'rsvp.';

/**
 * How soon the same guest can store another reply. A second *identical* reply inside it is answered
 * as saved without writing — it already is — and a *changed* one is refused until it passes.
 *
 * Ten seconds absorbs the double press the form allows (it queues a second call behind the first)
 * and caps one address at six writes a minute, while an honest guest correcting a typo is held up
 * for a few seconds at most and told so.
 */
export const RSVP_REPEAT_WINDOW_MS = 10_000;

/**
 * The longest answer each free-text field accepts.
 *
 * Generous — they bound the document, they are not a style guide. `email` is RFC 5321's limit, and is
 * also what keeps `EMAIL_PATTERN` cheap: it backtracks, so it only ever runs on a bounded string.
 */
export const RSVP_TEXT_MAX_LENGTH = {
  [RSVP_FIELD.dietary]: 1000,
  [RSVP_FIELD.email]: 254,
  [RSVP_FIELD.kidsAges]: 200,
  [RSVP_FIELD.name]: 200,
  [RSVP_FIELD.plusOneDietary]: 1000,
  [RSVP_FIELD.plusOneName]: 200,
  [RSVP_FIELD.songRequest]: 300
} as const;

type RsvpTextField = keyof typeof RSVP_TEXT_MAX_LENGTH;

// The form's own pattern, deliberately loose — `name@domain.tld` with no spaces. Whether the address
// is real is not something a pattern can know.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * One entry as trimmed text, or `''` when it is absent.
 *
 * Control characters become spaces: every control on the form is a single-line input, so a line
 * break or a NUL can only have been typed by a script. A `File` — possible in any multipart post —
 * reads as empty, so it is refused where an answer is required and dropped where it is not.
 */
const readText = (entries: RsvpFormEntries, name: RsvpFieldName): string => {
  const value = entries.get(name);
  return typeof value === 'string' ? value.replaceAll(/\p{Cc}/gu, ' ').trim() : '';
};

/**
 * The address a reply is filed under: trimmed, Unicode-normalised and lower-cased.
 *
 * Only that. Provider tricks — Gmail ignoring dots and `+tags` — are not undone, because they are not
 * true of every provider, and folding them everywhere would merge two different guests' replies.
 */
export const normaliseRsvpEmail = (email: string): string => email.normalize('NFC').trim().toLowerCase();

/**
 * The reply's document ID, derived from the guest's address — so the same guest always lands on the
 * same document, and `createOrReplace` makes a second reply replace the first.
 *
 * Hashed because an address is not a valid Sanity ID (`@` and `+` are outside `[a-zA-Z0-9._-]`) and
 * because an ID travels further than a field does — into Studio URLs, history and logs. A hash is not
 * a secret, though: anyone who knows an address can compute its ID.
 */
export const rsvpDocumentId = (email: string): string =>
  `${RSVP_ID_PREFIX}${createHash('sha256').update(normaliseRsvpEmail(email)).digest('hex')}`;

/**
 * Whether the honeypot was filled in. It is a checkbox, sent only when ticked; any non-blank value
 * counts, so a text-input honeypot would work here unchanged.
 */
export const isHoneypotFilled = (entries: Pick<FormData, 'get'>): boolean => {
  const value = entries.get(RSVP_HONEYPOT_FIELD);
  return value !== null && (typeof value !== 'string' || value.trim() !== '');
};

/**
 * Validates a submitted form and returns either the reply to store or a message per failing field,
 * keyed by the name the control submits under — see `contract.ts`.
 *
 * Entries the contract does not name are ignored, so a post cannot smuggle in a `submittedAt`, an
 * `_id` or anything else: the document is built from this reply alone.
 */
export const parseRsvpSubmission = (entries: RsvpFormEntries): RsvpParseResult => {
  const fieldErrors: RsvpFieldErrors = {};

  /** Reads a free-text field, flagging it when it is over its limit. */
  const text = (name: RsvpTextField): string => {
    const value = readText(entries, name);
    const max = RSVP_TEXT_MAX_LENGTH[name];
    if (value.length > max) {
      fieldErrors[name] = `Keep this to ${max} characters or fewer`;
    }
    return value;
  };

  /** A free-text answer that is required — flagged when blank. */
  const required = (name: RsvpTextField, message: string): string => {
    const value = text(name);
    if (!value) {
      fieldErrors[name] = message;
    }
    return value;
  };

  const name = required(RSVP_FIELD.name, 'Enter your name');

  const email = normaliseRsvpEmail(text(RSVP_FIELD.email));
  if (!fieldErrors[RSVP_FIELD.email] && !EMAIL_PATTERN.test(email)) {
    fieldErrors[RSVP_FIELD.email] = 'Enter an email address, like name@example.com';
  }

  // A native checkbox: present when ticked, absent when not. The plus one's own answers are read only
  // while it is ticked, so a post that sends them with the box unticked stores neither.
  const bringing = entries.get(RSVP_FIELD.plusOneBringing) !== null;
  const plusOne: RsvpReply['plusOne'] = bringing
    ? {
        bringing,
        dietary: text(RSVP_FIELD.plusOneDietary) || undefined,
        name: required(RSVP_FIELD.plusOneName, "Enter your plus one's name")
      }
    : { bringing };

  // Checked as text, as the form does: `Number` reads "" as 0 and "1e1" as 10, and neither is a count
  // the stepper could have produced. `\d` without the `u` flag is ASCII digits only.
  const kids = readText(entries, RSVP_FIELD.kidsCount);
  const kidsCount = /^\d+$/.test(kids) ? Number(kids) : Number.NaN;
  if (!(kidsCount <= RSVP_KIDS_MAX)) {
    fieldErrors[RSVP_FIELD.kidsCount] = `Enter a number from 0 to ${RSVP_KIDS_MAX}`;
  }

  const dietary = text(RSVP_FIELD.dietary) || undefined;
  const kidsAges = text(RSVP_FIELD.kidsAges) || undefined;
  const songRequest = text(RSVP_FIELD.songRequest) || undefined;

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, ok: false };
  }

  return {
    ok: true,
    reply: {
      dietary,
      email,
      kidsAges,
      kidsCount,
      name,
      plusOne,
      songRequest
    }
  };
};

/**
 * The document to write. `submittedAt` is the server's clock, never the client's — the parser drops
 * any entry of that name — so the Studio's timestamp is when the reply actually arrived.
 */
export const toRsvpDocument = (reply: RsvpReply, submittedAt: Date) => ({
  ...reply,
  _id: rsvpDocumentId(reply.email),
  _type: 'rsvp' as const,
  submittedAt: submittedAt.toISOString()
});

/**
 * Whether the guest's reply was stored less than `windowMs` ago.
 *
 * Reads the stored document's `_updatedAt`, which Sanity stamps, so the window holds across every
 * function instance: the store is the dataset itself. A timestamp from the future (clock skew) counts
 * as recent; one that cannot be parsed does not, since Sanity always sends a valid one.
 */
export const isRepeatTooSoon = (updatedAt: string | undefined, now: number, windowMs = RSVP_REPEAT_WINDOW_MS) => {
  const last = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  return Number.isFinite(last) && now - last < windowMs;
};

/** Every stored answer in a fixed order. `JSON.stringify` writes a missing one and an absent one alike. */
const replyKey = (reply: Partial<RsvpReply>) =>
  JSON.stringify([
    reply.name,
    reply.email,
    reply.dietary,
    reply.plusOne?.bringing ?? false,
    reply.plusOne?.name,
    reply.plusOne?.dietary,
    reply.kidsCount,
    reply.kidsAges,
    reply.songRequest
  ]);

/** Whether a stored document already holds exactly this reply. */
export const isSameRsvpReply = (stored: Partial<RsvpReply>, reply: RsvpReply): boolean =>
  replyKey(stored) === replyKey(reply);
