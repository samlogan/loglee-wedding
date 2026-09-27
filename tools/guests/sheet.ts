import 'server-only';
import { columnLetter, guestColumnsOf, guestsFromRows, normaliseGuestId } from '@/helpers/guests';
import type { Guest } from '@/helpers/guests';
import { siteColumnRequests } from '@/helpers/guestSheetLayout';
import { nextActivityCell } from '@/helpers/loopsWebhook';
import type { EmailActivityEvent, TrackedEmail } from '@/helpers/loopsWebhook';
import { replyCellsOf, replyColumnsIn } from '@/helpers/rsvpSheet';
import type { RsvpReply } from '@/tools/helpers/rsvpSubmission';

import googleAccessToken, { hasGoogleCredentials } from './googleAuth';

/**
 * The guest sheet, read and written by the service account.
 *
 * ## Why an in-memory cache, not Next's data cache
 *
 * Reading the sheet also fills in missing guest IDs (see `guestsFromRows`). Next's fetch cache would
 * hold the sheet as it was *before* those IDs were written, and the next read of that stale copy
 * would generate different IDs for the same rows and overwrite them. So the sheet itself is always
 * read fresh, and only the finished result — IDs included — is kept, for a minute, per server
 * instance. A guest added to the sheet can sign in within the minute.
 */
const TTL_MS = 60_000;

/** Where guests' personal links point. Fixed rather than read from the environment, so a sync run from
 * a laptop never writes `localhost` links into the sheet. */
const GUEST_LINK_ORIGIN = 'https://samandlauren.wedding';

export const guestLinkFor = (id: string) => `${GUEST_LINK_ORIGIN}/g/${encodeURIComponent(id)}/`;

/** The same personal link, landing on the homepage rather than the RSVP form. */
export const guestHomeLinkFor = (id: string) => `${guestLinkFor(id)}?to=/`;

let memo: { at: number; guests: Guest[] } | undefined;

// A `values/…` path hangs off the spreadsheet; `?fields=…` and `:batchUpdate` are the spreadsheet itself.
const sheetUrl = (path: string) =>
  `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GUEST_SHEET_ID}${/^[:?]/.test(path) ? '' : '/'}${path}`;

/**
 * Google allows 60 reads and 60 writes a minute. A bulk send meets that limit — every email sent and
 * every Loops event reaches the sheet — so a 429 is waited out and retried, twice, before it counts
 * as a failure. Kept short: the send runs inside a request with a time limit of its own.
 */
const RETRY_AFTER_MS = [3000, 6000];

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    const token = await googleAccessToken();
    const response = await fetch(sheetUrl(path), {
      ...init,
      cache: 'no-store',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init?.headers }
    });
    if (response.status === 429 && attempt < RETRY_AFTER_MS.length) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_AFTER_MS[attempt]));
      continue;
    }
    if (!response.ok) {
      throw new Error(`Guest sheet request failed: ${response.status} ${await response.text()}`);
    }
    return (await response.json()) as T;
  }
};

/** Kept for a few minutes: tab names and column positions change rarely, and each lookup is a read. */
const LAYOUT_TTL_MS = 5 * 60_000;
let firstTab: { at: number; title: string | undefined } | undefined;
const columnCache = new Map<string, { at: number; index: number }>();

/** The first tab's name — the guest list — without a read each time. */
const firstTabTitle = async () => {
  if (firstTab && Date.now() - firstTab.at < LAYOUT_TTL_MS) {
    return firstTab.title;
  }
  const { sheets = [] } = await request<{ sheets?: { properties: { title: string } }[] }>(
    '?fields=sheets.properties(title)'
  );
  firstTab = { at: Date.now(), title: sheets[0]?.properties.title };
  return firstTab.title;
};

/** Write several single cells in one call. */
const writeCells = async (cells: { range: string; value: string }[]) => {
  if (cells.length === 0) {
    return;
  }
  await request('values:batchUpdate', {
    body: JSON.stringify({
      data: cells.map(({ range, value }) => ({ range, values: [[value]] })),
      valueInputOption: 'RAW'
    }),
    method: 'POST'
  });
};

/**
 * Every guest in the sheet. Rows without an ID are given one, written back along with their personal
 * link, before this returns. `[]` when the sheet is not configured, so the rest of the site still
 * renders on a machine without the credentials.
 */
