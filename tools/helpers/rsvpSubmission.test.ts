import { describe, expect, it } from 'vitest';

import { RSVP_FIELD, RSVP_KIDS_MAX, RSVP_ROOM_PREFERENCES } from '@/components/RsvpForm/contract';

import {
  RSVP_REPEAT_WINDOW_MS,
  RSVP_TEXT_MAX_LENGTH,
  isHoneypotFilled,
  isRepeatTooSoon,
  isSameRsvpReply,
  normaliseRsvpEmail,
  parseRsvpSubmission,
  rsvpDocumentId,
  toRsvpDocument
} from './rsvpSubmission';
import type { RsvpReply } from './rsvpSubmission';

type Entries = Record<string, string | string[] | File | undefined>;

/** A `FormData` as the form would build it. An array is a repeated name; `undefined` leaves it out. */
const form = (entries: Entries) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(entries)) {
    for (const item of value === undefined ? [] : [value].flat()) {
      data.append(name, item);
    }
  }
  return data;
};

// The least a valid reply can be: what the form sends before anything optional is touched.
const MINIMAL: Entries = { email: 'sam@example.com', kidsCount: '0', name: 'Sam Logan' };

const parse = (entries: Entries) => parseRsvpSubmission(form({ ...MINIMAL, ...entries }));

const errorsOf = (entries: Entries) => {
  const result = parse(entries);
  return result.ok ? {} : result.fieldErrors;
};

const replyOf = (entries: Entries): RsvpReply => {
  const result = parse(entries);
  if (!result.ok) {
    throw new Error(`Expected a valid reply, got ${JSON.stringify(result.fieldErrors)}`);
  }
  return result.reply;
};

const file = () => new File(['x'], 'x.txt', { type: 'text/plain' });

/** A value of exactly `length` characters that is otherwise valid for `field`. */
const sample = (field: string, length: number) =>
  field === RSVP_FIELD.email ? `${'a'.repeat(length - '@example.com'.length)}@example.com` : 'a'.repeat(length);

