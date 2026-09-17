import { describe, expect, it } from 'vitest';

import resolveAmountCopy, {
  AMOUNT_MARK,
  AMOUNT_PLACEHOLDER,
  containsAmountToken,
  formatAmount,
  substituteAmountToken
} from './amountToken';
import type { ContributionFields } from './amountToken';

/** A block whose children are given as `[text, marks]` pairs, so a marked run is one line to write. */
const block = (...children: ([string] | [string, string[]])[]): SanityTextBlock => ({
  _key: 'b1',
  _type: 'block',
  markDefs: [],
  style: 'normal',
  children: children.map(([text, marks], index) => ({
    _key: `c${index}`,
    _type: 'span',
    marks: marks ?? [],
    text
  }))
});

/** The rendered text of a block, marks discarded — what a reader actually sees. */
const plain = (blocks?: SanityTextBlock[] | null) =>
  (blocks ?? []).map((b) => (b.children ?? []).map((c) => c.text ?? '').join('')).join('\n');

/** Every child carrying the amount decorator, across every block. */
const tokens = (blocks?: SanityTextBlock[] | null) =>
  (blocks ?? []).flatMap((b) => (b.children ?? []).filter((c) => c.marks?.includes(AMOUNT_MARK)));

const STAY_COPY = 'We’d be grateful for a contribution of {amount} per room, per night.';
const STAY_COPY_WITHOUT =
  'We’d be grateful for a contribution towards the rooms if you are able to — just let us know.';

describe('formatAmount', () => {
  it('renders a whole number with no cents', () => {
    // The ordinary case. "$120.00" reads as a price list; the design draws a bare figure.
    expect(formatAmount(120)).toBe('$120');
    expect(formatAmount(0)).toBe('$0');
  });

  it('renders cents when there are cents', () => {
    /*
     * `minimumFractionDigits: 0` alone gives "$120.5" — `Intl` drops the trailing zero — which is
     * why the digit count is chosen from the value rather than fixed.
     */
    expect(formatAmount(120.5)).toBe('$120.50');
    expect(formatAmount(0.5)).toBe('$0.50');
  });

  it('rounds to cents and groups thousands', () => {
    expect(formatAmount(120.456)).toBe('$120.46');
    expect(formatAmount(1200)).toBe('$1,200');
  });

  it('uses a bare dollar sign, not the international form', () => {
    /*
     * Pinned because the locale is the thing that decides it: `Intl` formats AUD as "A$120" under
     * `en-US`, and the design draws "$" (node 1:675). If this ever fails, the locale constant moved
     * or the runtime's ICU data did — not the amount.
     */
    expect(formatAmount(120).startsWith('$')).toBe(true);
  });
});

describe('containsAmountToken', () => {
  it('finds the placeholder wherever it sits', () => {
    expect(containsAmountToken([block([STAY_COPY])])).toBe(true);
    // Split across children — a placeholder typed inside a bold run is its own child.
    expect(containsAmountToken([block(['A contribution of '], [AMOUNT_PLACEHOLDER, ['strong']])])).toBe(true);
    // Second block only.
    expect(containsAmountToken([block(['No figure here.']), block([STAY_COPY])])).toBe(true);
  });

  it('is false for copy that never names one, and for the empty shapes', () => {
    expect(containsAmountToken([block(['No figure here.'])])).toBe(false);
    expect(containsAmountToken([])).toBe(false);
    expect(containsAmountToken(null)).toBe(false);
    expect(containsAmountToken(undefined)).toBe(false);
  });
});

