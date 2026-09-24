import { validatePreviewUrl } from '@sanity/preview-url-secret';
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

import { EDITOR_ID, guestSessionSecret, signIn } from '@/tools/guests/session';
import { client } from '@/tools/sanity/lib/client';
import { token } from '@/tools/sanity/lib/token';

const clientWithToken = client.withConfig({ token });

export async function GET(request: Request) {
  const { isValid, redirectTo = '/' } = await validatePreviewUrl(clientWithToken, request.url);

  if (!isValid) {
    return new Response('Invalid secret', { status: 401 });
  }

  (await draftMode()).enable();

  /*
   * Let the editor past the guest gate. The Studio's visual editor opens the site through this route,
   * with a secret Sanity has just validated, so this browser belongs to someone signed in to the
   * Studio. It gets the same signed cookie a guest gets (as `EDITOR`), which is what `proxy.ts`
   * checks — the proxy no longer trusts Next's draft-mode cookie on sight, since anyone can set one.
   */
  if (guestSessionSecret()) {
    await signIn({ id: EDITOR_ID });
  }

  redirect(redirectTo);
}