describe('parseRsvpSubmission', () => {
  it('stores a full reply field for field, in the shape of the rsvp document', () => {
    expect(
      replyOf({
        attending: ['friday', 'saturday', 'sunday'],
        dietary: 'Vegetarian',
        email: 'sam@example.com',
        kidsAges: '2 and 5',
        kidsCount: '2',
        name: 'Sam Logan',
        'plusOne.bringing': 'on',
        'plusOne.dietary': 'No shellfish',
        'plusOne.name': 'Alex Lee',
        roomPreference: 'Family Room',
        songRequest: 'September'
      })
    ).toEqual({
      attending: ['friday', 'saturday', 'sunday'],
      dietary: 'Vegetarian',
      email: 'sam@example.com',
      kidsAges: '2 and 5',
      kidsCount: 2,
      name: 'Sam Logan',
      plusOne: { bringing: true, dietary: 'No shellfish', name: 'Alex Lee' },
      roomPreference: 'Family Room',
      songRequest: 'September'
    });
  });

  it('accepts the smallest reply: a name, an address and the default kids count', () => {
    const reply = replyOf({});
    expect(reply).toEqual({
      attending: [],
      email: 'sam@example.com',
      kidsCount: 0,
      name: 'Sam Logan',
      plusOne: { bringing: false }
    });
    // Blank optional answers are left off the document rather than stored as empty strings.
    expect(Object.values(reply)).not.toContain('');
  });

  it('trims every answer and leaves a blank optional one off', () => {
    const reply = replyOf({ dietary: '   ', name: '  Sam Logan  ', songRequest: ' September ' });
    expect(reply.name).toBe('Sam Logan');
    expect(reply.songRequest).toBe('September');
    expect(reply.dietary).toBeUndefined();
  });

  it('turns control characters into spaces — no control on the form can type one', () => {
    expect(replyOf({ name: 'Sam\u0000Logan', songRequest: 'Sep\ntember\t' }).name).toBe('Sam Logan');
    expect(replyOf({ songRequest: 'Sep\ntember\t' }).songRequest).toBe('Sep tember');
  });

  it('reads a file as a blank answer: refused where required, dropped where optional', () => {
    expect(errorsOf({ name: file() })).toEqual({ name: 'Enter your name' });
    expect(replyOf({ dietary: file() }).dietary).toBeUndefined();
  });

  it('ignores entries the contract does not name, so a post cannot set submittedAt or the ID', () => {
    const reply = replyOf({ _id: 'rsvp.someone-else', _type: 'page', submittedAt: '1999-01-01T00:00:00.000Z' });
    expect(reply).not.toHaveProperty('submittedAt');
    expect(reply).not.toHaveProperty('_id');
    expect(reply).not.toHaveProperty('_type');
  });

  it('reports every failing field at once, under the names the controls submit', () => {
    expect(
      errorsOf({ email: 'sam', kidsCount: '-1', name: '', 'plusOne.bringing': 'on', roomPreference: 'Penthouse' })
    ).toEqual({
      email: 'Enter an email address, like name@example.com',
      kidsCount: `Enter a number from 0 to ${RSVP_KIDS_MAX}`,
      name: 'Enter your name',
      'plusOne.name': "Enter your plus one's name",
      roomPreference: 'Choose one of the rooms listed'
    });
  });

  describe('name', () => {
    it.each([undefined, '', '   '])('requires one (%j)', (name) => {
      expect(errorsOf({ name })).toEqual({ name: 'Enter your name' });
    });
  });

  describe('email', () => {
    it.each([undefined, '', 'sam', 'sam@', '@example.com', 'sam@example', 'sa m@example.com', 'sam@@example.com'])(
      'refuses %j',
      (email) => {
        expect(errorsOf({ email })).toEqual({ email: 'Enter an email address, like name@example.com' });
      }
    );

    it('is stored normalised — the address the reply is filed under', () => {
      expect(replyOf({ email: '  Sam.Logan@Example.COM ' }).email).toBe('sam.logan@example.com');
    });

    it('checks the length before the pattern, so a huge value is refused without backtracking', () => {
      // The pattern backtracks; a megabyte of dotted domain would make it crawl. The limit comes first.
      const huge = `a@${'a.'.repeat(500_000)} `;
      expect(errorsOf({ email: huge })).toEqual({ email: 'Keep this to 254 characters or fewer' });
    });
  });

  describe('attending', () => {
    it('takes no days as an answer — a guest declining', () => {
      expect(replyOf({ attending: undefined }).attending).toEqual([]);
    });

    it('stores each day once, in weekend order, whatever order they came in', () => {
      expect(replyOf({ attending: ['sunday', 'friday', 'sunday'] }).attending).toEqual(['friday', 'sunday']);
    });

    it.each(['monday', 'Friday', ''])('refuses a value that is not one of the days (%j)', (day) => {
      expect(errorsOf({ attending: ['saturday', day] })).toEqual({ attending: 'Choose from the days listed' });
    });
  });

  describe('plus one', () => {
    it('stores only `bringing: false` when unticked, even if their answers were sent', () => {
      expect(replyOf({ 'plusOne.dietary': 'Vegan', 'plusOne.name': 'x'.repeat(5000) }).plusOne).toEqual({
        bringing: false
      });
    });

    it('requires their name once ticked, and keeps their dietary answer optional', () => {
      expect(errorsOf({ 'plusOne.bringing': 'on' })).toEqual({ 'plusOne.name': "Enter your plus one's name" });
      expect(replyOf({ 'plusOne.bringing': 'on', 'plusOne.name': ' Alex Lee ' }).plusOne).toEqual({
        bringing: true,
        name: 'Alex Lee'
      });
    });
  });

  describe('room preference', () => {
    it('is left off when none was picked', () => {
      expect(replyOf({}).roomPreference).toBeUndefined();
    });

    it.each(RSVP_ROOM_PREFERENCES)('accepts %s', (room) => {
      expect(replyOf({ roomPreference: room }).roomPreference).toBe(room);
    });

    it.each(['Penthouse', 'king room'])('refuses a room that is not offered (%j)', (room) => {
      expect(errorsOf({ roomPreference: room })).toEqual({ roomPreference: 'Choose one of the rooms listed' });
    });
  });

  describe('kids count', () => {
    it(`accepts every whole number from 0 to ${RSVP_KIDS_MAX}`, () => {
      for (let count = 0; count <= RSVP_KIDS_MAX; count += 1) {
        expect(replyOf({ kidsCount: String(count) }).kidsCount).toBe(count);
      }
      expect(replyOf({ kidsCount: '07' }).kidsCount).toBe(7);
    });

    // The values contract.ts warns about — Enter submits before the stepper clamps, and a post without
    // JavaScript is never checked — plus the ones `Number` would read as a count.
    it.each([undefined, '', ' ', '-3', '2.5', '11', '1e1', '0x3', '+3', 'three', '\u0663', '99999999999999999999'])(
      'refuses %j',
      (kidsCount) => {
        expect(errorsOf({ kidsCount })).toEqual({ kidsCount: `Enter a number from 0 to ${RSVP_KIDS_MAX}` });
      }
    );
  });

  describe('length limits', () => {
    // The plus one's fields are only read while the box is ticked, and then their name is required.
    const context = (field: string): Entries =>
      field.startsWith('plusOne.') ? { 'plusOne.bringing': 'on', 'plusOne.name': 'Alex Lee' } : {};

    it.each(Object.entries(RSVP_TEXT_MAX_LENGTH))('holds %s to %i characters', (field, max) => {
      expect(errorsOf({ ...context(field), [field]: sample(field, max) })).toEqual({});
      expect(errorsOf({ ...context(field), [field]: sample(field, max + 1) })).toEqual({
        [field]: `Keep this to ${max} characters or fewer`
      });
    });
  });
});

describe('isHoneypotFilled', () => {
  it('is false when the box was not ticked — the entry is absent', () => {
    expect(isHoneypotFilled(form(MINIMAL))).toBe(false);
  });

  it.each(['on', 'yes', 'http://spam.example'])('is true for any value (%j)', (value) => {
    expect(isHoneypotFilled(form({ ...MINIMAL, _gotcha: value }))).toBe(true);
  });

  it('is true for a file, and false for a blank value', () => {
    expect(isHoneypotFilled(form({ _gotcha: file() }))).toBe(true);
    expect(isHoneypotFilled(form({ _gotcha: '' }))).toBe(false);
    expect(isHoneypotFilled(form({ _gotcha: '  ' }))).toBe(false);
  });
});

