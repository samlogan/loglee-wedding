import { describe, expect, it } from 'vitest';

import {
  columnLetter,
  guestColumnsOf,
  guestIdFor,
  guestsFromRows,
  normaliseGuestId,
  numberCell,
  paymentRegionOf,
  stayPriceOf
} from './guests';

/** A generator that returns the given values in turn. */
const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe('guestIdFor', () => {
  it('makes a name and four digits from the first name', () => {
    expect(guestIdFor('Sam', new Set(), sequence(0.4245))).toBe('SAM-4820');
    expect(guestIdFor('Sam', new Set(), sequence(0))).toBe('SAM-1000');
    expect(guestIdFor('Sam', new Set(), sequence(0.999_99))).toBe('SAM-9999');
  });

  it('strips accents, spaces and punctuation from the name', () => {
    expect(guestIdFor('Zoë', new Set(), sequence(0))).toBe('ZOE-1000');
    expect(guestIdFor('Jean-Luc', new Set(), sequence(0))).toBe('JEANLUC-1000');
    expect(guestIdFor('  ', new Set(), sequence(0))).toBe('GUEST-1000');
  });

  it('never returns an ID that is already taken', () => {
    // 0 → 1000 and 0.0002 → 1001 are both taken; 0.0003 → 1002 is free.
    const taken = new Set(['SAM-1000', 'SAM-1001']);
    expect(guestIdFor('Sam', taken, sequence(0, 0.0002, 0.0003))).toBe('SAM-1002');
  });

  it('walks the whole range rather than looping when the generator keeps colliding', () => {
    const taken = new Set(['SAM-1000']);
    expect(guestIdFor('Sam', taken, () => 0)).toBe('SAM-1001');
  });
});

describe('normaliseGuestId', () => {
  it('matches what a guest types to the ID in the sheet', () => {
    expect(normaliseGuestId('sam-4821')).toBe('SAM-4821');
    expect(normaliseGuestId('  SAM 4821 ')).toBe('SAM-4821');
    expect(normaliseGuestId('Sam–4821')).toBe('SAM-4821');
    expect(normaliseGuestId('sam--4821')).toBe('SAM-4821');
    expect(normaliseGuestId(null)).toBe('');
  });
});

describe('paymentRegionOf', () => {
  it('sends blank and Australian guests to the Australian account', () => {
    expect(paymentRegionOf('')).toBe('au');
    expect(paymentRegionOf(undefined)).toBe('au');
    expect(paymentRegionOf('Australian')).toBe('au');
    expect(paymentRegionOf(' australia ')).toBe('au');
    expect(paymentRegionOf('AUS')).toBe('au');
  });

  it('sends everyone else to Wise', () => {
    expect(paymentRegionOf('US')).toBe('wise');
    expect(paymentRegionOf('UK')).toBe('wise');
    expect(paymentRegionOf('France')).toBe('wise');
    expect(paymentRegionOf('New Zealand')).toBe('wise');
  });
});

describe('numberCell', () => {
  it('reads amounts as people type them', () => {
    expect(numberCell('150')).toBe(150);
    expect(numberCell('$150')).toBe(150);
    expect(numberCell('1,200')).toBe(1200);
    expect(numberCell('')).toBeUndefined();
    expect(numberCell('two')).toBeUndefined();
    expect(numberCell('-5')).toBeUndefined();
  });
});

describe('stayPriceOf', () => {
  it('multiplies the nightly contribution by the nights', () => {
    expect(stayPriceOf({ nights: 2, perNight: 150, stay: 'King Room' })).toEqual({
      extraNight: false,
      nights: 2,
      perNight: 150,
      stay: 'King Room',
      total: 300
    });
  });

  it('shows nothing when the row does not say enough', () => {
    expect(stayPriceOf({ nights: 2, perNight: 150, stay: '' })).toBeUndefined();
    expect(stayPriceOf({ nights: undefined, perNight: 150, stay: 'King Room' })).toBeUndefined();
    expect(stayPriceOf({ nights: 2, perNight: undefined, stay: 'King Room' })).toBeUndefined();
  });

  it('adds the Sunday night at the same nightly price when the guest takes it', () => {
    expect(stayPriceOf({ nights: 2, perNight: 150, stay: 'King Room' }, { extraNight: true })).toEqual({
      extraNight: true,
      nights: 3,
      perNight: 150,
      stay: 'King Room',
      total: 450
    });
  });

  it('adds no night to a stay the sheet does not give', () => {
    expect(stayPriceOf({ nights: undefined, perNight: 150, stay: 'King Room' }, { extraNight: true })).toBeUndefined();
  });

  it('shows a free stay as a stay, not as missing', () => {
    expect(stayPriceOf({ nights: 2, perNight: 0, stay: 'Twin Double' })?.total).toBe(0);
  });
});