export const readGuests = async ({ fresh = false }: { fresh?: boolean } = {}): Promise<Guest[]> => {
  if (!hasGoogleCredentials()) {
    return [];
  }
  // `fresh` for anything that decides who gets an email: a minute-old copy could miss an Invite sent.
  if (!fresh && memo && Date.now() - memo.at < TTL_MS) {
    return memo.guests;
  }

  /*
   * The whole first tab, by name, rather than a fixed `A:Z`: the site's columns go on the end, and the
   * sheet is past Z already — a guest's email status beyond it would read as blank, and a late
   * "Delivered" could overwrite a "Clicked". A range of just the tab returns every cell it uses.
   */
  const tab = await firstTabTitle();
  const range = tab ? `'${tab.replaceAll("'", "''")}'` : 'A:ZZ';
  const { values = [] } = await request<{ values?: string[][] }>(`values/${encodeURIComponent(range)}`);
  const { guests, missingIds } = guestsFromRows(values);

  if (missingIds.length > 0) {
    const columns = guestColumnsOf(values[0] ?? []);
    const idColumn = columnLetter(columns.id);
    await writeCells(
      missingIds.flatMap(({ id, row }) => [
        { range: `${idColumn}${row}`, value: id },
        ...(columns.rsvpLink >= 0
          ? [{ range: `${columnLetter(columns.rsvpLink)}${row}`, value: guestLinkFor(id) }]
          : [])
      ])
    );
  }

  memo = { at: Date.now(), guests };
  return guests;
};

/** One guest by ID, however it was typed. */
export const findGuest = async (id?: string | null): Promise<Guest | undefined> => {
  const wanted = normaliseGuestId(id);
  if (!wanted) {
    return undefined;
  }
  return (await readGuests()).find((guest) => guest.id === wanted);
};

/**
 * Record a guest's reply in their row: "Replied 3 Oct" in RSVP status — noting a guest who is not
 * staying — and every answer from the form in its own "Reply:"
 * column (`REPLY_COLUMNS`), added at the end — greyed as the site's — the first time it is needed.
 * One write for all of the row's cells, so a row is never left half updated.
 *
 * A later reply from the same guest overwrites the earlier answers, as it replaces their reply in
 * Sanity. Best effort: the reply is already saved in Sanity, so a failure here is logged and never
 * reaches the guest.
 */
export const markReplied = async (guest: Guest, reply: RsvpReply, at: Date) => {
  try {
    const { values = [] } = await request<{ values?: string[][] }>('values/1:1');
    const header = values[0] ?? [];
    const status = guestColumnsOf(header).rsvpStatus;
    const { add, indexes } = replyColumnsIn(header);

    const day = at.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' });
    const note = reply.staying === false ? ' · Not staying' : '';

    const answers = replyCellsOf(reply);
    await addSiteColumns(add);
    await writeCells([
      ...(status >= 0 ? [{ range: `${columnLetter(status)}${guest.row}`, value: `Replied ${day}${note}` }] : []),
      ...indexes.map((index, position) => ({ range: `${columnLetter(index)}${guest.row}`, value: answers[position] }))
    ]);
  } catch (error) {
    console.error('[Guest sheet] Could not record the reply in the sheet.', error);
  }
};

/** The columns the email sender writes, and the header each gets if the sheet does not have it yet. */
const SENT_COLUMN_HEADERS = {
  inviteEmail: 'Invite email (filled by the site)',
  inviteSent: 'Invite sent (filled by the site)',
  reminderEmail: 'Reminder email (filled by the site)',
  reminderSent: 'Reminder sent (filled by the site)',
  thankYouEmail: 'Thank-you email (filled by the site)'
} as const;

/** The column each email's delivery and opens go in. */
const ACTIVITY_COLUMN = {
  invitation: 'inviteEmail',
  reminder: 'reminderEmail',
  thankYou: 'thankYouEmail'
} as const;

/**
 * Add columns for the site to fill at the end of the sheet: widen it when it is too narrow, grey the
 * new columns as the site's (`siteColumnRequests`) and write their headers. The couple's columns come
 * first and are never touched.
 */
