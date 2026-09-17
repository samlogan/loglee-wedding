import fixtures from './fixtures';

/**
 * Storybook image fixture, backed by real Sanity assets.
 *
 * This used to hand back a `picsum.photos` URL, which rendered nothing. `ImageSanity` resolves
 * through `useNextSanityImage`, and that builds a URL from a *Sanity asset reference* — given a
 * foreign domain it produces no `src`, so the component fell through to `assets/images/fallback.png`.
 * That file is a **1×1 transparent PNG**, so every mock image in Storybook rendered as an invisible
 * one-pixel dot: Avatar, Card, Header and Footer all looked like they had no image support, because
 * effectively they did not.
 *
 * The committed section fixtures already contain real Sanity assets, each with the `_id`, `url` and
 * `metadata` the image pipeline needs. Borrowing from that pool means a component story exercises
 * exactly the same resolution path as production rather than an approximation of it, and needs no
 * network beyond the Sanity CDN the real site already uses.
 *
 * Refresh the pool with `yarn storybook:fixtures`.
 */

interface PoolAsset {
  _id: string;
  url: string;
  altText?: string;
  metadata?: { dimensions?: { width: number; height: number }; lqip?: string };
}

/**
 * Walk the fixture tree and collect everything that is a Sanity **image** asset.
 *
 * Keyed on `_id` starting with `image-` rather than on the URL host. A Sanity *file* asset also
 * lives on `cdn.sanity.io` and carries `_id` + `url`, but its id looks like `file-<hash>-pdf`, and
 * `next-sanity-image` derives dimensions by splitting the id on `-` — a file asset yields `NaN`
 * width and height rather than failing cleanly.
 */
const collect = (node: unknown, out: Map<string, PoolAsset>) => {
  if (!node || typeof node !== 'object') {
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      collect(item, out);
    }
    return;
  }
  const candidate = node as Partial<PoolAsset>;
  if (candidate._id?.startsWith('image-') && typeof candidate.url === 'string') {
    out.set(candidate._id, candidate as PoolAsset);
  }
  for (const value of Object.values(node)) {
    collect(value, out);
  }
};

/**
 * Two pools, because the two kinds are not interchangeable in either direction.
 *
 * Typically every SVG in a dataset is a logo, badge or icon and every raster is a photograph.
 * Handing a card or an avatar a logo is wrong; handing an award badge or a brand icon a photograph
 * of a person is just as wrong, and more obviously so. An earlier version excluded SVGs outright and
 * every badge and icon slot in the library filled with stock photography.
 *
 * Sorted so pool order does not depend on object key iteration, which keeps a given seed on a given
 * image across runs and makes visual diffs meaningful.
 */
const [photos, logos] = (() => {
  const found = new Map<string, PoolAsset>();
  collect(fixtures, found);
  const all = [...found.values()].toSorted((a, b) => a._id.localeCompare(b._id));
  return [all.filter((a) => !a.url.endsWith('.svg')), all.filter((a) => a.url.endsWith('.svg'))];
})();

/**
 * Say so when a pool is empty rather than failing into the placeholder silently.
 *
 * An empty pool returns the no-asset fallback for every call, which renders as the grey block that
 * `.storybook/main.ts` documents as meaning "this image genuinely failed to resolve". Without this
 * warning a project whose logos happen to be PNG (so `logos` is empty) would show every `kind:
 * 'logo'` slot as a false positive, with nothing anywhere explaining it.
 */
if (typeof console !== 'undefined' && (photos.length === 0 || logos.length === 0)) {
  const empty = [photos.length === 0 && 'photo', logos.length === 0 && 'logo'].filter(Boolean).join(' and ');
  const reason =
    photos.length === 0 && logos.length === 0
      ? // Expected right after `/project-setup`, which deletes every placeholder section: no sections
        // means no fixtures means no pool. Say so, rather than implying something is broken.
        'There are no section fixtures yet. That is normal on a new project — build a section, publish an instance, then run `yarn storybook:fixtures`.'
      : // One pool empty and the other not means the dataset genuinely has no assets of that shape.
        'The dataset has no assets of that kind. The split is SVG (logo) vs raster (photo), which may not match how this project stores its marks.';
  // eslint-disable-next-line no-console -- a silent empty pool is indistinguishable from a broken image
  console.warn(`mockImage: the ${empty} pool is empty, so those stories render the grey placeholder. ${reason}`);
}

