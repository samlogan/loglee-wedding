import type { IWeddingSettingsDocument } from '@/tools/sanity/schema/documents/weddingSettings';

import hasBlockContent from './hasBlockContent';

/**
 * The `{amount}` contract between `weddingSettings.contribution` and its one renderer,
 * `sections/TwoColumnListSection`.
 *
 * The Studio tells an editor, verbatim: *'Write "{amount}" where the figure belongs — it is swapped
 * in mid-sentence as a highlighted token.'* That sentence is the whole specification, and until this
 * file existed it was documented **only** in a field description — nothing in the codebase read it.
 *
 * ## Why this is a Portable Text walk and not a string replace
 *
 * `copyWithAmount` is `blockContentStandard`, so the placeholder can sit in any block, in any child
 * of that block, and with any combination of `strong` / `em` / `underline` / a link annotation
 * already on it. A `JSON.stringify` → replace → parse round trip would find it, and would also
 * corrupt any copy that happened to contain the same literal inside a URL or a `_key`. Splitting the
 * one child that holds it keeps every mark on both halves of the sentence and touches nothing else.
 *
 * The substituted run carries the decorator `AMOUNT_MARK` **on top of** whatever marks the child
 * already had, so a placeholder typed inside a bold run stays bold and becomes a chip. It is a
 * decorator rather than an annotation, so it needs no `markDefs` entry — `@portabletext/react` looks
 * a mark up in `markDefs` first and falls through to `components.marks[name]` when there is no
 * match, which is exactly the path `components/TextBlock` registers it on.
 *
 * ## Why the copy is *chosen* here too
 *
 * The schema ships two copy fields rather than one field and a hidden span, precisely so the
 * sentence still reads when no figure is named. Which of them to render is therefore part of the
 * same contract as the substitution, and splitting the two would leave the interesting half — every
 * degenerate combination below — in a section component where a story cannot assert it well. Pure
 * transforms belong in `tools/`, where they get a unit test.
 */

/** The literal an editor types. Not a regex: `{` and `}` would both need escaping for no gain. */
export const AMOUNT_PLACEHOLDER = '{amount}';

/**
 * The decorator the substituted run carries.
 *
 * Imported by `components/TextBlock` as a computed key on its `marks` registry, so the producer and
 * the renderer cannot drift: renaming this constant renames both ends at once. A name TextBlock did
 * not know would fall through to `@portabletext/react`'s unknown-mark fallback — a `<span
 * class="unknown__pt__mark__…">` and a console warning — which renders the figure as plain text and
 * looks like nothing is wrong.
 */
export const AMOUNT_MARK = 'amountToken';

/**
 * The contribution slice this file needs, taken from the document interface rather than restated.
 *
 * `Partial<>` because a GROQ projection returns a shaped object with `null` leaves for every field
 * an editor has left blank, while the document interface declares `showAmount` required — the same
 * reason `components/Layout` types `weddingSettings` as `Partial<>`. `paymentDetails` is
 * deliberately not in the pick: it is shown only after an RSVP has been submitted and must never
 * reach this section.
 *
 * `import type`, so nothing from the Studio schema module (`sanity`, `react-icons`) is pulled into
 * the node unit test — TypeScript erases the import entirely.
 */
export type ContributionFields = Partial<
  Pick<
    IWeddingSettingsDocument['contribution'],
    'showAmount' | 'amountPerNight' | 'copyWithAmount' | 'copyWithoutAmount'
  >
>;

/*
 * AUD, stated in the schema's own field description ("Contribution per room, per night, in AUD") and
 * restated here rather than made a parameter. A currency prop would be a second place for the answer
 * to live and a way for the two to disagree; a wedding has one bank account.
 *
 * `en-AU` rather than the reader's locale. `Intl` formats AUD as `A$120` under `en-US` and `$120`
 * under `en-AU`, and the design draws a bare `$` (node 1:675). Pinning the locale also keeps this
 * deterministic between the node unit test and the chromium story run.
 */
const AMOUNT_LOCALE = 'en-AU';
const AMOUNT_CURRENCY = 'AUD';

/**
 * `120` → `"$120"`, `120.5` → `"$120.50"`.
 *
 * Cents appear only when there are cents. A fixed two digits would render the ordinary case as
 * "$120.00", which reads as a price rather than as an ask; a fixed zero would round "$120.50" down
 * to "$120" and understate what a guest is being asked for. `minimumFractionDigits: 0` alone does
 * not do it — `Intl` then drops the trailing zero and emits "$120.5" — so the digit count is chosen
 * from the value.
 */
export const formatAmount = (amount: number): string => {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;

  return new Intl.NumberFormat(AMOUNT_LOCALE, {
    currency: AMOUNT_CURRENCY,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    style: 'currency'
  }).format(amount);
};

/** Does any block in this copy still carry the placeholder? */
export const containsAmountToken = (blocks?: SanityTextBlock[] | null): boolean =>
  Boolean(
    blocks?.some(
      (block) => block?._type === 'block' && block.children?.some((child) => child?.text?.includes(AMOUNT_PLACEHOLDER))
    )
  );