describe('normaliseRsvpEmail', () => {
  it('trims and lower-cases', () => {
    expect(normaliseRsvpEmail('  Sam@Example.COM\t')).toBe('sam@example.com');
  });

  it('folds the two Unicode spellings of an accented letter together', () => {
    expect(normaliseRsvpEmail('Ame\u0301lie@example.com')).toBe(normaliseRsvpEmail('Am\u00E9lie@example.com'));
  });

  it('leaves provider-specific tricks alone — they are not true everywhere', () => {
    expect(normaliseRsvpEmail('sam.logan+rsvp@example.com')).toBe('sam.logan+rsvp@example.com');
  });
});

describe('rsvpDocumentId', () => {
  it('is the SHA-256 of the normalised address, under the private `rsvp.` path', () => {
    // Pinned. Change the derivation and every returning guest gets a second document, not a replacement.
    expect(rsvpDocumentId('sam@example.com')).toBe(
      'rsvp.cd25a6171969f2a3c6e35c7667e3908ef1bd2424241db04411a0eec454ca6c16'
    );
  });

  it('is the same however the guest typed their address', () => {
    expect(rsvpDocumentId('  SAM@Example.com ')).toBe(rsvpDocumentId('sam@example.com'));
  });

  it('differs between guests, and is a valid Sanity ID that does not contain the address', () => {
    const id = rsvpDocumentId('alex@example.com');
    expect(id).not.toBe(rsvpDocumentId('sam@example.com'));
    expect(id).toMatch(/^[a-zA-Z0-9._-]{1,128}$/);
    expect(id).not.toContain('alex');
  });
});

describe('toRsvpDocument', () => {
  it('files the reply under its guest and stamps it with the server clock', () => {
    const reply = replyOf({ email: 'Sam@Example.com' });
    expect(toRsvpDocument(reply, new Date('2026-09-19T08:30:00.000Z'))).toEqual({
      ...reply,
      _id: rsvpDocumentId('sam@example.com'),
      _type: 'rsvp',
      submittedAt: '2026-09-19T08:30:00.000Z'
    });
  });
});

describe('isRepeatTooSoon', () => {
  const now = Date.parse('2026-09-19T08:30:00.000Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('is false for a guest with no reply stored', () => {
    expect(isRepeatTooSoon(undefined, now)).toBe(false);
  });

  it(`is true inside the ${RSVP_REPEAT_WINDOW_MS}ms window`, () => {
    expect(isRepeatTooSoon(ago(0), now)).toBe(true);
    expect(isRepeatTooSoon(ago(RSVP_REPEAT_WINDOW_MS - 1), now)).toBe(true);
  });

  it('is false once the window has passed', () => {
    expect(isRepeatTooSoon(ago(RSVP_REPEAT_WINDOW_MS), now)).toBe(false);
    expect(isRepeatTooSoon(ago(60 * 60 * 1000), now)).toBe(false);
  });

  it('counts a timestamp from the future as recent, and ignores one it cannot read', () => {
    expect(isRepeatTooSoon(ago(-5000), now)).toBe(true);
    expect(isRepeatTooSoon('not a date', now)).toBe(false);
  });

  it('takes its window as an argument', () => {
    expect(isRepeatTooSoon(ago(30_000), now, 60_000)).toBe(true);
  });
});

describe('isSameRsvpReply', () => {
  const reply = replyOf({
    attending: ['saturday'],
    dietary: 'Vegetarian',
    'plusOne.bringing': 'on',
    'plusOne.name': 'Alex Lee'
  });

  it('matches the document the same reply was stored as, Sanity fields and all', () => {
    // As the dataset returns it: Sanity's own fields added, and the unanswered questions simply absent.
    const stored = {
      _createdAt: '2026-09-19T08:30:00Z',
      _id: rsvpDocumentId('sam@example.com'),
      _rev: 'abc',
      _type: 'rsvp',
      _updatedAt: '2026-09-19T08:30:00Z',
      attending: ['saturday' as const],
      dietary: 'Vegetarian',
      email: 'sam@example.com',
      kidsCount: 0,
      name: 'Sam Logan',
      plusOne: { bringing: true, name: 'Alex Lee' },
      submittedAt: '2026-09-19T08:30:00.000Z'
    };
    expect(isSameRsvpReply(stored, reply)).toBe(true);
  });

  it.each<[string, Partial<RsvpReply>]>([
    ['a changed answer', { dietary: 'Vegan' }],
    ['an answer removed', { dietary: undefined }],
    ['a day added', { attending: ['saturday', 'sunday'] }],
    ['the plus one dropped', { plusOne: { bringing: false } }],
    ['a different count', { kidsCount: 1 }]
  ])('does not match after %s', (_, change) => {
    expect(isSameRsvpReply({ ...reply, ...change }, reply)).toBe(false);
  });
});
