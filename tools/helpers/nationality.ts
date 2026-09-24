/*=============================================>>>>>
= Guest nationality =
===============================================>>>>>*/

/**
 * The nationalities that have a travel note. Each is one fixed Sanity document,
 * `nationalityNote-{key}`; a guest of any other nationality is shown no note at all.
 */
export const NATIONALITIES = ['us', 'uk', 'fr'] as const;

export type Nationality = (typeof NATIONALITIES)[number];

/** The Studio's name for each. */
export const NATIONALITY_TITLES: Record<Nationality, string> = {
  fr: 'France',
  uk: 'United Kingdom',
  us: 'United States'
};

/**
 * What people actually type into a spreadsheet's Nationality column, for each key. Matched after
 * lower-casing and dropping full stops, so "U.S." and "u.s" are the same entry.
 */
const SPELLINGS: Record<Nationality, string[]> = {
  fr: ['fr', 'fra', 'france', 'french', 'française', 'francaise', 'français', 'francais'],
  uk: [
    'uk',
    'gb',
    'gbr',
    'united kingdom',
    'great britain',
    'britain',
    'british',
    'england',
    'english',
    'scotland',
    'scottish',
    'wales',
    'welsh',
    'northern ireland'
  ],
  us: ['us', 'usa', 'united states', 'united states of america', 'america', 'american']
};

const LOOKUP = new Map(
  Object.entries(SPELLINGS).flatMap(([key, spellings]) => spellings.map((spelling) => [spelling, key as Nationality]))
);

/**
 * The note key for a Nationality cell, or `undefined` when there is no note for it — a blank cell,
 * or any nationality other than the three. Undefined means "show nothing", never a fallback.
 */
export const nationalityOf = (value?: string | null): Nationality | undefined => {
  const cleaned = value?.toLowerCase().replaceAll('.', '').replaceAll(/\s+/g, ' ').trim();
  return cleaned ? LOOKUP.get(cleaned) : undefined;
};

/** The fixed document ID of a nationality's note. */
export const nationalityNoteId = (nationality: Nationality) => `nationalityNote-${nationality}`;
