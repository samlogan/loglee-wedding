import { stegaClean, stegaEncodeSourceMap } from '@sanity/client/stega';
import type { ContentSourceMap } from '@sanity/client/stega';
import { describe, expect, it } from 'vitest';

import hasText from './hasText';

/*
 * `value` as `sanityFetch` delivers it in draft mode, encoded by the client itself rather than
 * hand-typed as a run of zero-width characters — so these tests follow whatever the installed
 * `@sanity/client` emits, not whatever it emitted when they were written.
 *
 * `stegaEncodeSourceMap` is what the client runs over a query result when stega is on, and this is
 * the smallest source map it acts on: the result's `name`, traced back to the Footer's own field.
 */
const encode = (value: string): string => {
  const resultSourceMap: ContentSourceMap = {
    documents: [{ _id: 'drafts.weddingSettings', _type: 'weddingSettings' }],
    paths: ["$['venue']['name']"],
    mappings: { "$['name']": { type: 'value', source: { type: 'documentValue', document: 0, path: 0 } } }
  };

  return stegaEncodeSourceMap({ name: value }, resultSourceMap, { enabled: true, studioUrl: '/studio' }).name;
};

describe('hasText', () => {
  it('is false for the shapes a GROQ projection returns when the field is unset', () => {
    // An absent field projects as `null`, not `undefined`, so both have to be handled.
    expect(hasText(undefined)).toBe(false);
    expect(hasText(null)).toBe(false);
    expect(hasText('')).toBe(false);
  });

  it('is false for a value that is only whitespace', () => {
    // A single space is a real authoring state: an editor types, deletes, and leaves the space.
    expect(hasText(' ')).toBe(false);
    expect(hasText('   ')).toBe(false);
    expect(hasText('\n\t ')).toBe(false);
  });

  it('is true for an ordinary value', () => {
    expect(hasText('Kangaroo Valley')).toBe(true);
    expect(hasText('  Kangaroo Valley  ')).toBe(true);
  });

  it.each(['', '   '])('is false for %j once the stega encoder has made it non-empty', (blank) => {
    const encoded = encode(blank);

    /*
     * The case this helper exists for — and first, that the trap is real. The encoder does not skip
     * a blank value, and `.trim()` leaves what it appended, so `Boolean(value?.trim())` reports
     * content. The round trip shows the payload is an encoding `stegaClean` knows, not noise.
     */
    expect(encoded.trim()).not.toBe('');
    expect(stegaClean(encoded)).toBe(blank);

    expect(hasText(encoded)).toBe(false);
    // `components/Footer` trims before it asks, and the payload survives that as well.
    expect(hasText(encoded.trim())).toBe(false);
  });

  it('is true for an encoded value with text in it', () => {
    const encoded = encode('Kangaroo Valley');

    // Encoded for real, so this cannot pass by the encoder having skipped it.
    expect(encoded).not.toBe('Kangaroo Valley');
    expect(hasText(encoded)).toBe(true);
  });
});