/**
 * Replace **every** `{amount}` in `blocks` with `formatted`, marked as the highlighted token.
 *
 * Every, not the first: replacing only the first would leave a literal "{amount}" on the published
 * page the moment an editor repeats it, which is the worst of the three possible behaviours. The
 * other two — render both, or refuse the copy — both keep the page readable, and rendering both is
 * the one that does what the editor typed.
 *
 * Blocks that do not contain the placeholder are returned **by identity**, so the common case
 * allocates nothing and React sees the same objects it saw before.
 */
export const substituteAmountToken = (blocks: SanityTextBlock[], formatted: string): SanityTextBlock[] =>
  blocks.map((block) => {
    if (block?._type !== 'block' || !block.children?.some((child) => child?.text?.includes(AMOUNT_PLACEHOLDER))) {
      return block;
    }

    return {
      ...block,
      children: block.children.flatMap((child) => {
        if (!child?.text?.includes(AMOUNT_PLACEHOLDER)) {
          return [child];
        }

        /*
         * A plain string split, so the placeholder's braces need no escaping — and so `yarn fix`
         * has no `.replace(/…/g)` to rewrite into `.replaceAll`, which is ES2021 against this
         * project's ES2017 target. See the note in `stripTitleTags.ts`.
         *
         * `split` on "a{amount}b{amount}c" gives three text parts and therefore two tokens: the
         * token goes *between* parts, which is what makes the two-occurrence case fall out of the
         * shape rather than needing a branch.
         */
        const parts = child.text.split(AMOUNT_PLACEHOLDER);
        const marks = child.marks ?? [];

        return parts.flatMap((part, index) => {
          // The token goes *before* every part except the first, which is what puts it between them.
          const token: SanityTextBlockChild[] =
            index === 0
              ? []
              : [
                  {
                    ...child,
                    _key: `${child._key}-amount-${index}`,
                    marks: [...marks, AMOUNT_MARK],
                    text: formatted
                  }
                ];

          /*
           * An empty text part is dropped rather than emitted. A placeholder at the very start or
           * end of a child produces `''` on one side, and an empty span renders an empty inline box
           * that PortableText still walks — noise in the DOM and in any story that counts children.
           */
          const text: SanityTextBlockChild[] =
            part === '' ? [] : [{ ...child, _key: `${child._key}-${index}`, marks, text: part }];

          return [...token, ...text];
        });
      })
    };
  });

/**
 * Pick the copy the page should show, with the figure already substituted.
 *
 * Four decisions, in the order they are made. Each is a case a real editor can create in the Studio
 * today, and each has its own test.
 *
 * 1. **The toggle is off** → `copyWithoutAmount`. The plain reading of `showAmount`.
 *
 * 2. **`copyWithAmount` is blank** → `copyWithoutAmount`. An editor who flips the toggle on has not
 *    yet written the other field; falling back keeps a sentence on the page instead of publishing an
 *    empty panel. `hasBlockContent` and not `.length`, because Sanity keeps one block with an empty
 *    child after an editor types into a field and deletes it.
 *
 * 3. **No usable figure** → `copyWithoutAmount` *if the copy names one*, otherwise the copy as
 *    written. This is the case the ticket asks about and the split matters: a sentence reading
 *    "…we'd be grateful for a contribution of {amount} per room" must never ship, but a with-amount
 *    copy that never placed a placeholder reads perfectly well on its own and there is no reason to
 *    throw it away. "Usable" excludes `undefined`, `null`, `NaN`, and a negative — `Rule.min(0)` is
 *    a publish-time rule and a draft can hold anything, and "-$50" mid-sentence is worse than the
 *    fallback. It deliberately **includes `0`**: `Rule.min(0)` permits it, "$0" is a real (if
 *    unlikely) statement, and `0` is falsy, so a truthiness test here would silently route a
 *    deliberate zero to the wrong copy.
 *
 * 4. **Otherwise** → `copyWithAmount`, substituted. Including the case where it contains no
 *    placeholder at all, where `substituteAmountToken` is a no-op and the figure simply is not
 *    shown. That is the editor's choice to make in the field, not this function's to correct by
 *    appending a number somewhere they did not ask for.
 *
 * Returns `undefined` rather than `null` for absent copy, so a caller's `hasBlockContent(…)` guard
 * and optional-chaining both behave. GROQ returns `null`; this normalises it.
 */
const resolveAmountCopy = (contribution?: ContributionFields | null): SanityTextBlock[] | undefined => {
  const withoutAmount = contribution?.copyWithoutAmount ?? undefined;
  const withAmount = contribution?.copyWithAmount ?? undefined;

  /*
   * `withAmount` is retested alongside `hasBlockContent` only to narrow the type — the helper
   * returns `boolean` rather than a type predicate, so TypeScript still sees `… | undefined` after
   * it. Making `hasBlockContent` a predicate would narrow its argument for every caller in the repo,
   * which is a wider change than this file should make.
   */
  if (contribution?.showAmount !== true || !(withAmount && hasBlockContent(withAmount))) {
    return withoutAmount;
  }

  const amount = contribution.amountPerNight;
  const usable = typeof amount === 'number' && Number.isFinite(amount) && amount >= 0;

  if (!usable) {
    return containsAmountToken(withAmount) ? withoutAmount : withAmount;
  }

  return substituteAmountToken(withAmount, formatAmount(amount));
};

export default resolveAmountCopy;
