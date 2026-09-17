import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function validateWebhookAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('SANITY_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
