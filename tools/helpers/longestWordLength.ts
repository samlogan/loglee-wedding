import stringClean from './stringClean';

/**
 * The number of characters in the longest word of a piece of text — markup and Sanity's stega
 * payload removed first, so neither counts as letters.
 *
 * For headings set so large that one word can outgrow its column: the stylesheet caps the size so
 * that word fits on a line rather than breaking mid-word ("WEEKEN / D"). Words are split on
 * whitespace; hyphenated compounds count as one, since the browser keeps them together unless it
 * has to break.
 */
const longestWordLength = (text?: string | null): number => {
  const plain = stringClean(text ?? '').replaceAll(/<[^>]*>/g, ' ');

  return plain.split(/\s+/).reduce((longest, word) => Math.max(longest, word.length), 0);
};

export default longestWordLength;
