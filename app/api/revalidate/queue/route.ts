import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { validateWebhookAuth } from '../../_helpers/auth';

const logPrefix = '[⏳ Revalidate Queue]: ';

export const POST = async (req: NextRequest) => {
  console.log(`${logPrefix}Revalidate endpoint hit.`);

  const authError = validateWebhookAuth(req);
  if (authError) {
    return authError;
  }

  try {
    const body = await req.text(); // capture raw body for forwarding

    let type: string | undefined;
    let slug: string | undefined;
    try {
      const parsed = JSON.parse(body);
      type = parsed?._type;
      slug = parsed?.slug?.current;
    } catch {
      // Body isn't JSON — that's fine, we just won't log type/slug
    }

    console.log(
      `${logPrefix}Webhook received for type: ${type ?? 'unknown'}, slug: ${slug ?? 'n/a'}. Enqueueing with 60s delay.`
    );

    const url = `https://qstash.upstash.io/v2/publish/${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate/`;

    const res = await fetch(url, {
      body,
      headers: {
        Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
        'Upstash-Delay': '60s'
      },
      method: 'POST'
    });

    if (!res.ok) {
      throw new Error(`QStash enqueue failed: ${await res.text()}`);
    }

    console.log(`${logPrefix}Successfully enqueued type: ${type ?? 'unknown'}, slug: ${slug ?? 'n/a'}.`);
    return NextResponse.json({ enqueued: true });
  } catch (error) {
    console.error(`${logPrefix}Error enqueuing webhook.`, error);
    return NextResponse.json({ enqueued: false, error: 'Internal server error' });
  }
};
