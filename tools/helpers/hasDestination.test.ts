import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Link from '@/components/Link';

import type { ILinkElement } from '../sanity/schema/elements/link';
import hasDestination from './hasDestination';

/*
 * Deliberately partial, the way `link.test.ts` builds its links: each case supplies only what its
 * branch reads, which is the shape an editor leaves behind when they pick a link type and stop.
 */
const link = (value: Record<string, unknown>) => value as unknown as ILinkElement;

/** `[what the editor left, the link, whether it goes anywhere]`. */
const CASES: [string, Record<string, unknown>, boolean][] = [
  ['nothing at all', {}, false],
  ['internal, to a page', { linkType: 'internal', internalLink: { pathname: '/rsvp/' } }, true],
  // A reference to a deleted or unpublished page projects as `null`.
  ['internal, to an unpublished page', { linkType: 'internal', internalLink: null }, false],
  ['internal, with nothing chosen', { linkType: 'internal' }, false],
  // The case `linkEmpty` gets wrong: a route keeps its slug in `path`, so there is no `slug.current`,
  // and a projection has already dereferenced the `_ref` away — and it is still a working link.
  [
    'internal, to a route',
    { linkType: 'internal', internalLink: { title: 'Thank you', slug: null, pathname: '/thank-you/' } },
    true
  ],
  ['no type, with a pathname', { internalLink: { pathname: '/rsvp/' } }, true],
  ['no type, with a pasted href', { href: '/rsvp/' }, true],
  ['a null type', { linkType: null }, false],
  ['external, with a URL', { linkType: 'external', externalLink: 'https://example.com' }, true],
  ['external, with no URL', { linkType: 'external' }, false],
  // The stale internal reference an editor leaves behind on switching types is not read.
  ['external, with a stale reference', { linkType: 'external', internalLink: { pathname: '/rsvp/' } }, false],
  ['phone, with digits', { linkType: 'phone', phone: '+61 400 000 000' }, true],
  ['phone, with no digits', { linkType: 'phone', phone: '+' }, false],
  ['phone, with nothing', { linkType: 'phone' }, false],
  ['email, with an address', { linkType: 'email', email: 'hello@example.com' }, true],
  ['email, with nothing', { linkType: 'email' }, false],
  ['action', { linkType: 'action', action: 'openModal' }, false],
  // `Link` tests the phone and email fields whatever the type says.
  ['action, over a leftover phone', { linkType: 'action', phone: '0400 000 000' }, true],
  ['action, over a leftover email', { linkType: 'action', email: 'hello@example.com' }, true]
];

describe('hasDestination', () => {
  it('is false for a link that is not there', () => {
    expect(hasDestination()).toBe(false);
    expect(hasDestination(null)).toBe(false);
  });

  it.each(CASES)('%s', (_, value, expected) => {
    expect(hasDestination(link(value))).toBe(expected);
  });

  /*
   * The mirror, checked against what it mirrors.
   *
   * `hasDestination` restates `components/Link`'s branches, so on its own it would stay right only for
   * as long as somebody remembered to edit both. Rendering `Link` for every case above and reading
   * whether an `<a href>` came out makes the agreement a test instead: a branch added to `Link` — an
   * action registry, say — fails here rather than leaving the helper to hide a working button.
   *
   * `href` present, not merely an `<a>`: an external link with no URL renders an anchor with no `href`,
   * which is not focusable and goes nowhere, and the helper rightly calls that no destination.
   */
  it.each(CASES)('agrees with the element `Link` renders: %s', (_, value) => {
    const html = renderToStaticMarkup(createElement(Link, link(value), 'RSVP'));

    expect(hasDestination(link(value))).toBe(/^<a\s[^>]*\bhref="/.test(html));
  });
});
