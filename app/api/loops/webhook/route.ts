import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { emailActivityOf, isLoopsSignatureValid } from '@/helpers/loopsWebhook';
import { hasGoogleCredentials } from '@/tools/guests/googleAuth';
import { markEmailActivity } from '@/tools/guests/sheet';

/**
 * Loops's webhook: an invitation or reminder opened, or a link in one clicked. Written into the guest's
 * row in the sheet — "Invite opened" / "Reminder opened" — by `markEmailActivity`.
 *
 * Set up in Loops → Settings → Webhooks: this URL (the trailing slash matters — the site redirects
 * without it, and Loops does not follow redirects), the `email.opened` and `email.clicked` events,
 * and the signing secret as `LOOPS_WEBHOOK_SECRET` on Netlify. A request without a valid signature is
 * refused, so nobody else can write into the sheet through here.
 *
 * Every other outcome answers 200 — an event this does not record, a guest not in the sheet, even a
 * sheet error (logged) — because Loops retries anything else, and a retry could not do better.
 */
export const POST = async (request: NextRequest) => {
  const body = await request.text();
  const valid = isLoopsSignatureValid({
    body,
    id: request.headers.get('webhook-id'),
    secret: process.env.LOOPS_WEBHOOK_SECRET,
    signature: request.headers.get('webhook-signature'),
    timestamp: request.headers.get('webhook-timestamp')
  });
  if (!valid) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const event = emailActivityOf(payload);
  if (event && hasGoogleCredentials()) {
    try {
      await markEmailActivity(event, new Date());
    } catch (error) {
      console.error(`[Loops webhook] Not recorded: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
  return NextResponse.json({ recorded: Boolean(event) });
};
