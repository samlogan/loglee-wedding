/** One usable item: the trimmed string, and a key that is stable across a reorder. */
export interface KeyedTextItem {
  key: string;
  text: string;
}

/**
 * Turn a CMS array of plain strings into renderable items — trimmed, blanks dropped, and each given
 * a React key that survives both a reorder and a duplicate.
 *
 * Three sections had written this reduce independently by the time it was collected —
 * `MediaTagsSection`'s location pills, `MediaCardGridSection`'s opening hours and
 * `TwoColumnListSection`'s list items — all over the same field shape (`array of string`), all with
 * the same three passes, and each carrying its own copy of the reasoning below.
 *
 * ## Blanks are dropped, and it is not tidiness
 *
 * An array of plain strings keeps every row an editor tabbed through and moved on from. A blank one
 * is not nothing: `components/Tag` paints an opaque surface with padding, so an empty pill draws a
 * small filled rectangle with no label in it, and an empty hours item still takes a slot in the
 * footer's gap — or, worse, is the only item, drawing a hairline over nothing. The components
 * self-guard by returning `null`, but they do it from *inside* the `<li>`, which leaves an empty
 * list item taking a flex gap.
 *
 * ## The key is carried, not derived at render
 *
 * These are short lines an editor reorders in place, so an index key makes React keep the old text
 * in the old node. The obvious alternative — `key={text}` — needs the text to be unique, and the
 * `Rule.unique()` these fields carry is a **publish-time** rule while Presentation renders drafts. A
 * draft mid-edit really can hold two identical lines, and a bare text key hands React duplicate keys
 * in the one environment an editor is watching: a console error and undefined reconciliation.
 *
 * ## The suffix is unconditional, and two of the three call sites had this wrong
 *
 * Suffixing only the *repeats* — `occurrence === 0 ? text : `${text}#${occurrence}`` — re-creates the
 * collision it exists to prevent. `['a', 'a', 'a#1']` yields `a`, `a#1`, `a#1`: the second 'a' takes
 * the suffixed form and the literal `'a#1'` takes its own text, and they are the same string.
 * `MediaCardGridSection` found this and suffixed unconditionally; `MediaTagsSection` and
 * `TwoColumnListSection` shipped the conditional form.
 *
 * A bare integer suffix cannot collide, because the disambiguator is appended to *every* key rather
 * than to some of them — `'a'` becomes `a#0` and the literal `'a#1'` becomes `a#1#0`. The property
 * the conditional form was protecting, "byte-identical to the bare text in the common case", buys
 * nothing: nothing compares keys across renders of different shapes, and a key is never displayed.
 */
const keyedTextItems = (items?: (string | null | undefined)[] | null): KeyedTextItem[] => {
  const seen = new Map<string, number>();

  return (items ?? []).reduce<KeyedTextItem[]>((accumulator, item) => {
    const text = item?.trim();

    if (!text) {
      return accumulator;
    }

    const occurrence = seen.get(text) ?? 0;

    seen.set(text, occurrence + 1);
    accumulator.push({ key: `${text}#${occurrence}`, text });

    return accumulator;
  }, []);
};

export default keyedTextItems;
