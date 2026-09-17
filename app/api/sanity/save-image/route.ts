import { createClient } from '@sanity/client';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isAllowedImageUrl, isValidDocumentRef, isValidFieldPath } from '@/tools/sanity/helpers/imageSourceUrl';
import verifyStudioUser from '@/tools/sanity/helpers/verifyStudioUser';

/**
 * `useCdn: false`, unlike most read clients in this project.
 *
 * This one holds a write token and its read below decides *which document to patch* — the draft or
 * the published version. The CDN serves cached responses, and `canUseCdn` in `@sanity/client` keys
 * off the HTTP method rather than the presence of a token, so a query here would be answered from
 * cache: a draft created moments ago can be missing from it, and the route would then patch the
 * published document instead. A stale read driving a write is worth more than the latency it saves.
 */
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
  token: process.env.SANITY_WRITE_TOKEN
});

interface RequestBody {
  imageUrl: string;
  documentRef: string;
  fieldName: string;
  fileName: string;
}

export const POST = async (req: NextRequest) => {
  try {
    /*
     * Called from the browser by `VideoUrlInput`, so the editor's own Sanity token is the only thing
     * that can prove identity here — see `verifyStudioUser` for why a shared secret cannot work for
     * a browser caller, and why a CSRF token would not substitute.
     *
     * The write below still uses the server's own token. Presenting a valid editor token authorises
     * the request; it does not lend its permissions to it.
     */
    const user = await verifyStudioUser(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrl, documentRef, fieldName, fileName }: RequestBody = body;

    if (!imageUrl || !documentRef || !fieldName) {
      return NextResponse.json({ error: 'Please provide imageUrl, documentRef and fieldName' }, { status: 400 });
    }

    /*
     * Host allowlist before any network call — this is the SSRF guard, and checking after the fetch
     * would be no guard at all. See `imageSourceUrl` for the reasoning and the lookalike hosts it
     * has to refuse.
     */
    if (!isAllowedImageUrl(imageUrl)) {
      return NextResponse.json({ error: 'Image host not allowed' }, { status: 403 });
    }

    // `documentRef` is interpolated into a GROQ string, so it is held to an id shape. `fieldName` is
    // a Sanity patch path — the caller sends one — validated against the grammar Studio can produce.
    if (!isValidDocumentRef(documentRef) || !isValidFieldPath(fieldName)) {
      return NextResponse.json({ error: 'Invalid documentRef or fieldName' }, { status: 400 });
    }

    const imageRes = await fetch(imageUrl, { cache: 'no-store' });

    if (!imageRes.ok) {
      throw new Error(`Failed to fetch image: ${imageRes.statusText}`);
    }

    const blob = await imageRes.blob();

    // The allowlisted hosts serve images, so anything else means the URL did not resolve to the
    // thumbnail we asked for. Refuse rather than storing an HTML error page as an image asset.
    if (!blob.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Fetched resource is not an image' }, { status: 400 });
    }

    // Convert blob to a Buffer
    const buffer: ArrayBuffer = await blob.arrayBuffer();
    const file: Buffer = Buffer.from(buffer);

    // Upload the image to Sanity
    const imageAsset = await client.assets.upload('image', file, {
      contentType: blob.type,
      filename: fileName || `uploaded_image.jpg`
    });

    const draftsQuery = `*[_id == "drafts.${documentRef}"]`;

    let documentId = documentRef;

    const drafts = await client.fetch(draftsQuery);

    if (drafts.length > 0) {
      documentId = `drafts.${documentRef}`;
    }

    // Update the document with the image asset reference
    // Use a transaction to first unset the existing reference and then set the new one
    await client
      .patch(documentId)
      .set({
        [fieldName]: {
          _type: 'image',
          asset: {
            _ref: imageAsset._id,
            _type: 'reference'
          }
        }
      })
      .commit({ autoGenerateArrayKeys: true });

    return NextResponse.json({ imageAsset, message: 'Image uploaded successfully' });
  } catch (error) {
    console.error('Error uploading image', error);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
