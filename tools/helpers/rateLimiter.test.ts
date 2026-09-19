import { describe, expect, it } from 'vitest';

import createRateLimiter from './rateLimiter';

describe('createRateLimiter', () => {
  it('allows `limit` attempts in a window, then refuses', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect([0, 1, 2, 3].map((time) => limiter.attempt('a', time))).toEqual([true, true, true, false]);
  });

  it('counts each key on its own', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.attempt('a', 0)).toBe(true);
    expect(limiter.attempt('b', 0)).toBe(true);
    expect(limiter.attempt('a', 1)).toBe(false);
  });

  it('slides: each attempt ages out a full window after it was made', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    limiter.attempt('a', 0);
    limiter.attempt('a', 500);
    expect(limiter.attempt('a', 999)).toBe(false);
    expect(limiter.attempt('a', 1000)).toBe(true);
    expect(limiter.attempt('a', 1001)).toBe(false);
  });

  it('does not record a refused attempt, so persisting does not extend the wait', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.attempt('a', 0);
    for (let time = 100; time < 1000; time += 100) {
      expect(limiter.attempt('a', time)).toBe(false);
    }
    expect(limiter.attempt('a', 1000)).toBe(true);
  });

  it('forgets the least recently seen key once it holds `maxKeys`', () => {
    const limiter = createRateLimiter({ limit: 1, maxKeys: 2, windowMs: 1000 });
    limiter.attempt('a', 0);
    limiter.attempt('b', 0);
    limiter.attempt('a', 1);
    // 'b' was seen least recently, so 'c' pushes it out and 'b' starts afresh; 'a' is still held.
    limiter.attempt('c', 2);
    expect(limiter.attempt('b', 3)).toBe(true);
    expect(limiter.attempt('c', 3)).toBe(false);
  });
});
