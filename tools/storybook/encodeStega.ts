import { stegaEncodeSourceMap } from '@sanity/client/stega';
import type { ContentSourceMap } from '@sanity/client/stega';

/**
 * A plain string as `sanityFetch` delivers it in draft mode — for a test or a story that has to
 * reproduce what the Presentation tool ("Visual Editor" in this Studio) hands a component.
 *
 *   encodeStega('', "$['rsvpLabel']")   // non-empty, and `.trim()` leaves it that way
 *
 * Encoded by the installed client rather than hand-typed as a run of zero-width characters, so
 * everything built on it follows whatever `@sanity/client` emits, not whatever it emitted when the
 * test was written. `stegaEncodeSourceMap` is what the client runs over a query result when stega is
 * on, and this is the smallest source map it acts on: one value, traced back to `path` on the draft
 * `weddingSettings` singleton.
 *
 * `path` is the source field in the source map's own form — `"$['venue']['name']"` — and it is what
 * the payload records, so each caller names the field its value stands in for. The document is fixed
 * because every field this stands in for lives on that singleton, and nothing a caller asserts
 * depends on which document it is.
 *
 * What a caller can rely on, and the reason the tests need a real payload rather than a stand-in: it
 * is appended after the text, blank values included; `.trim()` removes none of it; and `stegaClean`
 * recovers the original exactly.
 *
 * Here rather than in `tools/helpers/` because it is test support, not application code: this folder
 * is where that lives — every story is a component test — and it builds data the way the app receives
 * it, as the `mock*` helpers beside it do. Not a `*.test.ts`, so the `unit` project imports it rather
 * than collecting it.
 */
const encodeStega = (value: string, path: string): string => {
  const resultSourceMap: ContentSourceMap = {
    documents: [{ _id: 'drafts.weddingSettings', _type: 'weddingSettings' }],
    paths: [path],
    mappings: { "$['value']": { type: 'value', source: { type: 'documentValue', document: 0, path: 0 } } }
  };

  return stegaEncodeSourceMap({ value }, resultSourceMap, { enabled: true, studioUrl: '/studio' }).value;
};

export default encodeStega;
