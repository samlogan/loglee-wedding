import type { TextProps } from '@/components/Text';

// Strips h1, h2, h3, h4, h5, h6 & span tags from html string
const stripTitleTags = (value = ''): { text: string; as: TextProps['as'] } => {
  if (!value) {
    return {
      as: 'h2',
      text: ''
    };
  }

  // Regular expression to find the opening tag
  const openingTagRex = /<(h[1-6]|span)>/;
  const match = value.match(openingTagRex);

  /*
   * Extract the text without tags.
   *
   * `.replaceAll` is ES2021 and `tsconfig` targets ES2017, so on a strict reading this should be
   * `.replace` with the `g` flag. It cannot be: oxlint's `unicorn/prefer-string-replace-all` is an
   * **auto-fix** rule, so `yarn fix` rewrites `.replace(/…/g, …)` straight back. Changing it by hand
   * and then running the verification command undoes the change silently — which is exactly what
   * happened the first time this was "fixed".
   *
   * So the rule is the project's real position and the ES2017 target is the stale half. Left as the
   * linter wants it. `String.prototype.replaceAll` has shipped everywhere since 2020, so nothing in
   * the brief's audience is at risk; the tsconfig target is the thing to settle, not this line.
   */
  const text = value.replaceAll(/<(h[1-6]|span)>|<\/(h[1-6]|span)>/g, '');

  // Extract the tag name from the opening tag, default to 'h2' if not found
  const detectedAs = match?.[1];
  const validAs: TextProps['as'][] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'];
  const isValidAs = detectedAs && validAs.includes(detectedAs as TextProps['as']);
  const as: TextProps['as'] = isValidAs ? (detectedAs as TextProps['as']) : 'h2';
  return {
    as,
    text
  };
};

export default stripTitleTags;
