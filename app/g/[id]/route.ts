import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { guestSessionSecret, signIn } from '@/tools/guests/session';
import { findGuest } from '@/tools/guests/sheet';

/**
 * A guest's personal link, `/g/SAM-4821/`, as sent in their invitation. Signs them in and takes them
 * straight to the RSVP form. An ID that is not in the sheet goes to the entry page instead, which
 * asks for it and says when it is wrong.
 */
export const GET = async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const guest = guestSessionSecret() ? await findGuest(decodeURIComponent(id)).catch(() => undefined) : undefined;

  /*
   * A relative redirect — `Location: /rsvp/` — which the browser resolves against the address the
   * guest actually used. Both `request.url` and `request.nextUrl` carry the deploy's internal
   * hostname on Netlify (`<deploy-id>--site.netlify.app`), so an absolute redirect built from either
   * lands on another host, where the cookie just set does not apply.
   */
  const to = (pathname: string) => new NextResponse(null, { headers: { location: pathname }, status: 307 });

  if (!guest) {
    return to('/enter/');
  }
  await signIn(guest);
  return to('/rsvp/');
};
