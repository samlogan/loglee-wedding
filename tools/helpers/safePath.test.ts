import { describe, expect, it } from 'vitest';

import safePath from './safePath';

describe('safePath', () => {
  it('keeps a path on this site, with its query', () => {
    expect(safePath('/')).toBe('/');
    expect(safePath('/weekend/')).toBe('/weekend/');
    expect(safePath('/rsvp/?from=email')).toBe('/rsvp/?from=email');
  });

  it('refuses anything that could leave the site', () => {
    expect(safePath('//evil.example')).toBe('/');
    expect(safePath('https://evil.example')).toBe('/');
    expect(safePath('/\\evil.example')).toBe('/');
    expect(safePath('evil.example')).toBe('/');
  });

  it('falls back when there is nothing usable', () => {
    expect(safePath(undefined)).toBe('/');
    expect(safePath(null, '/rsvp/')).toBe('/rsvp/');
    expect(safePath('', '/rsvp/')).toBe('/rsvp/');
    expect(safePath(['/weekend/'], '/rsvp/')).toBe('/rsvp/');
  });
});
