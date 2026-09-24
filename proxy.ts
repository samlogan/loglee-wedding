import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { GUEST_COOKIE, verifyGuestSession } from '@/helpers/guestSession';

/**
 * The site is for invited guests only: every page asks for a guest ID first.
 *
 * A request passes when it carries the signed guest cookie (`tools/helpers/guestSession.ts`), set by
 * the entry page (`/enter/`) or by a guest's personal link (`/g/<ID>/`). Anything else is sent to
 * `/enter/`, with the page it wanted in `next`, so the guest lands back where they were heading.
 *
 * Checking the signature is enough — the proxy never looks the guest up. It runs on every request,
 * and the cookie can only have been written by the site, after it had checked the ID.
 *
 * Editors get in through the Studio's visual editor, which opens the site via `/api/draft`: once
 * Sanity has validated its secret, that route sets the same signed cookie, as `EDITOR`. Next's
 * draft-mode cookie is **not** trusted on its own — its presence proves nothing, since anyone can
 * set a cookie called `__prerender_bypass` by hand.
 *
 * The matcher below keeps out everything that is not a page: the entry
 * page and personal links themselves, `/api/*` (the Sanity webhook must reach `/api/revalidate/`),
 * the Studio, Next's own assets and any file with an extension (models, icons, `robots.txt`).
 */
export const proxy = (request: NextRequest) => {
  if (verifyGuestSession(request.cookies.get(GUEST_COOKIE)?.value, process.env.GUEST_SESSION_SECRET)) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  const entry = request.nextUrl.clone();
  entry.pathname = '/enter/';
  entry.search = '';
  if (pathname !== '/') {
    entry.searchParams.set('next', `${pathname}${search}`);
  }
  return NextResponse.redirect(entry);
};

export const config = {
  matcher: ['/((?!enter/|enter$|g/|api/|studio|_next/|.*\\..*).*)']
};
