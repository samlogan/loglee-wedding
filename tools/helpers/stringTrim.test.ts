import { describe, expect, it } from 'vitest';

import stringTrim from './stringTrim';

/**
 * Splits long copy into a head and a tail, cutting at a sentence boundary near the requested length
 * rather than mid-word. Returns `[head, tail]`.
 *
 * The search window is `length ± difference%`. It looks outward from the ideal for punctuation
 * followed by a space, falls back to the nearest space, and failing both takes whichever window edge
 * is closer to the ideal.
 */
describe('stringTrim', () => {
  it('returns a pair of empty strings for no text', () => {
    expect(stringTrim({ text: undefined })).toEqual(['', '']);
    expect(stringTrim({ text: null })).toEqual(['', '']);
    expect(stringTrim({ text: '' })).toEqual(['', '']);
  });

  it('stringifies a number and leaves no tail', () => {
    expect(stringTrim({ text: 42 })).toEqual(['42', '']);
  });

  it('passes text shorter than the target through untouched', () => {
    expect(stringTrim({ text: 'Short copy', length: 100 })).toEqual(['Short copy', '']);
  });

  it('cuts after a sentence end inside the window, and returns the remainder as the tail', () => {
    const text = 'We compare lenders for you. Then we do the paperwork so you do not have to worry.';
    const [head, tail] = stringTrim({ text, length: 27, difference: 30 });
    expect(head).toBe('We compare lenders for you.');
    expect(tail).toBe('Then we do the paperwork so you do not have to worry.');
  });

  it('appends the end marker to the head only', () => {
    const text = 'We compare lenders for you. Then we do the paperwork so you do not have to worry.';
    const [head, tail] = stringTrim({ text, length: 27, difference: 30, end: '…' });
    expect(head.endsWith('…')).toBe(true);
    expect(tail.endsWith('…')).toBe(false);
  });

  it('never splits mid-word — the head ends at a boundary', () => {
    const text = 'Finance you can trust and guidance you can count on across every kind of vehicle loan';
    const [head] = stringTrim({ text, length: 40, difference: 25 });
    expect(head).toBe(head.trimEnd());
    expect(text.startsWith(head.trimEnd())).toBe(true);
  });

  /**
   * The guard exists because the window is derived from `length` and `difference`, and a caller
   * passing a nonsensical pair would otherwise get a silently wrong cut rather than an error.
   */
  it('throws when the window is impossible', () => {
    expect(() => stringTrim({ text: 'a'.repeat(200), length: 100, difference: -10 })).toThrow();
  });
});
