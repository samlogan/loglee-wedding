/*=============================================>>>>>
= Guests, as the guest sheet describes them =
===============================================>>>>>*/

/** Where a guest pays their room contribution: the Australian bank account, or Wise. */
export type PaymentRegion = 'au' | 'wise';

export interface Guest {
  /** The sheet row, 1-based, as the Sheets API addresses it — row 1 is the header. */
  row: number;
  /** The guest ID, e.g. `SAM-4821`, stored upper-case. */
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** The Nationality cell as typed. See `@/helpers/nationality` for the three that have a note. */
  nationality: string;
  /** The Stay option cell as typed — "King Room", "Twin Double", "Family Room" — or blank. */
  stay: string;
  nights?: number;
  /** The contribution per room, per night, in AUD. */
  perNight?: number;
  payment: PaymentRegion;
  /** The Invite sent cell — blank until the invitation email has gone. */
  inviteSent: string;
  /** The Reminder sent cell — blank until a reminder has gone. */
  reminderSent: string;
  /** The RSVP status cell — "Replied …" once they have replied through the site. */
  rsvpStatus: string;
}

/** Four digits after the name: 9,000 IDs per first name — plenty for one guest list. */
const ID_DIGITS_MIN = 1000;
const ID_DIGITS_SPAN = 9000;

/**
 * A guest ID's comparable form: upper-case, no spaces, the dash kept. Guests type these, so "sam-4821",
 * " SAM 4821 " and "Sam–4821" (an en dash, from a phone keyboard) all mean the same guest.
 */
export const normaliseGuestId = (value?: string | null): string =>
  (value ?? '')
    .normalize('NFKC')
    .toUpperCase()
    .replaceAll(/[‐-―\s_]+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '');

/**
 * The name half of an ID: the first name in upper-case ASCII letters, accents stripped
 * ("Zoë" → "ZOE", "Jean-Luc" → "JEANLUC"). `GUEST` when nothing usable is left.
 */
const namePart = (firstName: string) =>
  firstName
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .toUpperCase()
    .replaceAll(/[^A-Z]/g, '')
    .slice(0, 12) || 'GUEST';

/**
 * A new guest ID for a row — the first name and four digits, e.g. `SAM-4821` — that is not already
 * in `taken`. `random` returns a number in [0, 1); injected so the tests are deterministic.
 */
export const guestIdFor = (firstName: string, taken: ReadonlySet<string>, random: () => number = Math.random) => {
  const name = namePart(firstName);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const id = `${name}-${ID_DIGITS_MIN + Math.floor(random() * ID_DIGITS_SPAN)}`;
    if (!taken.has(id)) {
      return id;
    }
  }
  // Fifty collisions means `random` is not random; walk the space rather than loop forever.
  for (let digits = ID_DIGITS_MIN; digits < ID_DIGITS_MIN + ID_DIGITS_SPAN; digits += 1) {
    const id = `${name}-${digits}`;
    if (!taken.has(id)) {
      return id;
    }
  }
  throw new Error(`No guest ID left for ${name}`);
};

/**
 * Australian guests pay into the Australian account; everyone else uses Wise. The sheet leaves
 * Nationality blank for Australian guests, or says so.
 */
export const paymentRegionOf = (nationality?: string | null): PaymentRegion => {
  const cleaned = (nationality ?? '').toLowerCase().replaceAll('.', '').trim();
  return cleaned === '' || ['au', 'aus', 'australia', 'australian'].includes(cleaned) ? 'au' : 'wise';
};

/** A number cell: "150", "$150", "1,200" → 150, 150, 1200. `undefined` when blank or not a number. */
export const numberCell = (value?: string | null): number | undefined => {
  const cleaned = (value ?? '').replaceAll(/[$,\s]/g, '');
  if (cleaned === '') {
    return undefined;
  }
  const number = Number(cleaned);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};

export interface StayPrice {
  stay: string;
  /** Every night they stay, the Sunday included when they have added it. */
  nights: number;
  perNight: number;
  total: number;
  /** Whether the Sunday night is in `nights` and `total`. */
  extraNight: boolean;
}

/**
 * The guest's stay and what it comes to, or `undefined` when the sheet does not say enough.
 *
 * `extraNight` is the RSVP form's "Spend the Sunday evening with us": one more night, at the same
 * price per night, on top of the nights in the sheet.
 */
