/*
 * Strips h1–h6 and span tags from an html string.
 *
 * `.replaceAll` is ES2021 against an ES2017 target, but it stays: oxlint's
 * `unicorn/prefer-string-replace-all` auto-fixes `.replace(/…/g, …)` back to it, so `yarn fix`
 * silently undoes the hand edit. See the longer note in `tools/helpers/stripTitleTags.ts`.
 */
const stripTitleTags = (value = '') => value.replaceAll(/<(h[1-6]|span)>|<\/(h[1-6]|span)>/g, '');

export default stripTitleTags;
