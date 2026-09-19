import { describe, expect, it } from 'vitest';

import encodeStega from '@/tools/storybook/encodeStega';

import longestWordLength from './longestWordLength';

describe('longestWordLength', () => {
  it('counts the longest word', () => {
    expect(longestWordLength('The Weekend')).toBe(7);
    expect(longestWordLength('Stay')).toBe(4);
  });

  it('ignores the markup a TitleInput stores', () => {
    expect(longestWordLength('<h1>The Lodge</h1>')).toBe(5);
    expect(longestWordLength('<h2><span>The</span> Weekend</h2>')).toBe(7);
  });

  it('does not count the stega payload Presentation adds to a string', () => {
    expect(longestWordLength(encodeStega('The Weekend', "$['title']"))).toBe(7);
  });

  it('is zero for nothing to measure', () => {
    expect(longestWordLength(undefined)).toBe(0);
    expect(longestWordLength('')).toBe(0);
    expect(longestWordLength('<h1></h1>')).toBe(0);
  });
});
