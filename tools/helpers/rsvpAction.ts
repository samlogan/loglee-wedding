import type { IWeddingSettingsDocument } from '@/tools/sanity/schema/documents/weddingSettings';
import type { IButtonElement } from '@/tools/sanity/schema/elements/button';
import type { ILinkElement } from '@/tools/sanity/schema/elements/link';
import type { IHeaderObject } from '@/tools/sanity/schema/objects/header';

import hasText from './hasText';

/**
 * The RSVP action, worked out once.
 *
 * It is drawn in three places — the accent pill at the right of the bar, the full-width action at the
 * foot of the mobile menu, and the RSVP button in `sections/ClosingCtaSection` on the home page — and
 * all three read the same two documents: the reply-by line from `weddingSettings.rsvpLabel`, and the
 * switch, the destination and the short label from `headerDocument.header`. The reply-by date is the
 * one fact on the home page that appears three times, so the rules for combining those fields live
 * here rather than in each renderer. Before this file `components/Header` spelt them twice, once in
 * the bar and once in the menu, and the section would have been a third copy.
 *
 * ## The rules, each the header's own
 *
 * 1. **No action without the switch and a button.** `addButton` is the Studio's "Add RSVP Action"
 *    toggle and `button` is where it goes. A reply-by line on its own has nowhere to send anyone.
 * 2. **Two labels, each the other's fallback.** `longLabel` is the reply-by line ("RSVP by 11
 *    December") with the action's own label behind it; `shortLabel` is the reverse, and is what the
 *    390px bar has room for. Blank `rsvpLabel` is a supported state, not an error: every surface then
 *    reads the action's own "RSVP", which is what the nav frames draw.
 * 3. **No label, no action.** Both labels come from the same two strings, so they are blank together
 *    or not at all — and a pill with no words in it is not drawn.
 *
 * ## Blank is tested after stega, and that is the reason this uses `hasText`
 *
 * In draft mode every plain string arrives with an invisible stega payload appended, blank ones
 * included, so the `rsvpLabel || button.label` this replaced took an emptied reply-by line for a real
 * one and drew an empty accent pill in the Presentation tool. `hasText` decides blankness on a
 * cleaned copy; the label returned is still the original, encoded string, so the overlay can still
 * find the field it came from.
 *
 * ## What this does not decide
 *
 * Whether `link` actually resolves. The header draws its pill whenever there is an action, exactly as
 * it did before this helper existed; `sections/ClosingCtaSection` additionally asks `hasDestination`,
 * because its ticket counts a blank link as "no RSVP action". The difference is confined to that one
 * degenerate state — an action with a label and no destination.
 */

/**
 * The three fields the action is built from, as the projections deliver them.
 *
 * Typed from the schema interfaces rather than restated, so a change to either document's field
 * reaches this file. `| null` throughout because a GROQ projection returns `null` for anything an
 * editor left unset, which the document interfaces do not declare.
 */
export interface RsvpActionFields {
  /** `headerDocument.header.addButton` — the Studio's "Add RSVP Action" switch. */
  addButton?: IHeaderObject['addButton'] | null;
  /** `headerDocument.header.button` — the destination, and the short label a phone has room for. */
  button?: IButtonElement | null;
  /** `weddingSettings.rsvpLabel` — the reply-by line. */
  rsvpLabel?: IWeddingSettingsDocument['rsvpLabel'] | null;
}

/** The action, resolved. Absent rather than half-filled when there is none to draw. */
export interface RsvpAction {
  /** Where it goes. Spread onto `Link`. */
  link: ILinkElement;
  /** The reply-by line, or the action's own label when that is blank. */
  longLabel: string;
  /** The action's own label, or the reply-by line when that is blank. */
  shortLabel: string;
}

const resolveRsvpAction = (fields?: RsvpActionFields | null): RsvpAction | undefined => {
  const { addButton, button, rsvpLabel } = fields ?? {};

  if (!addButton || !button) {
    return undefined;
  }

  // Each value is read again after `hasText` only to narrow its type: the helper returns `boolean`
  // rather than a type predicate, so on its own it leaves TypeScript seeing `string | null | undefined`.
  const replyBy = rsvpLabel && hasText(rsvpLabel) ? rsvpLabel : undefined;
  const actionLabel = button.label && hasText(button.label) ? button.label : undefined;

  const longLabel = replyBy ?? actionLabel;
  const shortLabel = actionLabel ?? replyBy;

  // Rule 3. The two are set together or not at all; both are tested so neither is `| undefined` below.
  if (!longLabel || !shortLabel) {
    return undefined;
  }

  return { link: button.link, longLabel, shortLabel };
};

export default resolveRsvpAction;
