import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Guest } from '@/helpers/guests';

vi.mock('./googleAuth', () => ({ default: vi.fn(async () => 'token'), hasGoogleCredentials: vi.fn(() => true) }));
// A 429 is waited out before a retry; the tests do not wait.
vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn(async () => undefined) }));

const auth = await import('./googleAuth');
const timers = await import('node:timers/promises');

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
const stubSheet = (values: string[][], columnCount = 26) => {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const spy = vi.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace(/^https:\/\/sheets\.googleapis\.com\/v4\/spreadsheets\/sheet-id\/?/, '');
    calls.push({ body: init?.body ? JSON.parse(String(init.body)) : undefined, method: init?.method ?? 'GET', path });
    const body = path.startsWith('?fields=')
      ? { sheets: [{ properties: { gridProperties: { columnCount }, sheetId: 0, title: 'Room RSVPs' } }] }
      : path.startsWith('values/1:1')
        ? { values: [values[0]] }
        : path.startsWith("values/'Room%20RSVPs'")
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

describe('rate limits', () => {
  it('waits out a 429 and retries, rather than failing the send', async () => {
    const calls = stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    const spy = vi.mocked(fetch);
    const answer = spy.getMockImplementation() as NonNullable<ReturnType<typeof spy.getMockImplementation>>;
    let refused = false;
    spy.mockImplementation(async (url, init) => {
      if (!refused && String(url).includes('values/')) {
        refused = true;
        return { ok: false, status: 429, text: async () => 'quota' } as Response;
      }
      return answer(url, init);
    });
    const { readGuests } = await load();
    expect((await readGuests()).map((guest) => guest.id)).toEqual(['SAM-1000']);
    expect(timers.setTimeout).toHaveBeenCalledWith(3000);
    expect(calls.filter((call) => call.path.startsWith("values/'Room%20RSVPs'"))).toHaveLength(1);
  });
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

  it('reads the whole tab, so a column past Z — where the site adds its own — is seen', async () => {
    const wide = [
      ...HEADER,
      ...Array.from({ length: 20 }, (_, index) => `Other ${index}`),
      'Thank-you email (filled by the site)'
    ];
    const row = ['SAM-1000', 'Sam', ...Array.from({ length: wide.length - 3 }, () => ''), 'Delivered 1 Oct'];
    stubSheet([wide, row]);
    const { readGuests } = await load();
    const [sam] = await readGuests();
    // HEADER's 11 columns and 20 more put this one at AF, the 32nd.
    expect(wide.length).toBe(32);
    expect(sam.thankYouEmail).toBe('Delivered 1 Oct');
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
    expect(calls.filter((call) => call.path.startsWith("values/'Room%20RSVPs'"))).toHaveLength(1);
    await readGuests({ fresh: true });
    expect(calls.filter((call) => call.path.startsWith("values/'Room%20RSVPs'"))).toHaveLength(2);
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
  const REPLY = { email: 'sam@example.com', kidsCount: 0, name: 'Sam Logan', plusOne: { bringing: false } };
  const AT = new Date('2026-10-03T00:00:00Z');

  /** Every cell written, as `{ A1: value }` — later writes win. */
  const written = (calls: { path: string; body?: unknown }[]) =>
    Object.fromEntries(
      calls
        .filter((call) => call.path === 'values:batchUpdate')
        .flatMap((call) => (call.body as { data: { range: string; values: string[][] }[] }).data)
        .map(({ range, values }) => [range, values[0][0]])
    );

  /** The formatting requests sent to the spreadsheet, flattened. */
  const formatting = (calls: { path: string; body?: unknown }[]) =>
    calls
      .filter((call) => call.path === ':batchUpdate')
      .flatMap(
        (call) => (call.body as { requests: Record<string, { range?: { startColumnIndex: number } }>[] }).requests
      );

  it('writes "Replied" and the date into the guest’s RSVP status cell', async () => {
    const calls = stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    const { findGuest, markReplied } = await load();
    await markReplied(await requireGuest(findGuest, 'SAM-1000'), REPLY, AT);
    expect(written(calls).J2).toBe('Replied 3 Oct');
  });

  it('adds a column per answer after the last header, and fills in the guest’s answers', async () => {
    const calls = stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    const { findGuest, markReplied } = await load();
    await markReplied(
      await requireGuest(findGuest, 'SAM-1000'),
      { ...REPLY, dietary: 'Vegetarian', songRequest: 'September' },
      AT
    );

    const cells = written(calls);
    // HEADER runs A–K, so the reply columns start at L — Coming first, then Name, Email, Dietary.
    expect(cells).toMatchObject({
      L1: 'Reply: Coming',
      L2: 'Yes',
      M1: 'Reply: Name',
      M2: 'Sam Logan',
      N1: 'Reply: Email',
      N2: 'sam@example.com'
    });
    expect(cells.O2).toBe('Vegetarian');
    expect(Object.values(cells)).toContain('September');
    // Every new column is greyed as the site's, starting at L; the sheet is wide enough already.
    const painted = formatting(calls);
    expect(painted.some((request) => request.repeatCell?.range?.startColumnIndex === 11)).toBe(true);
    expect(painted.some((request) => 'appendDimension' in request)).toBe(false);
    // The guest's own cells go in one write.
    expect(calls.findLast((call) => call.path === 'values:batchUpdate')?.body).toMatchObject({
      data: expect.arrayContaining([{ range: 'M2', values: [['Sam Logan']] }])
    });
  });

  it('widens a sheet too narrow for the new columns', async () => {
    const calls = stubSheet([HEADER, ['SAM-1000', 'Sam']], 12);
    const { findGuest, markReplied } = await load();
    await markReplied(await requireGuest(findGuest, 'SAM-1000'), REPLY, AT);

    // HEADER's 11 columns and 13 reply columns need 24; the sheet has 12.
    expect(formatting(calls)).toContainEqual({ appendDimension: { dimension: 'COLUMNS', length: 12, sheetId: 0 } });
  });

  it('writes into the reply columns the sheet already has, without adding them again', async () => {
    const calls = stubSheet([
      [...HEADER, 'Reply: Email', 'Reply: Name'],
      ['SAM-1000', 'Sam']
    ]);
    const { findGuest, markReplied } = await load();
    await markReplied(await requireGuest(findGuest, 'SAM-1000'), REPLY, AT);

    const cells = written(calls);
    expect(cells).toMatchObject({ L2: 'sam@example.com', M2: 'Sam Logan' });
    expect(cells).not.toHaveProperty('L1');
    expect(cells).not.toHaveProperty('M1');
  });

  it('marks a guest who can’t make it "Declined", which the Declined tab filters on', async () => {
    const calls = stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    const { findGuest, markReplied } = await load();
    await markReplied(
      await requireGuest(findGuest, 'SAM-1000'),
      { ...REPLY, coming: false, message: 'Sorry!', staying: false },
      AT
    );
    expect(written(calls).J2).toBe('Declined 3 Oct');
  });

  it('notes a guest who is not staying', async () => {
    const calls = stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    const { findGuest, markReplied } = await load();
    await markReplied(await requireGuest(findGuest, 'SAM-1000'), { ...REPLY, staying: false }, AT);
    expect(written(calls).J2).toBe('Replied 3 Oct · Not staying');
  });

  it('never throws — the reply is already saved, so a sheet error must not reach the guest', async () => {
    stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    const { findGuest, markReplied } = await load();
    const sam = await requireGuest(findGuest, 'SAM-1000');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(markReplied(sam, REPLY, new Date())).resolves.toBeUndefined();
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
    // Greyed as the site's column, header and cells.
    const body = calls.find((call) => call.path === ':batchUpdate')?.body as { requests?: unknown[] } | undefined;
    expect(body?.requests).toEqual([
      expect.objectContaining({ repeatCell: expect.anything() }),
      expect.objectContaining({ repeatCell: expect.anything() })
    ]);
  });

  it('marks the email "Sent" in its status column in the same write, unless it has moved on', async () => {
    let calls = stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    let { findGuest, markSent } = await load();
    const sam = await requireGuest(findGuest, 'SAM-1000');
    await markSent(sam, 10, 'Invite sent', new Date('2026-10-01T00:00:00Z'), { column: 20, current: '' });
    expect(calls.findLast((call) => call.path === 'values:batchUpdate')?.body).toMatchObject({
      data: [
        { range: 'K2', values: [['Invite sent 1 Oct']] },
        { range: 'U2', values: [['Sent 1 Oct']] }
      ]
    });

    calls = stubSheet([HEADER, ['SAM-1000', 'Sam']]);
    ({ findGuest, markSent } = await load());
    await markSent(await requireGuest(findGuest, 'SAM-1000'), 10, 'Invite sent', new Date('2026-10-01T00:00:00Z'), {
      column: 20,
      current: 'Opened 1 Oct'
    });
    expect(calls.findLast((call) => call.path === 'values:batchUpdate')?.body).toMatchObject({
      data: [{ range: 'K2', values: [['Invite sent 1 Oct']] }]
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

describe('markEmailActivity', () => {
  const AT = new Date('2026-10-03T00:00:00Z');
  const OPENED = { activity: 'opened' as const, email: 'sam@example.com', kind: 'invitation' as const };
  const row = (id: string, first: string, email: string, ...rest: string[]) => [id, first, '', email, ...rest];

  /** The values written into guest rows, by A1 range. */
  const rowWrites = (calls: ReturnType<typeof stubSheet>) =>
    calls
      .filter((call) => call.path === 'values:batchUpdate')
      .flatMap((call) => (call.body as { data: { range: string; values: string[][] }[] }).data)
      .filter(({ range }) => !range.endsWith('1'))
      .map(({ range, values }) => [range, values[0][0]]);

  it('adds an Invite email column, greyed, and writes the first open into every row with that email', async () => {
    const calls = stubSheet([
      HEADER,
      row('SAM-1000', 'Sam', 'Sam@Example.com'),
      row('ALEX-1001', 'Alex', 'sam@example.com'),
      row('JO-1002', 'Jo', 'jo@example.com')
    ]);
    const { markEmailActivity } = await load();
    await markEmailActivity(OPENED, AT);

    // HEADER runs A–K, so the new column is L.
    expect(calls.some((call) => call.path === ':batchUpdate')).toBe(true);
    expect(rowWrites(calls)).toEqual([
      ['L2', 'Opened 3 Oct'],
      ['L3', 'Opened 3 Oct']
    ]);
  });

  it('upgrades an open to a click, and leaves a click alone when it is opened again', async () => {
    const header = [...HEADER, 'Invite email (filled by the site)'];
    const blanks = Array.from({ length: 7 }, () => '');
    let calls = stubSheet([header, row('SAM-1000', 'Sam', 'sam@example.com', ...blanks, 'Opened 1 Oct')]);
    let { markEmailActivity } = await load();
    await markEmailActivity({ ...OPENED, activity: 'clicked' }, AT);
    expect(rowWrites(calls)).toEqual([['L2', 'Clicked 3 Oct']]);

    calls = stubSheet([header, row('SAM-1000', 'Sam', 'sam@example.com', ...blanks, 'Clicked 1 Oct')]);
    ({ markEmailActivity } = await load());
    await markEmailActivity(OPENED, AT);
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });

  it('writes the reminder into its own column', async () => {
    const calls = stubSheet([HEADER, row('SAM-1000', 'Sam', 'sam@example.com')]);
    const { markEmailActivity } = await load();
    await markEmailActivity({ ...OPENED, kind: 'reminder' }, AT);
    expect(
      calls
        .filter((call) => call.path === 'values:batchUpdate')
        .flatMap((call) => (call.body as { data: { range: string; values: string[][] }[] }).data)
    ).toContainEqual({ range: 'L1', values: [['Reminder email (filled by the site)']] });
  });

  it('writes the thank-you into its own column', async () => {
    const calls = stubSheet([HEADER, row('SAM-1000', 'Sam', 'sam@example.com')]);
    const { markEmailActivity } = await load();
    await markEmailActivity({ ...OPENED, activity: 'delivered', kind: 'thankYou' }, AT);
    const writes = calls
      .filter((call) => call.path === 'values:batchUpdate')
      .flatMap((call) => (call.body as { data: { range: string; values: string[][] }[] }).data);
    expect(writes).toContainEqual({ range: 'L1', values: [['Thank-you email (filled by the site)']] });
    expect(writes).toContainEqual({ range: 'L2', values: [['Delivered 3 Oct']] });
  });

  it('changes nothing for an address with no row — a test send', async () => {
    const calls = stubSheet([HEADER, row('SAM-1000', 'Sam', 'sam@example.com')]);
    const { markEmailActivity } = await load();
    await markEmailActivity({ ...OPENED, email: 'me@example.com' }, AT);
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });
});

describe('markEmailStatusSent', () => {
  const AT = new Date('2026-10-03T00:00:00Z');
  const SAM = { row: 2 } as Guest;

  /** A sheet whose header has the Invite email column at L, and whose L2 reads `cell`. */
  const stubWithCell = (cell: string) => {
    const calls = stubSheet([
      [...HEADER, 'Invite email (filled by the site)'],
      ['SAM-1000', 'Sam']
    ]);
    const spy = vi.mocked(fetch);
    const answer = spy.getMockImplementation();
    spy.mockImplementation(async (url, init) => {
      if (String(url).endsWith('values/L2')) {
        calls.push({ method: 'GET', path: 'values/L2' });
        return { json: async () => ({ values: cell ? [[cell]] : [] }), ok: true, status: 200 } as Response;
      }
      return (answer as NonNullable<typeof answer>)(url, init);
    });
    return calls;
  };

  it('writes "Sent" into a blank status cell', async () => {
    const calls = stubWithCell('');
    const { markEmailStatusSent } = await load();
    await markEmailStatusSent(SAM, 'invitation', AT);
    expect(calls.findLast((call) => call.path === 'values:batchUpdate')?.body).toMatchObject({
      data: [{ range: 'L2', values: [['Sent 3 Oct']] }]
    });
  });

  it('leaves a cell a webhook has already moved on', async () => {
    const calls = stubWithCell('Delivered 3 Oct');
    const { markEmailStatusSent } = await load();
    await markEmailStatusSent(SAM, 'invitation', AT);
    expect(calls.some((call) => call.path === 'values:batchUpdate')).toBe(false);
  });
});