const addSiteColumns = async (columns: { index: number; header: string }[]) => {
  if (columns.length === 0) {
    return;
  }
  const { sheets = [] } = await request<{
    sheets?: { properties: { sheetId: number; gridProperties?: { columnCount?: number } } }[];
  }>('?fields=sheets.properties(sheetId,gridProperties.columnCount)');
  const properties = sheets[0]?.properties;
  if (properties) {
    const width = properties.gridProperties?.columnCount ?? 0;
    const needed = Math.max(...columns.map((column) => column.index)) + 1;
    await request(':batchUpdate', {
      body: JSON.stringify({
        requests: [
          ...(needed > width
            ? [{ appendDimension: { dimension: 'COLUMNS', length: needed - width, sheetId: properties.sheetId } }]
            : []),
          ...columns.flatMap((column) => siteColumnRequests(properties.sheetId, column.index))
        ]
      }),
      method: 'POST'
    });
  }
  await writeCells(columns.map((column) => ({ range: `${columnLetter(column.index)}1`, value: column.header })));
};

/**
 * The 0-based index of the column recording an email of this kind, adding the column to the end of
 * the header row first if the sheet does not have it. Resolved once per batch.
 */
export const sentColumn = async (column: keyof typeof SENT_COLUMN_HEADERS): Promise<number> => {
  const cached = columnCache.get(column);
  if (cached && Date.now() - cached.at < LAYOUT_TTL_MS) {
    return cached.index;
  }
  const { values = [] } = await request<{ values?: string[][] }>('values/1:1');
  const header = values[0] ?? [];
  let index = guestColumnsOf(header)[column];
  if (index < 0) {
    index = header.length;
    await addSiteColumns([{ header: SENT_COLUMN_HEADERS[column], index }]);
  }
  columnCache.set(column, { at: Date.now(), index });
  return index;
};

/**
 * Record in a guest's row that an email went — "Invite sent 24 Sept". Called straight after each
 * email, one guest at a time, so a send interrupted partway leaves the sheet exact: whoever is marked
 * got it, and an invitation is never sent to them again.
 */
export const markSent = async (
  guest: Guest,
  columnIndex: number,
  label: string,
  at: Date,
  /**
   * The email's status column and what it says now (from the batch's own read), to mark it "Sent" in
   * the same write — no read of its own, where a read per guest is what ran out the minute's quota.
   */
  status?: { column: number; current: string }
) => {
  const day = at.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' });
  const sent = status && nextActivityCell(status.current, 'sent', at);
  await writeCells([
    { range: `${columnLetter(columnIndex)}${guest.row}`, value: `${label} ${day}` },
    ...(status && sent ? [{ range: `${columnLetter(status.column)}${guest.row}`, value: sent }] : [])
  ]);
  memo = undefined;
};

/** The status column each email's delivery and opens go in, for `markSent`'s `status`. */
export const statusColumnFor = (kind: TrackedEmail) => sentColumn(ACTIVITY_COLUMN[kind]);
export const statusFieldFor = (kind: TrackedEmail) => ACTIVITY_COLUMN[kind];

/**
 * Record in the guest's row what happened to one of their emails — delivered, opened, clicked,
 * bounced, marked as spam — reported by Loops's webhook (`app/api/loops/webhook`), in that email's
 * column. Every row with that email address is marked, since a couple can share one. The cell only
 * moves forward (`nextActivityCell`); an address with no row — a test send — changes nothing.
 */
export const markEmailActivity = async ({ activity, email, kind }: EmailActivityEvent, at: Date) => {
  const guests = (await readGuests({ fresh: true })).filter((guest) => guest.email.trim().toLowerCase() === email);
  if (guests.length === 0) {
    return;
  }
  const field = ACTIVITY_COLUMN[kind];
  const cells = guests.flatMap((guest) => {
    const value = nextActivityCell(guest[field] ?? '', activity, at);
    return value ? [{ guest, value }] : [];
  });
  if (cells.length === 0) {
    return;
  }
  const column = await sentColumn(field);
  await writeCells(cells.map(({ guest, value }) => ({ range: `${columnLetter(column)}${guest.row}`, value })));
};

/**
 * Mark one of a guest's emails "Sent 27 Sept" in its status column (Invite email, Reminder email,
 * Thank-you email), the moment Loops has accepted it — so a sent email shows before any webhook
 * reports it delivered or opened. The cell is read just before the write, and left alone if a
 * webhook has already moved it on (`nextActivityCell`): the two can race.
 */
export const markEmailStatusSent = async (guest: Guest, kind: TrackedEmail, at: Date) => {
  const column = await sentColumn(ACTIVITY_COLUMN[kind]);
  const range = `${columnLetter(column)}${guest.row}`;
  const { values = [] } = await request<{ values?: string[][] }>(`values/${range}`);
  const value = nextActivityCell(values[0]?.[0] ?? '', 'sent', at);
  if (value) {
    await writeCells([{ range, value }]);
  }
};
