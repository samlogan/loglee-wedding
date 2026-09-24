import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Guest } from '@/helpers/guests';

vi.mock('./googleAuth', () => ({ default: vi.fn(async () => 'token'), hasGoogleCredentials: vi.fn(() => true) }));

const auth = await import('./googleAuth');

const HEADER = [
  'Guest ID',
  'First name',
  'Last name',
  'Email',
  'Nationality',
  'Stay option',
  'Nights',
  'Contribution per room per night ($)',
  'RSVP link',
  'RSVP status',
  'Invite sent'
];

/**
 * A stand-in for the Sheets API: answers reads from `values`, records writes. Every request is kept
 * as `{ method, path, body }`.
 */
const stubSheet = (values: string[][]) => {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const spy = vi.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace('https://sheets.googleapis.com/v4/spreadsheets/sheet-id/', '');
    calls.push({ body: init?.body ? JSON.parse(String(init.body)) : undefined, method: init?.method ?? 'GET', path });
    const body = path.startsWith('values/1:1')
      ? { values: [values[0]] }
      : path.startsWith('values/A:Z')
        ? { values }
        : {};
    return { json: async () => body, ok: true, status: 200, text: async () => '' } as unknown as Response;
  });
  vi.stubGlobal('fetch', spy);
  return calls;
};

/** The guest with this ID, failing the test outright when the sheet does not have them. */
const requireGuest = async (findGuest: (id: string) => Promise<Guest | undefined>, id: string) => {
  const found = await findGuest(id);
  if (!found) {
    throw new Error(`No guest ${id} in the stub sheet`);
  }
  return found;
};

/** A fresh copy of the module, so its one-minute memo starts empty. */
const load = async () => {
  vi.resetModules();
  return import('./sheet');
};

beforeEach(() => {
  vi.stubEnv('GUEST_SHEET_ID', 'sheet-id');
  vi.mocked(auth.hasGoogleCredentials).mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('guestLinkFor', () => {
  it('points at the live site, never at wherever the code runs', async () => {
    const { guestLinkFor } = await load();
    expect(guestLinkFor('SAM-4821')).toBe('https://samandlauren.wedding/g/SAM-4821/');
  });

  it('has a homepage version, which signs in the same way and lands on /', async () => {
    const { guestHomeLinkFor } = await load();
    expect(guestHomeLinkFor('SAM-4821')).toBe('https://samandlauren.wedding/g/SAM-4821/?to=/');
  });
});

describe('readGuests', () => {
  it('returns nobody, without calling Google, when the sheet is not configured', async () => {
    vi.mocked(auth.hasGoogleCredentials).mockReturnValue(false);
    const calls = stubSheet([HEADER]);
    const { readGuests } = await load();
    expect(await readGuests()).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('writes a new ID and personal link back for a row that has none', async () => {
    const calls = stubSheet([HEADER, ['SAM-1000', 'Sam'], ['', 'Lauren']]);
    const { readGuests } = await load();
    const guests = await readGuests();

    const lauren = guests.find((guest) => guest.firstName === 'Lauren');
    expect(lauren?.id).toMatch(/^LAUREN-\d{4}$/);
    const write = calls.find((call) => call.path === 'values:batchUpdate');
    expect(write?.body).toMatchObject({
      data: [
        { range: 'A3', values: [[lauren?.id]] },
        { range: 'I3', values: [[`https://samandlauren.wedding/g/${lauren?.id}/`]] }
      ],
      valueInputOption: 'RAW'
    });
  });

  it('writes nothing when every row has an ID', async () => {
    const calls = stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    const { readGuests } = await load();
    await readGuests();
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });

  it('keeps the result for a minute, but reads afresh when asked to', async () => {
    const calls = stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    const { readGuests } = await load();
    await readGuests();
    await readGuests();
    expect(calls.filter((call) => call.path.startsWith('values/A:Z'))).toHaveLength(1);
    await readGuests({ fresh: true });
    expect(calls.filter((call) => call.path.startsWith('values/A:Z'))).toHaveLength(2);
  });
});

describe('findGuest', () => {
  it('matches an ID however it was typed, and nothing for a blank or unknown one', async () => {
    stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    const { findGuest } = await load();
    expect((await findGuest(' sam 1000 '))?.firstName).toBe('Sam');
    expect(await findGuest('')).toBeUndefined();
    expect(await findGuest('NOBODY-0000')).toBeUndefined();
  });
});

describe('markReplied', () => {
  it('writes "Replied" and the date into the guest’s RSVP status cell', async () => {
    const calls = stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    const { findGuest, markReplied } = await load();
    await markReplied(await requireGuest(findGuest, 'SAM-1000'), new Date('2026-10-03T00:00:00Z'));

    const write = calls.findLast((call) => call.path === 'values:batchUpdate');
    expect(write?.body).toMatchObject({ data: [{ range: 'J2', values: [['Replied 3 Oct']] }] });
  });

  it('never throws — the reply is already saved, so a sheet error must not reach the guest', async () => {
    stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    const { findGuest, markReplied } = await load();
    const sam = await requireGuest(findGuest, 'SAM-1000');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(markReplied(sam, new Date())).resolves.toBeUndefined();
  });
});

describe('sentColumn and markSent', () => {
  it('finds an existing column', async () => {
    stubSheet([HEADER]);
    const { sentColumn } = await load();
    expect(await sentColumn('inviteSent')).toBe(10);
  });

  it('adds a missing column to the end of the header row', async () => {
    const calls = stubSheet([HEADER]);
    const { sentColumn } = await load();
    expect(await sentColumn('reminderSent')).toBe(11);
    expect(calls.findLast((call) => call.path === 'values:batchUpdate')?.body).toMatchObject({
      data: [{ range: 'L1', values: [['Reminder sent (filled by the site)']] }]
    });
  });

  it('writes the label and the date into the guest’s row', async () => {
    const calls = stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    const { findGuest, markSent } = await load();
    await markSent(await requireGuest(findGuest, 'SAM-1000'), 10, 'Invite sent', new Date('2026-10-01T00:00:00Z'));
    expect(calls.findLast((call) => call.path === 'values:batchUpdate')?.body).toMatchObject({
      data: [{ range: 'K2', values: [['Invite sent 1 Oct']] }]
    });
  });
});
