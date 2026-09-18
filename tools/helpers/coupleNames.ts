import hasText from './hasText';

/**
 * `weddingSettings.coupleNames` as a GROQ projection delivers it: each half independently optional,
 * and `null` rather than absent when unset.
 *
 * Declared here rather than imported from the schema, which already depends on `tools/helpers` and
 * not the other way round. `IWeddingSettingsDocument['coupleNames']` is assignable to it.
 */
export interface CoupleNamesFields {
  partnerOne?: string | null;
  partnerTwo?: string | null;
}

/**
 * The names used when neither half is filled in.
 *
 * Not a placeholder to be replaced later — it is the correct answer, and the reason the pages that
 * read the CMS for the names can afford to. `weddingSettings` is a singleton with no `initialValue`
 * on either name, so "published but empty" is a reachable state, and both of this helper's callers
 * have a worse failure than a hard-coded name: the thank-you page would sign off "With love, " and
 * the home hero would publish a page with no `<h1>`.
 *
 * Two names rather than one joined string, so the hero can stack the fallback exactly as it stacks
 * real names and the joined form below cannot disagree with it.
 */
const FALLBACK_PARTNERS = ['Sam', 'Lauren'] as const;

/**
 * The partners to show, in order: whichever of the two an editor has filled in, or both fallback
 * names when neither is.
 *
 * For a caller that lays the names out itself — the home hero stacks them one per line, with the
 * ampersand on the first — rather than printing them as one string.
 *
 * ## Blank is `hasText`'s answer, not `.trim()`'s
 *
 * In the Presentation tool a blank name arrives stega-encoded: a run of invisible characters that a
 * plain `.trim()` reads as a name. The previous inline version tested exactly that way, so an editor
 * who cleared one partner in a draft saw "Sam & " — the dangling ampersand this helper exists to
 * prevent, in the one view they check their work in. `hasText` tests a `stegaClean` copy.
 *
 * What comes back is the original string, trimmed but still encoded, so the overlay keeps its edit
 * link on the text on screen. Trimming cannot eat that link: the payload is appended after the text
 * and ends in U+200C, which `String.prototype.trim` does not treat as white space.
 */
export const couplePartners = (names?: CoupleNamesFields | null): string[] => {
  const filled = [names?.partnerOne, names?.partnerTwo]
    .filter((name): name is string => hasText(name))
    .map((name) => name.trim());

  return filled.length > 0 ? filled : [...FALLBACK_PARTNERS];
};

/**
 * Both partners as one line, joined the way the Studio joins them — "Sam & Lauren", or one name
 * alone with no ampersand.
 *
 * The ` & ` is lifted from `weddingSettings`'s own `preview.prepare`, so an editor looking at the
 * singleton in the Studio sees the same string the site prints.
 */
const coupleNames = (names?: CoupleNamesFields | null): string => couplePartners(names).join(' & ');

export default coupleNames;
