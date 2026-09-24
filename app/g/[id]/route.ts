import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { guestSessionSecret, signIn } from '@/tools/guests/session';
import { findGuest } from '@/tools/guests/sheet';

/**
 * A guest's personal link, `/g/SAM-4821/`, as sent in their invitation. Signs them in and takes them
 * straight to the RSVP form. An ID that is not in the sheet goes to the entry page instead, which
 * asks for it and says when it is wrong.
 */
export const GET = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const guest = guestSessionSecret() ? await findGuest(decodeURIComponent(id)).catch(() => undefined) : undefined;

  /*
   * From `nextUrl`, not `request.url`. On Netlify `request.url` carries the deploy's internal
   * hostname (`<deploy-id>--site.netlify.app`) rather than the address the guest used, so a redirect
   * built from it lands on another host — where the cookie just set does not apply.
   */
  const to = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = '';
    return url;
  };

  if (!guest) {
    return NextResponse.redirect(to('/enter/'));
  }
  await signIn(guest);
  return NextResponse.redirect(to('/rsvp/'));
};