export const stayPriceOf = (
  guest: Pick<Guest, 'stay' | 'nights' | 'perNight'>,
  { extraNight = false }: { extraNight?: boolean } = {}
): StayPrice | undefined => {
  const { perNight, stay } = guest;
  if (!stay.trim() || !guest.nights || perNight === undefined) {
    return undefined;
  }
  const nights = guest.nights + (extraNight ? 1 : 0);
  return { extraNight, nights, perNight, stay: stay.trim(), total: nights * perNight };
};

/**
 * Whether there is anything to pay for this stay. A stay the couple are covering — a contribution of
 * 0 in the sheet — has none, and the guest is shown nothing about paying: no price, no payment
 * details. No stay at all is not a free one; it is unknown, and is left to the payment details alone.
 */
export const isFreeStay = (stay?: Pick<StayPrice, 'total'>): boolean => stay?.total === 0;

/** The sheet's columns, found by how each header starts — so reordering or relabelling the rest is safe. */
export const GUEST_COLUMNS = {
  email: 'email',
  firstName: 'first name',
  id: 'guest id',
  inviteSent: 'invite sent',
  lastName: 'last name',
  nationality: 'nationality',
  nights: 'nights',
  perNight: 'contribution',
  reminderSent: 'reminder sent',
  rsvpLink: 'rsvp link',
  rsvpStatus: 'rsvp status',
  stay: 'stay option'
} as const;

export type GuestColumn = keyof typeof GUEST_COLUMNS;

/** Each column's 0-based index in the header row, or -1 when the sheet does not have it. */
export const guestColumnsOf = (header: readonly string[]): Record<GuestColumn, number> => {
  const labels = header.map((cell) => cell.trim().toLowerCase());
  return Object.fromEntries(
    Object.entries(GUEST_COLUMNS).map(([key, prefix]) => [key, labels.findIndex((label) => label.startsWith(prefix))])
  ) as Record<GuestColumn, number>;
};

/** A1 column letter for a 0-based index: 0 → A, 25 → Z, 26 → AA. */
export const columnLetter = (index: number): string => {
  let letters = '';
  for (let remaining = index + 1; remaining > 0; remaining = Math.floor((remaining - 1) / 26)) {
    letters = String.fromCodePoint(65 + ((remaining - 1) % 26)) + letters;
  }
  return letters;
};

const cellOf = (row: readonly string[], index: number) => (index >= 0 ? (row[index] ?? '').trim() : '');

export interface GuestRows {
  guests: Guest[];
  /** Rows with a first name but no ID, and the ID each should be given. Written back to the sheet. */
  missingIds: { row: number; id: string }[];
}

/**
 * The sheet's values — header row first, as the Sheets API returns them — as guests. A row counts
 * once it has a first name; one without an ID is given a new one here (see `missingIds`), so adding
 * a guest is just adding a row. Rows without a first name are skipped, blank or not.
 */
export const guestsFromRows = (
  values: readonly (readonly string[])[],
  random: () => number = Math.random
): GuestRows => {
  const [header = [], ...rows] = values;
  const columns = guestColumnsOf(header);
  const taken = new Set(rows.map((row) => normaliseGuestId(cellOf(row, columns.id))).filter(Boolean));
  const guests: Guest[] = [];
  const missingIds: GuestRows['missingIds'] = [];

  for (const [index, row] of rows.entries()) {
    const firstName = cellOf(row, columns.firstName);
    if (!firstName) {
      continue;
    }
    const sheetRow = index + 2;
    let id = normaliseGuestId(cellOf(row, columns.id));
    if (!id) {
      id = guestIdFor(firstName, taken, random);
      taken.add(id);
      missingIds.push({ id, row: sheetRow });
    }
    const nationality = cellOf(row, columns.nationality);
    guests.push({
      email: cellOf(row, columns.email),
      firstName,
      id,
      inviteSent: cellOf(row, columns.inviteSent),
      lastName: cellOf(row, columns.lastName),
      nationality,
      nights: numberCell(cellOf(row, columns.nights)),
      payment: paymentRegionOf(nationality),
      perNight: numberCell(cellOf(row, columns.perNight)),
      reminderSent: cellOf(row, columns.reminderSent),
      row: sheetRow,
      rsvpStatus: cellOf(row, columns.rsvpStatus),
      stay: cellOf(row, columns.stay)
    });
  }
  return { guests, missingIds };
};
