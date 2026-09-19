/**
 * Fills the three image carousels from the media library's most recent uploads:
 *
 *   - the home page gets an Image Carousel section, just before its closing CTA (or at the end);
 *   - Sam's and Lauren's player documents get the same images in their Gallery tab.
 *
 *     yarn tsx tools/sanity/scripts/seed-image-carousels.ts            # 18 images
 *     yarn tsx tools/sanity/scripts/seed-image-carousels.ts --count=12
 *
 * Everything is written to **drafts** — nothing is published. Review the three documents in the
 * Studio and publish them from there.
 *
 * Safe to run again: the home page's carousel is found by its fixed `_key` and its images replaced,
 * rather than a second section being added, and the galleries are replaced whole.
 *
 * Reads `.env.development` for the project, dataset and `SANITY_WRITE_TOKEN`.
 */
import { randomUUID } from 'node:crypto';

import { createClient } from '@sanity/client';
import type { SanityClient, SanityDocument } from '@sanity/client';

try {
  process.loadEnvFile('.env.development');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw error;
  }
}

const HOME_CAROUSEL_KEY = 'latest-uploads-carousel';
const PLAYER_SLUGS = ['sam', 'lauren'];

const countArg = process.argv.find((arg) => arg.startsWith('--count='));
const COUNT = countArg ? Number(countArg.split('=')[1]) : 18;

const {
  NEXT_PUBLIC_SANITY_DATASET: dataset,
  NEXT_PUBLIC_SANITY_PROJECT_ID: projectId,
  SANITY_WRITE_TOKEN: token
} = process.env;

if (!(projectId && dataset && token)) {
  console.error('Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and SANITY_WRITE_TOKEN.');
  process.exit(2);
}

if (!(Number.isInteger(COUNT) && COUNT > 0)) {
  console.error(`--count must be a positive whole number, got ${countArg}.`);
  process.exit(2);
}

const client = createClient({ apiVersion: '2024-01-01', dataset, projectId, token, useCdn: false });

interface Asset {
  _id: string;
  altText?: string;
  originalFilename?: string;
}

/** An `imageElementSimple` pointing at the asset, with a fresh `_key` for the array. */
const toImage = (asset: Asset) => ({
  _key: randomUUID().slice(0, 12),
  _type: 'imageElementSimple',
  ...(asset.altText ? { altText: asset.altText } : {}),
  asset: { _ref: asset._id, _type: 'reference' }
});

/**
 * The draft to edit: the existing draft if there is one, otherwise a new draft copied from the
 * published document — so the edit lands where the Studio shows it, and publishing is the editor's.
 */
const ensureDraft = async (sanity: SanityClient, publishedId: string): Promise<string> => {
  const draftId = `drafts.${publishedId}`;
  const existing = await sanity.getDocument(draftId);

  if (!existing) {
    const published = await sanity.getDocument<SanityDocument>(publishedId);
    if (!published) {
      throw new Error(`No document ${publishedId}.`);
    }
    const { _createdAt, _rev, _updatedAt, ...fields } = published;
    await sanity.createIfNotExists({ ...fields, _id: draftId });
  }

  return draftId;
};

const main = async () => {
  const assets = await client.fetch<Asset[]>(
    `*[_type == "sanity.imageAsset"] | order(_createdAt desc)[0...$count]{ _id, altText, originalFilename }`,
    { count: COUNT }
  );

  if (assets.length === 0) {
    console.error('The media library has no images.');
    process.exit(1);
  }

  console.log(`Using the ${assets.length} most recent uploads:`);
  for (const asset of assets) {
    console.log(`  ${asset.originalFilename ?? asset._id}`);
  }

  // --- Home page -------------------------------------------------------------------------------

  const home = await client.fetch<{ _id: string } | null>(`*[_type == "page" && pathname == "/"][0]{ _id }`);
  if (!home) {
    throw new Error('No page with pathname "/".');
  }

  const homeDraft = await ensureDraft(client, home._id.replace(/^drafts\./, ''));
  const sections = await client.fetch<{ _key: string; _type: string }[]>(`*[_id == $id][0].sections[]{ _key, _type }`, {
    id: homeDraft
  });
  const images = assets.map(toImage);

  if (sections?.some((section) => section._key === HOME_CAROUSEL_KEY)) {
    await client
      .patch(homeDraft)
      .set({ [`sections[_key=="${HOME_CAROUSEL_KEY}"].images`]: images })
      .commit();
    console.log(`\nHome page: replaced the carousel's images (draft ${homeDraft}).`);
  } else {
    const carousel = { _key: HOME_CAROUSEL_KEY, _type: 'imageCarouselSection', images, speed: 'medium' };
    const closing = sections?.find((section) => section._type === 'closingCtaSection');
    const patch = client.patch(homeDraft).setIfMissing({ sections: [] });

    await (
      closing
        ? patch.insert('before', `sections[_key=="${closing._key}"]`, [carousel])
        : patch.insert('after', 'sections[-1]', [carousel])
    ).commit();
    console.log(
      `\nHome page: added an Image Carousel ${closing ? 'before the closing CTA' : 'at the end'} (draft ${homeDraft}).`
    );
  }

  // --- Players ---------------------------------------------------------------------------------

  const players = await client.fetch<{ _id: string; slug: string }[]>(
    `*[_type == "player" && slug.current in $slugs && !(_id in path("drafts.**"))]{ _id, "slug": slug.current }`,
    { slugs: PLAYER_SLUGS }
  );

  for (const slug of PLAYER_SLUGS) {
    const player = players.find((entry) => entry.slug === slug);
    if (!player) {
      console.warn(`No published player with slug "${slug}" — skipped.`);
      continue;
    }

    const draft = await ensureDraft(client, player._id);
    await client
      .patch(draft)
      .set({ gallery: assets.map(toImage) })
      .commit();
    console.log(`${slug}: gallery set (draft ${draft}).`);
  }

  console.log('\nNothing is published. Review the three drafts in the Studio and publish them.');
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