/**
 * A raw Sanity CDN URL from the pool, for the rare story that takes a plain `src` rather than a
 * Sanity asset object.
 *
 * Sourced from the connected dataset like everything else here, so it works in this boilerplate and
 * in every project built from it. A hardcoded URL would 404 everywhere but the one dataset it came
 * from, and an external host (picsum and friends) puts a third-party request in a client-facing
 * Storybook.
 *
 * Falls back to the local Storybook placeholder when there are no fixtures yet — the normal state of
 * a project that has not built a section.
 */
export const mockImageUrl = (options: { seed?: string; kind?: 'photo' | 'logo' } = {}): string => {
  const pool = options.kind === 'logo' ? logos : photos;
  return pool.length ? pool[hash(options.seed ?? 'mock') % pool.length].url : '/image-placeholder.png';
};

/** Small deterministic string hash, so the same seed always resolves to the same image. */
const hash = (value: string) => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    /*
     * `>>> 0` is load-bearing and must not be "fixed". It coerces each step to an unsigned 32-bit
     * integer, which is what keeps the result non-negative. The linter flags this (`no-bitwise`,
     * `unicorn/prefer-math-trunc`) and suggests `Math.trunc()`, which is NOT equivalent, because
     * `Math.imul` returns a *signed* 32-bit integer. For the seed `card-avatar-3` the two differ:
     * `>>> 0` gives a positive integer, `Math.trunc` gives a negative one. The only consumer is
     * `shortlist[hash(seed) % shortlist.length]`, and a negative hash makes that a negative index —
     * `undefined`, i.e. every mock image silently falls back to the placeholder.
     */
    // eslint-disable-next-line no-bitwise, unicorn/prefer-math-trunc
    h = (Math.imul(h, 31) + (value.codePointAt(i) ?? 0)) >>> 0;
  }
  return h;
};

const ratioOf = (asset: PoolAsset) => {
  const d = asset.metadata?.dimensions;
  return d && d.height ? d.width / d.height : 1;
};

interface MockImageOptions {
  width?: number;
  height?: number;
  altText?: string;
  aspectRatio?: SanityAspectRatio;
  seed?: string;
  /**
   * `photo` for anything depicting the world — cards, avatars, gallery frames, hero imagery.
   * `logo` for marks: award badges, partner logos, brand icons. Pass it whenever the slot holds a
   * mark, or the story will show a photograph of somebody where a badge belongs.
   */
  kind?: 'photo' | 'logo';
}

const mockImage = (options: MockImageOptions = {}): SanityImageAdvanced => {
  const {
    width = 1200,
    height = 800,
    altText = 'Placeholder image',
    aspectRatio = 'natural',
    seed = 'mock',
    kind = 'photo'
  } = options;
  const pool = kind === 'logo' ? logos : photos;

  // `width`/`height` are advisory — they pick an asset shaped like the one the caller wanted rather
  // than dictating pixels, so a square avatar does not get handed a 3:2 landscape.
  const wanted = height ? width / height : 1;
  const ranked = [...pool].toSorted((a, b) => Math.abs(ratioOf(a) - wanted) - Math.abs(ratioOf(b) - wanted));
  // Choose from the closest third, so repeated seeds still vary instead of every 1:1 request
  // returning the same photograph.
  const shortlist = ranked.slice(0, Math.max(1, Math.ceil(ranked.length / 3)));
  const asset = shortlist.length ? shortlist[hash(seed) % shortlist.length] : undefined;

  if (!asset) {
    /*
     * No fixtures on disk, or an empty pool (warned about above) — the normal state of a project
     * that has not built a section yet.
     *
     * `url` must be non-empty. `components/Image/index.tsx` early-returns `null` when `asset?.url`
     * is falsy, which is right in production — a broken image should occupy nothing — but in
     * Storybook it renders an entirely blank story, which is the invisible-image problem this helper
     * exists to remove, just in a new disguise.
     *
     * With a truthy url the chain proceeds: `useNextSanityImage` finds no asset reference and
     * returns null, so `ImageSanity` falls through to its `fallback` prop — and `.storybook/main.ts`
     * aliases `assets/images/fallback.png` to a visible grey block for Storybook only. The result is
     * a grey placeholder that reads as "no image resolved", which is exactly what happened.
     */
    return {
      asset: {
        _id: undefined,
        url: '/image-placeholder.png',
        altText,
        metadata: { dimensions: { width, height }, lqip: undefined }
      },
      altText,
      aspectRatio
    } as unknown as SanityImageAdvanced;
  }

  return {
    asset: { ...asset, altText: asset.altText ?? altText },
    altText,
    aspectRatio
  } as SanityImageAdvanced;
};

export default mockImage;
