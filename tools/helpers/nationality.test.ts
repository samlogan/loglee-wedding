import { describe, expect, it } from 'vitest';

import { NATIONALITIES, nationalityNoteId, nationalityOf } from './nationality';

describe('nationalityOf', () => {
  it('reads the values the guest sheet suggests', () => {
    expect(nationalityOf('US')).toBe('us');
    expect(nationalityOf('UK')).toBe('uk');
    expect(nationalityOf('France')).toBe('fr');
  });

  it('accepts the other ways people type them, in any case, with or without full stops', () => {
    expect(nationalityOf('u.s.a.')).toBe('us');
    expect(nationalityOf('  American ')).toBe('us');
    expect(nationalityOf('British')).toBe('uk');
    expect(nationalityOf('Great   Britain')).toBe('uk');
    expect(nationalityOf('Scotland')).toBe('uk');
    expect(nationalityOf('French')).toBe('fr');
    expect(nationalityOf('Française')).toBe('fr');
  });

  it('returns nothing for any other nationality, or a blank cell, so no note is shown', () => {
    expect(nationalityOf('Australia')).toBeUndefined();
    expect(nationalityOf('Canadian')).toBeUndefined();
    expect(nationalityOf('')).toBeUndefined();
    expect(nationalityOf('   ')).toBeUndefined();
    expect(nationalityOf(null)).toBeUndefined();
    expect(nationalityOf(undefined)).toBeUndefined();
  });
});

describe('nationalityNoteId', () => {
  it('names one fixed document per nationality', () => {
    expect(NATIONALITIES.map(nationalityNoteId)).toEqual([
      'nationalityNote-us',
      'nationalityNote-uk',
      'nationalityNote-fr'
    ]);
  });
});
