import { describe, expect, it } from 'vitest';

import { toCamelCase, toCapitalise, toKebabCase, toPascalCase, toPlural, toSlug, toTitleCase } from './string';

describe('toPlural', () => {
  it('pluralises above one and not at one', () => {
    expect(toPlural({ number: 1, string: 'review' })).toBe('1 review');
    expect(toPlural({ number: 4, string: 'review' })).toBe('4 reviews');
  });

  it('can omit the number', () => {
    expect(toPlural({ number: 4, string: 'review', showNumber: false })).toBe('reviews');
  });

  /**
   * The zero case is a trap worth knowing about: the guard is `!number`, so a legitimate count of
   * zero is treated as missing input and returns `null` rather than "0 reviews". A caller wanting to
   * render an empty state has to handle that itself.
   */
  it('returns null for zero, not "0 reviews"', () => {
    expect(toPlural({ number: 0, string: 'review' })).toBeNull();
  });

  it('returns null without a word', () => {
    expect(toPlural({ number: 3, string: '' })).toBeNull();
  });
});

describe('case converters', () => {
  it('toCapitalise raises only the first character', () => {
    expect(toCapitalise('hero split')).toBe('Hero split');
    expect(toCapitalise('')).toBe('');
  });

  it('toTitleCase raises after spaces and hyphens', () => {
    expect(toTitleCase('hero split section')).toBe('Hero Split Section');
    expect(toTitleCase('warm-stone')).toBe('Warm-Stone');
  });

  it('toCamelCase strips separators and raises the following letter', () => {
    expect(toCamelCase('hero split section')).toBe('heroSplitSection');
    expect(toCamelCase('two-column contained')).toBe('twoColumnContained');
  });

  /**
   * This one matters beyond formatting: the section registry maps a Sanity `_type` to a component
   * folder through `toCapitalise`, and the fixture generator relies on the camelCase/PascalCase pair
   * lining up.
   */
  it('toPascalCase joins words with each capitalised', () => {
    expect(toPascalCase('hero split section')).toBe('HeroSplitSection');
    expect(toPascalCase('')).toBe('');
  });

  it('toKebabCase lowercases and hyphenates', () => {
    expect(toKebabCase('Hero Split')).toBe('hero-split');
  });
});

describe('toSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(toSlug('Hero Split Section')).toBe('hero-split-section');
  });

  it('collapses runs of separators into one hyphen', () => {
    expect(toSlug('Car   Loans!!! 2026')).toBe('car-loans-2026');
  });

  it('trims surrounding whitespace before slugging', () => {
    expect(toSlug('  Personal Finance  ')).toBe('personal-finance');
  });
});
