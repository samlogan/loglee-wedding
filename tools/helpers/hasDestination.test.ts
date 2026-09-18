import { describe, expect, it } from 'vitest';

import type { ILinkElement } from '../sanity/schema/elements/link';
import hasDestination from './hasDestination';

/*
 * Deliberately partial, the way `link.test.ts` builds its links: each case supplies only what its
 * branch reads, which is the shape an editor leaves behind when they pick a link type and stop.
 */
const link = (value: Record<string, unknown>) => value as unknown as ILinkElement;

describe('hasDestination', () => {
  it('is false for a link that is not there', () => {
    expect(hasDestination()).toBe(false);
    expect(hasDestination(null)).toBe(false);
    expect(hasDestination(link({}))).toBe(false);
  });

  it('internal: reads the dereferenced pathname, which is what `Link` puts in the href', () => {
    expect(hasDestination(link({ linkType: 'internal', internalLink: { pathname: '/rsvp/' } }))).toBe(true);
    // A reference to a deleted or unpublished page projects as `null`.
    expect(hasDestination(link({ linkType: 'internal', internalLink: null }))).toBe(false);
    expect(hasDestination(link({ linkType: 'internal' }))).toBe(false);
  });

  it('internal: resolves a `route`, whose slug lives in `path` and so projects `slug: null`', () => {
    // The case `linkEmpty` gets wrong: no `slug.current` and no `_ref`, and still a working link.
    expect(
      hasDestination(
        link({ linkType: 'internal', internalLink: { title: 'Thank you', slug: null, pathname: '/thank-you/' } })
      )
    ).toBe(true);
  });

  it('treats a missing type as internal, as `Link` does', () => {
    expect(hasDestination(link({ internalLink: { pathname: '/rsvp/' } }))).toBe(true);
    expect(hasDestination(link({ href: '/rsvp/' }))).toBe(true);
    expect(hasDestination(link({ linkType: null }))).toBe(false);
  });

  it('external: needs a URL, or `Link` renders an anchor with no href', () => {
    expect(hasDestination(link({ linkType: 'external', externalLink: 'https://example.com' }))).toBe(true);
    expect(hasDestination(link({ linkType: 'external' }))).toBe(false);
    // The stale internal reference an editor leaves behind on switching types is not read.
    expect(hasDestination(link({ linkType: 'external', internalLink: { pathname: '/rsvp/' } }))).toBe(false);
  });

  it('phone: needs a digit, because `Link` strips everything else', () => {
    expect(hasDestination(link({ linkType: 'phone', phone: '+61 400 000 000' }))).toBe(true);
    expect(hasDestination(link({ linkType: 'phone', phone: '+' }))).toBe(false);
    expect(hasDestination(link({ linkType: 'phone' }))).toBe(false);
  });

  it('email: needs an address', () => {
    expect(hasDestination(link({ linkType: 'email', email: 'hello@example.com' }))).toBe(true);
    expect(hasDestination(link({ linkType: 'email' }))).toBe(false);
  });

  it('action: never — nothing consumes one, so `Link` renders an inert span', () => {
    expect(hasDestination(link({ linkType: 'action', action: 'openModal' }))).toBe(false);
  });
});