describe('substituteAmountToken', () => {
  it('splits the sentence around the figure and marks only the figure', () => {
    const [result] = substituteAmountToken([block([STAY_COPY])], '$120');

    expect(plain([result])).toBe('We’d be grateful for a contribution of $120 per room, per night.');
    // Three children: the text before, the token, the text after. The token is the middle one.
    expect(result.children).toHaveLength(3);
    expect(result.children[1].text).toBe('$120');
    expect(result.children[1].marks).toEqual([AMOUNT_MARK]);
    // The surrounding halves are *not* marked — the highlight is the figure, not the sentence.
    expect(result.children[0].marks).toEqual([]);
    expect(result.children[2].marks).toEqual([]);
  });

  it('keeps the marks the placeholder already carried', () => {
    /*
     * A placeholder typed inside a bold run has to stay bold *and* become a chip. Replacing the
     * marks array rather than appending to it would silently un-bold the editor's sentence.
     */
    const [result] = substituteAmountToken([block(['of '], [AMOUNT_PLACEHOLDER, ['strong', 'em']])], '$120');
    const [token] = tokens([result]);

    expect(token.marks).toEqual(['strong', 'em', AMOUNT_MARK]);
  });

  it('replaces every occurrence, not just the first', () => {
    /*
     * Replacing only the first would publish a literal "{amount}" the moment an editor repeats it —
     * the one outcome of the three that is visibly broken rather than merely unexpected.
     */
    const [result] = substituteAmountToken(
      [block([`${AMOUNT_PLACEHOLDER} a night, so ${AMOUNT_PLACEHOLDER} total`])],
      '$120'
    );

    expect(plain([result])).toBe('$120 a night, so $120 total');
    expect(tokens([result])).toHaveLength(2);
    expect(containsAmountToken([result])).toBe(false);
  });

  it('handles a placeholder at either end without emitting an empty span', () => {
    const [leading] = substituteAmountToken([block([`${AMOUNT_PLACEHOLDER} per night`])], '$120');
    const [trailing] = substituteAmountToken([block([`from ${AMOUNT_PLACEHOLDER}`])], '$120');
    const [alone] = substituteAmountToken([block([AMOUNT_PLACEHOLDER])], '$120');

    expect(leading.children).toHaveLength(2);
    expect(trailing.children).toHaveLength(2);
    expect(alone.children).toHaveLength(1);
    expect(plain([alone])).toBe('$120');
  });

  it('gives every produced child a distinct key', () => {
    /*
     * React keys the spans PortableText renders, and every fragment here descends from one original
     * `_key`. Two fragments sharing it is a duplicate-key warning and undefined reconciliation.
     */
    const [result] = substituteAmountToken([block([`a ${AMOUNT_PLACEHOLDER} b ${AMOUNT_PLACEHOLDER} c`])], '$120');
    const keys = (result.children ?? []).map((child) => child._key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('returns untouched blocks by identity', () => {
    // The common case allocates nothing, so React sees the same objects it saw before.
    const untouched = block(['Nothing to substitute.']);
    const [result] = substituteAmountToken([untouched], '$120');

    expect(result).toBe(untouched);
  });

  it('leaves a non-block member alone', () => {
    // An image or a divider has no `children` to walk; it must survive rather than be dropped.
    const image = { _key: 'i', _type: 'blockContentImage' } as unknown as SanityTextBlock;
    expect(substituteAmountToken([image, block([STAY_COPY])], '$120')[0]).toBe(image);
  });
});

describe('resolveAmountCopy', () => {
  const withAmount = [block([STAY_COPY])];
  const withoutAmount = [block([STAY_COPY_WITHOUT])];
  const base: ContributionFields = {
    amountPerNight: 120,
    copyWithAmount: withAmount,
    copyWithoutAmount: withoutAmount
  };

  it('substitutes the figure when the toggle is on', () => {
    const copy = resolveAmountCopy({ ...base, showAmount: true });

    expect(plain(copy)).toBe('We’d be grateful for a contribution of $120 per room, per night.');
    expect(tokens(copy)).toHaveLength(1);
  });

  it('uses the amount-free copy when the toggle is off', () => {
    // `showAmount` has `initialValue: false`, so this is the default state of a fresh document.
    expect(resolveAmountCopy({ ...base, showAmount: false })).toBe(withoutAmount);
    expect(resolveAmountCopy(base)).toBe(withoutAmount);
  });

  it('falls back when the toggle is on but no figure is set', () => {
    /*
     * The case the ticket names. Rendering the with-amount copy would publish "…a contribution of
     * {amount} per room", so the sentence that was written to read without a figure wins.
     */
    expect(resolveAmountCopy({ ...base, amountPerNight: undefined, showAmount: true })).toBe(withoutAmount);
    expect(resolveAmountCopy({ ...base, amountPerNight: null as unknown as number, showAmount: true })).toBe(
      withoutAmount
    );
    expect(resolveAmountCopy({ ...base, amountPerNight: Number.NaN, showAmount: true })).toBe(withoutAmount);
  });

  it('treats a negative figure as no figure', () => {
    /*
     * `Rule.min(0)` is enforced at publish, not in a draft, and "-$50" mid-sentence is worse than
     * the fallback.
     */
    expect(resolveAmountCopy({ ...base, amountPerNight: -50, showAmount: true })).toBe(withoutAmount);
  });

  it('treats zero as a real figure', () => {
    /*
     * `0` is falsy, so a truthiness test here would route a deliberate zero to the amount-free copy
     * — and `Rule.min(0)` in the schema explicitly permits it.
     */
    const copy = resolveAmountCopy({ ...base, amountPerNight: 0, showAmount: true });

    expect(plain(copy)).toBe('We’d be grateful for a contribution of $0 per room, per night.');
    expect(tokens(copy)).toHaveLength(1);
  });

  it('renders with-amount copy that never names a figure, rather than discarding it', () => {
    /*
     * The toggle is on, no figure is set, and the copy has no placeholder — so it reads perfectly
     * well as written and there is nothing to substitute. Falling back here would throw away copy
     * for no reason; appending the figure somewhere would put it where the editor did not ask.
     */
    const noPlaceholder = [block(['We’d be grateful for a contribution towards the rooms.'])];

    expect(
      resolveAmountCopy({ copyWithAmount: noPlaceholder, copyWithoutAmount: withoutAmount, showAmount: true })
    ).toBe(noPlaceholder);
  });

  it('shows no figure when the copy names none but one is set', () => {
    // Same reasoning from the other side: the field is where an editor says *where* the figure goes.
    const noPlaceholder = [block(['We’d be grateful for a contribution towards the rooms.'])];
    const copy = resolveAmountCopy({ amountPerNight: 120, copyWithAmount: noPlaceholder, showAmount: true });

    expect(plain(copy)).toBe('We’d be grateful for a contribution towards the rooms.');
    expect(tokens(copy)).toHaveLength(0);
  });

  it('falls back when the with-amount copy is blank or merely emptied', () => {
    /*
     * An editor who flips the toggle on has not written the other field yet. The second case is the
     * one `.length` gets wrong: typing into a rich-text field and deleting leaves one block holding
     * an empty child, which Sanity does not unset.
     */
    expect(resolveAmountCopy({ ...base, copyWithAmount: undefined, showAmount: true })).toBe(withoutAmount);
    expect(resolveAmountCopy({ ...base, copyWithAmount: [], showAmount: true })).toBe(withoutAmount);
    expect(resolveAmountCopy({ ...base, copyWithAmount: [block(['   '])], showAmount: true })).toBe(withoutAmount);
  });

  it('returns undefined rather than null when there is no copy at all', () => {
    // GROQ returns `null` for an unset field; normalising means a caller's `?? fallback` fires.
    expect(resolveAmountCopy(undefined)).toBeUndefined();
    expect(resolveAmountCopy(null)).toBeUndefined();
    expect(resolveAmountCopy({ copyWithoutAmount: null as unknown as undefined, showAmount: true })).toBeUndefined();
  });
});
