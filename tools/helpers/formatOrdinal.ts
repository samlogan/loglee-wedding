/**
 * The visible ordinal for the item at `index` in a repeater — `0` → `"01"`, `9` → `"10"`.
 *
 * ## Why this exists rather than a CSS counter
 *
 * `counter-reset` / `content: counter(…)` is the obvious way to number a list from its position, and
 * it is the wrong one here. Generated `content` **is** exposed in the accessibility tree by the
 * CSSOM-AAM mapping and is announced by NVDA and JAWS, so a counter on an `<ol role="list">` — which
 * already announces "1 of 4" from `posinset` — gives a screen-reader user the position twice, with
 * no attribute that can suppress one of them. A real element carrying the string can take
 * `aria-hidden`, which is what `TwoColumnListSection` does. `ScheduleSection`'s bracket spans are
 * the same decision for the same reason.
 *
 * The other half of it is that the numbering is then *testable*: a story can assert the rendered
 * text, where a counter is only visible to `getComputedStyle(el, '::before').content`.
 *
 * ## The contract, stated once because three sections depend on it
 *
 * `index` is the **zero-based** array index — the second argument of `Array.prototype.map` — and the
 * returned string is **one-based**. Passing `index + 1` is the mistake this signature exists to make
 * obvious, and it silently produces a list that starts at 02.
 *
 *   items.map((item, index) => <li>{formatOrdinal(index)}</li>)   // 01, 02, 03 …
 *
 * `minimumDigits` pads with leading zeroes and never truncates: a list that runs past 99 renders
 * "100" rather than "00". Zero-padding to two is what the design draws in all three places that use
 * this (the dress-code list, the numbered grid, the FAQ index), so it is the default rather than a
 * parameter every caller has to remember.
 *
 * ## Degenerate inputs
 *
 * Nothing that comes out of `map` can be negative, fractional or `NaN`, so the guards below are for
 * a caller that computed the index rather than received it. They resolve to the first position
 * instead of rendering "00" or "NaN" — a wrong number is a smaller failure than a number-shaped
 * string that is not a number, and both are caught by the tests rather than left to the page.
 */
const formatOrdinal = (index: number, minimumDigits = 2): string => {
  const position = Number.isFinite(index) ? Math.max(0, Math.trunc(index)) + 1 : 1;
  const width = Number.isFinite(minimumDigits) ? Math.max(1, Math.trunc(minimumDigits)) : 2;

  // `padStart` is ES2017, which is this project's `target` — no polyfill and no downlevel helper.
  return String(position).padStart(width, '0');
};

export default formatOrdinal;
