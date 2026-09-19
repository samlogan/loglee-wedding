import { stegaClean, stegaEncodeSourceMap } from '@sanity/client/stega';
import type { ContentSourceMap } from '@sanity/client/stega';
import { describe, expect, it } from 'vitest';

import coupleNames, { couplePartners } from './coupleNames';

const PARTNER_ONE = "$['coupleNames']['partnerOne']";
const PARTNER_TWO = "$['coupleNames']['partnerTwo']";

/*
 * A name as `sanityFetch` delivers it in draft mode, encoded by the client itself rather than
 * hand-typed as a run of zero-width characters — the same construction `hasText.test.ts` uses, so
 * these follow whatever the installed `@sanity/client` emits. The payload records which field the
 * value came from, so each call names its own.
 */
const encode = (value: string, path: string): string => {
  const resultSourceMap: ContentSourceMap = {
    documents: [{ _id: 'drafts.weddingSettings', _type: 'weddingSettings' }],
    paths: [path],
    mappings: { "$['name']": { type: 'value', source: { type: 'documentValue', document: 0, path: 0 } } }
  };

  return stegaEncodeSourceMap({ name: value }, resultSourceMap, { enabled: true, studioUrl: '/studio' }).name;
};

describe('coupleNames', () => {
  it('joins both partners with an ampersand, in order', () => {
    expect(coupleNames({ partnerOne: 'Sam', partnerTwo: 'Lauren' })).toBe('Sam & Lauren');
    expect(coupleNames({ partnerOne: 'Lauren', partnerTwo: 'Sam' })).toBe('Lauren & Sam');
  });

  it('renders one partner alone, with no dangling ampersand', () => {
    // Each half is independently optional on `weddingSettings`, so either can be the one missing.
    expect(coupleNames({ partnerOne: 'Sam' })).toBe('Sam');
    expect(coupleNames({ partnerTwo: 'Lauren' })).toBe('Lauren');
    expect(coupleNames({ partnerOne: 'Sam', partnerTwo: null })).toBe('Sam');
    expect(coupleNames({ partnerOne: '', partnerTwo: 'Lauren' })).toBe('Lauren');
  });

  it('treats a whitespace-only name as blank and trims the ones it keeps', () => {
    expect(coupleNames({ partnerOne: '   ', partnerTwo: 'Lauren' })).toBe('Lauren');
    expect(coupleNames({ partnerOne: '  Sam ', partnerTwo: '\tLauren\n' })).toBe('Sam & Lauren');
  });

  it('falls back to both names when neither is filled in', () => {
    // "Published but empty" is reachable — neither field has an `initialValue`.
    expect(coupleNames({ partnerOne: '', partnerTwo: '  ' })).toBe('Sam & Lauren');
    expect(coupleNames({})).toBe('Sam & Lauren');
    // The singleton missing entirely, and the half-built object a projection returns for it.
    expect(coupleNames(null)).toBe('Sam & Lauren');
    expect(coupleNames(undefined)).toBe('Sam & Lauren');
    expect(coupleNames({ partnerOne: null, partnerTwo: null })).toBe('Sam & Lauren');
  });

  /*
   * The thank-you page's own inline version, before it was lifted here, was
   * `[one, two].map(trim).filter(Boolean).join(' & ') || 'Sam & Lauren'`. For every plain-string input
   * the lift must print exactly what that did — the page's sign-off and its scene's `alt` are both
   * built from this string.
   */
  it.each<[string | null | undefined, string | null | undefined, string]>([
    ['Sam', 'Lauren', 'Sam & Lauren'],
    [' Sam', 'Lauren ', 'Sam & Lauren'],
    ['Sam', '', 'Sam'],
    ['', 'Lauren', 'Lauren'],
    [null, undefined, 'Sam & Lauren'],
    [' ', '\n', 'Sam & Lauren']
  ])('prints what the thank-you page printed before the lift for %j and %j', (partnerOne, partnerTwo, expected) => {
    expect(coupleNames({ partnerOne, partnerTwo })).toBe(expected);
  });

  it('drops a blank name the stega encoder has made non-empty', () => {
    const blank = encode('', PARTNER_TWO);

    // The trap is real first: the encoded blank survives the `.trim()` test the page used to use.
    expect(blank.trim()).not.toBe('');

    expect(coupleNames({ partnerOne: 'Sam', partnerTwo: blank })).toBe('Sam');
    expect(coupleNames({ partnerOne: encode('   ', PARTNER_ONE), partnerTwo: blank })).toBe('Sam & Lauren');
  });

  it('keeps an encoded name encoded, so the overlay keeps its edit link', () => {
    const encoded = encode('Lauren', PARTNER_TWO);
    const [, second] = couplePartners({ partnerOne: 'Sam', partnerTwo: encoded });

    // Returned as rendered text, not cleaned: the payload is what Presentation reads to link it.
    expect(second).not.toBe('Lauren');
    expect(stegaClean(second)).toBe('Lauren');
    expect(second).toBe(encoded.trim());
  });
});

describe('couplePartners', () => {
  it('returns the partners separately, for a caller that lays them out itself', () => {
    expect(couplePartners({ partnerOne: 'Sam', partnerTwo: 'Lauren' })).toEqual(['Sam', 'Lauren']);
    expect(couplePartners({ partnerOne: ' Sam ', partnerTwo: '' })).toEqual(['Sam']);
    expect(couplePartners({ partnerTwo: 'Lauren' })).toEqual(['Lauren']);
  });

  it('returns the fallback as two names, so it stacks like real ones', () => {
    expect(couplePartners(null)).toEqual(['Sam', 'Lauren']);
    expect(couplePartners({ partnerOne: '', partnerTwo: null })).toEqual(['Sam', 'Lauren']);
  });

  it('hands out a fresh fallback array, so a caller mutating it cannot change the next one', () => {
    const first = couplePartners(null);

    first.pop();

    expect(couplePartners(null)).toEqual(['Sam', 'Lauren']);
  });

  it('agrees with the joined form for every input', () => {
    const inputs = [
      { partnerOne: 'Sam', partnerTwo: 'Lauren' },
      { partnerOne: 'Sam', partnerTwo: '' },
      { partnerOne: null, partnerTwo: 'Lauren' },
      null
    ];

    for (const input of inputs) {
      expect(couplePartners(input).join(' & ')).toBe(coupleNames(input));
    }
  });
});
