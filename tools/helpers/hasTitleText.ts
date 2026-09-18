import stripTitleTags from './stripTitleTags';

/**
 * Does this `TitleInput` field actually have anything in it?
 *
 * The companion to `hasBlockContent`, for the other field type with the same trap. `TitleInput`
 * stores **markup**, so a field an editor filled in and then emptied is the string `'<h2></h2>'` —
 * truthy, and non-empty after `trim()`. Every title field anyone has ever touched therefore passes
 * `Boolean(title?.trim())`, which is what five section components had each written out as
 * `Boolean(stripTitleTags(title).text.trim())` with its own eight-line note explaining why.
 *
 * What the naive test costs, per the sites that hit it:
 *
 * - `TwoColumnListSection` drew its inset panel around a single line of uppercase mono, because the
 *   guard that was meant to stop that was very nearly unreachable.
 * - `MediaCardGridSection` would render an empty `<h2>` in the page outline, draw the heading
 *   block's `margin-block-end` above a grid with no heading over it, and demote every card name to
 *   `h3` under a heading that is not there — all three on a section whose heading is *expected* to
 *   be blank, which is the case `/the-lodge` ships.
 * - `NumberedGridSection` would number a cell that renders nothing, leaving a hole in the ordinals.
 *
 * The schemas get this right already — their `custom()` rules strip the tags before testing — so
 * this is what makes the two halves of the same question agree. (They use the Studio-side
 * `tools/sanity/helpers/stripTitleTags`, which returns a bare string; this is the renderer-side one,
 * which also reports the element the markup asked for.)
 *
 * A caller that needs the element as well as the answer should destructure `stripTitleTags` directly
 * rather than calling both — `components/MediaCard` and `MediaCardGridSection` do, because they pass
 * the level on.
 */
const hasTitleText = (title?: string | null): boolean => Boolean(stripTitleTags(title ?? '').text.trim());

export default hasTitleText;
