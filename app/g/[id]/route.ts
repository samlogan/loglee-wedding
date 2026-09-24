import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { guestSessionSecret, signIn } from '@/tools/guests/session';
import { findGuest } from '@/tools/guests/sheet';
import safePath from '@/tools/helpers/safePath';

/**
 * A guest's personal link, `/g/SAM-4821/`, as sent in their invitation. Signs them in and takes them
 * straight to the RSVP form — or wherever `?to=` says, e.g. `/g/SAM-4821/?to=/` for the homepage. An ID that is not in the sheet goes to the entry page instead, which
 * asks for it and says when it is wrong.
 */
export const GET = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  // Where to land: `?to=/` for the homepage, as the email's header and site link use. The RSVP form
  // by default. Checked, so a crafted link cannot bounce a guest off the site.
  const destination = safePath(request.nextUrl.searchParams.get('to'), '/rsvp/');
  const guest = guestSessionSecret() ? await findGuest(decodeURIComponent(id)).catch(() => undefined) : undefined;

  /*
   * A relative redirect — `Location: /rsvp/` — which the browser resolves against the address the
   * guest actually used. Both `request.url` and `request.nextUrl` carry the deploy's internal
   * hostname on Netlify (`<deploy-id>--site.netlify.app`), so an absolute redirect built from either
   * lands on another host, where the cookie just set does not apply.
   */
  const to = (pathname: string) => new NextResponse(null, { headers: { location: pathname }, status: 307 });

  if (!guest) {
    return to(`/enter/?next=${encodeURIComponent(destination)}`);
  }
  await signIn(guest);
  return to(destination);
};
