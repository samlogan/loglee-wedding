import 'server-only';
import { columnLetter, guestColumnsOf, guestsFromRows, normaliseGuestId } from '@/helpers/guests';
import type { Guest } from '@/helpers/guests';

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

let memo: { at: number; guests: Guest[] } | undefined;

const sheetUrl = (path: string) =>
  `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GUEST_SHEET_ID}/${path}`;

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
export const readGuests = async (): Promise<Guest[]> => {
  if (!hasGoogleCredentials()) {
    return [];
  }
  if (memo && Date.now() - memo.at < TTL_MS) {
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
 * Mark a guest's row as replied, with the date. Best effort: the reply is already saved in Sanity,
 * so a failure here is logged and never reaches the guest.
 */
export const markReplied = async (guest: Guest, at: Date) => {
  try {
    const { values = [] } = await request<{ values?: string[][] }>('values/1:1');
    const column = guestColumnsOf(values[0] ?? []).rsvpStatus;
    if (column < 0) {
      return;
    }
    const day = at.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' });
    await writeCells([{ range: `${columnLetter(column)}${guest.row}`, value: `Replied ${day}` }]);
  } catch (error) {
    console.error('[Guest sheet] Could not mark the reply in the sheet.', error);
  }
};
