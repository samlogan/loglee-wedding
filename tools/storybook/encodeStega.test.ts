import { stegaClean } from '@sanity/client/stega';
import { describe, expect, it } from 'vitest';

import encodeStega from './encodeStega';

const VENUE_NAME = "$['venue']['name']";
const RSVP_LABEL = "$['rsvpLabel']";

/*
 * The contract its doc states, asserted once against the module. Every consumer's draft-mode test
 * stands on these: a blank that `.trim()` reads as filled, and a value `stegaClean` gives back.
 */
describe('encodeStega', () => {
  it.each(['Kangaroo Valley', '', '   '])('appends a payload after %j, blank values included', (value) => {
    const encoded = encodeStega(value, VENUE_NAME);

    expect(encoded.startsWith(value)).toBe(true);
    expect(encoded.length).toBeGreaterThan(value.length);
  });

  it('leaves a payload `.trim()` cannot remove', () => {
    expect(encodeStega('', VENUE_NAME).trim()).not.toBe('');
    expect(encodeStega('   ', VENUE_NAME).trim()).not.toBe('');

    // None of it goes with a trim, so a caller that trims an encoded value keeps its edit link.
    const encoded = encodeStega('Kangaroo Valley', VENUE_NAME);

    expect(encoded.trim()).toBe(encoded);
  });

  it.each(['Kangaroo Valley', '', '   ', '  padded  '])('is undone exactly by `stegaClean` for %j', (value) => {
    expect(stegaClean(encodeStega(value, VENUE_NAME))).toBe(value);
  });

  it('records the field it is given, so the same value from two fields encodes differently', () => {
    expect(encodeStega('RSVP', VENUE_NAME)).not.toBe(encodeStega('RSVP', RSVP_LABEL));
    // …and the same field twice identically: the encoding is a function of its two inputs.
    expect(encodeStega('RSVP', RSVP_LABEL)).toBe(encodeStega('RSVP', RSVP_LABEL));
  });
});