describe('guestColumnsOf', () => {
  it('finds each column by how its header starts, wherever it sits', () => {
    const columns = guestColumnsOf([
      'Guest ID (filled by the site)',
      'First name',
      'Last name',
      'Email',
      'Nationality (US, UK, France — or leave blank)',
      'Stay option (King Room, Twin Double, Family Room — or blank)',
      'Nights',
      'Contribution per room per night ($)',
      'RSVP link (automatic)',
      'RSVP status (filled by the site)'
    ]);
    expect(columns).toEqual({
      email: 3,
      firstName: 1,
      id: 0,
      inviteSent: -1,
      lastName: 2,
      nationality: 4,
      nights: 6,
      perNight: 7,
      reminderSent: -1,
      rsvpLink: 8,
      rsvpStatus: 9,
      stay: 5
    });
  });

  it('reports a missing column as -1', () => {
    expect(guestColumnsOf(['First name']).id).toBe(-1);
  });
});

describe('columnLetter', () => {
  it('turns an index into an A1 column', () => {
    expect(columnLetter(0)).toBe('A');
    expect(columnLetter(11)).toBe('L');
    expect(columnLetter(25)).toBe('Z');
    expect(columnLetter(26)).toBe('AA');
  });
});

describe('guestsFromRows', () => {
  const HEADER = [
    'Guest ID',
    'First name',
    'Last name',
    'Email',
    'Nationality',
    'Stay option',
    'Nights',
    'Contribution per room per night ($)'
  ];

  it('reads each row with a first name as a guest, keeping its sheet row number', () => {
    const { guests, missingIds } = guestsFromRows([
      HEADER,
      ['sam-4821', 'Sam', 'Logan', 'sam@example.com', '', 'King Room', '2', '$150'],
      ['LAUREN-1234', 'Lauren', 'Lee', 'lauren@example.com', 'US', '', '', '']
    ]);

    expect(missingIds).toEqual([]);
    expect(guests).toEqual([
      {
        email: 'sam@example.com',
        firstName: 'Sam',
        id: 'SAM-4821',
        inviteSent: '',
        lastName: 'Logan',
        nationality: '',
        nights: 2,
        payment: 'au',
        perNight: 150,
        reminderSent: '',
        row: 2,
        rsvpStatus: '',
        stay: 'King Room'
      },
      {
        email: 'lauren@example.com',
        firstName: 'Lauren',
        id: 'LAUREN-1234',
        inviteSent: '',
        lastName: 'Lee',
        nationality: 'US',
        nights: undefined,
        payment: 'wise',
        perNight: undefined,
        reminderSent: '',
        row: 3,
        rsvpStatus: '',
        stay: ''
      }
    ]);
  });

  it('gives a new ID to a row without one, unique against the rest of the sheet', () => {
    const { guests, missingIds } = guestsFromRows(
      [HEADER, ['SAM-1000', 'Sam'], ['', 'Sam'], ['', ''], ['', 'Zoë']],
      () => 0
    );

    expect(missingIds).toEqual([
      { id: 'SAM-1001', row: 3 },
      { id: 'ZOE-1000', row: 5 }
    ]);
    expect(guests.map((guest) => guest.id)).toEqual(['SAM-1000', 'SAM-1001', 'ZOE-1000']);
  });

  it('returns nothing for an empty sheet', () => {
    expect(guestsFromRows([])).toEqual({ guests: [], missingIds: [] });
    expect(guestsFromRows([HEADER])).toEqual({ guests: [], missingIds: [] });
  });
});
