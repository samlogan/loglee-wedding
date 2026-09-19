import { stegaClean } from '@sanity/client/stega';
import { describe, expect, it } from 'vitest';

import encodeStega from '@/tools/storybook/encodeStega';

import hasText from './hasText';
import textOrUndefined from './textOrUndefined';

// One of the fields `HeroSection` reads through this helper.
const TRAVEL_NOTE = "$['venue']['travelNote']";

describe('textOrUndefined', () => {
  it('is undefined for the shapes a GROQ projection returns when the field is unset', () => {
    expect(textOrUndefined()).toBeUndefined();
    expect(textOrUndefined(undefined)).toBeUndefined();
    expect(textOrUndefined(null)).toBeUndefined();
    expect(textOrUndefined('')).toBeUndefined();
  });

  it('is undefined for a value that is only whitespace', () => {
    expect(textOrUndefined(' ')).toBeUndefined();
    expect(textOrUndefined('\n\t ')).toBeUndefined();
  });

  it('hands back the value itself when it has text in it', () => {
    expect(textOrUndefined('90 min south of Sydney')).toBe('90 min south of Sydney');
  });

  it('does not trim — a caller with a reason to trims at its own call site', () => {
    expect(textOrUndefined('  The Lodge  ')).toBe('  The Lodge  ');
  });

  it.each(['', '   '])('is undefined for %j once the stega encoder has made it non-empty', (blank) => {
    const encoded = encodeStega(blank, TRAVEL_NOTE);

    // The trap is real first: to a plain `.trim()` test the encoded blank has something in it.
    expect(encoded.trim()).not.toBe('');
    expect(stegaClean(encoded)).toBe(blank);

    expect(textOrUndefined(encoded)).toBeUndefined();
  });

  it('returns an encoded value byte for byte, so the overlay keeps its edit link', () => {
    const encoded = encodeStega('90 min south of Sydney', TRAVEL_NOTE);

    // Encoded for real, so this cannot pass by the encoder having skipped it.
    expect(encoded).not.toBe('90 min south of Sydney');
    expect(textOrUndefined(encoded)).toBe(encoded);
    expect(stegaClean(textOrUndefined(encoded))).toBe('90 min south of Sydney');
  });

  it('decides blankness exactly as `hasText` does', () => {
    const inputs = [undefined, null, '', ' ', 'x', ' x ', encodeStega('', TRAVEL_NOTE), encodeStega('x', TRAVEL_NOTE)];

    for (const input of inputs) {
      expect(textOrUndefined(input) !== undefined).toBe(hasText(input));
    }
  });
});
