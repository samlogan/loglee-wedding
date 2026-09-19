import hasText from './hasText';

/**
 * A plain-string field's value when it has text in it, `undefined` when it does not — so a caller can
 * test a value and render it in one expression, or fall back with `??`.
 *
 *   const cardLevel = textOrUndefined(level);
 *   const label = textOrUndefined(button.label) ?? textOrUndefined(rsvpLabel);
 *
 * Blank is `hasText`'s answer, for the reason given there: in draft mode a field left blank still
 * arrives with a stega payload appended, and `.trim()` does not remove it.
 *
 * ## The value comes back untouched
 *
 * Still encoded, so the Presentation overlay keeps its edit link on the text on screen — clean it and
 * the overlay stops working on that field. That is also why this hands back the value rather than a
 * boolean: `hasText` is not a type predicate and cannot be one, since a blank string is still a
 * string, so returning the original is how a caller gets it narrowed to `string`.
 *
 * And **not trimmed**. Rendered as text, the surrounding white space collapses in HTML anyway, and a
 * trim here could not be relied on: the payload sits *after* the text, so on an encoded value
 * `.trim()` removes leading white space but never a trailing space in front of the payload. A caller
 * with its own reason to trim — `HeroSection`, which joins values with a no-break space — trims at its
 * call site, where the reason can be stated.
 */
const textOrUndefined = (value?: string | null): string | undefined => (value && hasText(value) ? value : undefined);

export default textOrUndefined;
