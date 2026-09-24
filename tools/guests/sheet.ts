import 'server-only';
import { columnLetter, guestColumnsOf, guestsFromRows, normaliseGuestId } from '@/helpers/guests';
import type { Guest } from '@/helpers/guests';
import { siteColumnRequests } from '@/helpers/guestSheetLayout';
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

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = await googleAccessToken();
  const response = await fetch(sheetUrl(path), {
    ...init,
    cache: 'no-store',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init?.headers }
  });
  if (!response.ok) {
    throw new Error(`Guest sheet request failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
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

  const { values = [] } = await request<{ values?: string[][] }>('values/A:Z');
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
 * staying, or who takes the Sunday night — and every answer from the form in its own "Reply:"
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
    let note = '';
    if (reply.staying === false) {
      note = ' · Not staying';
    } else if (reply.extraNight) {
      note = ' · + Sunday night';
    }

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
  inviteSent: 'Invite sent (filled by the site)',
  reminderSent: 'Reminder sent (filled by the site)'
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
  const { values = [] } = await request<{ values?: string[][] }>('values/1:1');
  const header = values[0] ?? [];
  const index = guestColumnsOf(header)[column];
  if (index >= 0) {
    return index;
  }
  await addSiteColumns([{ header: SENT_COLUMN_HEADERS[column], index: header.length }]);
  return header.length;
};

/**
 * Record in a guest's row that an email went — "Invite sent 24 Sept". Called straight after each
 * email, one guest at a time, so a send interrupted partway leaves the sheet exact: whoever is marked
 * got it, and an invitation is never sent to them again.
 */
export const markSent = async (guest: Guest, columnIndex: number, label: string, at: Date) => {
  const day = at.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' });
  await writeCells([{ range: `${columnLetter(columnIndex)}${guest.row}`, value: `${label} ${day}` }]);
  memo = undefined;
};
