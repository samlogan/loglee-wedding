import { stegaClean } from '@sanity/client/stega';

/**
 * Does this plain-string field actually have anything in it?
 *
 * `Boolean(value?.trim())` is the obvious test, and it is right everywhere except the one view an
 * editor checks their work in. In draft mode — which the Presentation tool ("Visual Editor" in this
 * Studio) turns on — `sanityFetch` asks the client for stega: a run of invisible characters appended
 * to every plain string the client can map back to a document field, carrying the edit link the
 * overlay reads. Blank strings are not exempt. The encoder's default filter passes over dates, URLs
 * and structural field names, never over an empty or whitespace-only value, so a field left as `''`
 * or `'   '` arrives as that plus the payload, and `.trim()` does not remove the payload. The naive
 * test says `true`, and a section draws its chrome around a value the editor can see is blank — in
 * `components/Footer`, the date line's separator with nothing after it.
 *
 * So the test runs over a `stegaClean` copy, and only the answer comes back. The caller keeps
 * rendering the original, still-encoded string: clean *that* and the text on screen loses its edit
 * link, and the overlay stops working on it.
 *
 * Plain strings only. `TitleInput` markup is `hasTitleText`'s question and Portable Text is
 * `hasBlockContent`'s — and the same encoding reaches both. Nor is `stringClean` a substitute: it
 * strips every non-ASCII character rather than the encoding, so `'café'` comes back `'caf'` and a
 * value written wholly outside ASCII comes back blank.
 */
const hasText = (value?: string | null): boolean => Boolean(stegaClean(value ?? '').trim());

export default hasText;
