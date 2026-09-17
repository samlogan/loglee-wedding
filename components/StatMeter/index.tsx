import classNames from '@/helpers/classNames';

import styles from './styles.module.scss';

export interface StatMeterProps {
  className?: string;
  /**
   * The stat's name — "Dance", "BBQ", "Navigation".
   *
   * Sentence case, not the comp's capitals: the uppercasing is `text-transform` in the stylesheet,
   * so the shouting stays out of the accessible name. This string *is* the accessible name (see the
   * note on `aria-label` below), so it has to read as a label rather than as a heading.
   */
  label: string;
  /** Where the bar fills to, on a `0`–`max` scale. Clamped rather than trusted. */
  score: number;
  /**
   * The top of the scale, and the `10` in "8/10".
   *
   * A prop rather than a constant because the fraction is rendered from it — a meter drawn against
   * a different scale would otherwise read "8/10" while filling to 8/5. `playerMeterStat` validates
   * `0`–`10` in the Studio, which is where the default comes from.
   */
  max?: number;
}

const DEFAULT_MAX = 10;

/**
 * Below this fraction of the scale the fill switches to the accent ink.
 *
 * **Derived in the component, not authored.** The schema has no colour field and the comp gives no
 * evidence for one: measured across every meter in the Figma file, the two high scores are the same
 * pine (8/10 and 9/10 both `#1e4632`, as is the lone meter on the design-system board) and the one
 * low score is signal (3/10, `#d6ff3b`). A per-meter colour field would let an author paint a 9/10
 * bar "low", which is a state the design never draws and which nothing in the content model means.
 *
 * Half the scale, because that is the only threshold the sample does not pin arbitrarily — any cut
 * between 3 and 8 reproduces the comp, so picking one to fit the single low sample would be
 * fitting noise. The midpoint is the one value that comes from the scale itself rather than from
 * the three data points, and it puts "below average" in the accent, which is what the comp draws.
 *
 * The colour is redundant emphasis, never information: the score is also set as text, so nothing is
 * lost to a reader who cannot separate the two hues (see the `forced-colors` block in the
 * stylesheet, where they deliberately collapse into one).
 */
const LOW_SCORE_RATIO = 0.5;

/**
 * A labelled proportional bar — the game-style stat meter on the player card (Figma node 1:208).
 *
 * Reads as three things at once, on purpose: the fraction at the right of the head row, the width
 * of the fill, and — below half the scale — the fill's colour. Only the first is load-bearing. The
 * bar is redundant with it, which is what lets the colour rule exist at all without failing
 * WCAG 1.4.1, and what makes the meter survive a forced-colours stylesheet that flattens both hues.
 *
 * A separate component rather than a part of `PlayerCard` because nothing about it is a player: it
 * takes a label, a number and the top of a scale, owns its own assistive-technology contract, and is
 * the unit a design review measures. Nesting it under the card would file a domain-free primitive
 * behind a domain component and imply it only exists inside one.
 *
 * Deliberately not a client component. `aria-labelledby` would need a generated id and so a
 * `useId()` — and therefore `'use client'` — for no gain: `aria-label` carries the same string, and
 * because that string *is* the visible label, WCAG 2.5.3 (Label in Name) holds by construction.
 */
const StatMeter = (props: StatMeterProps) => {
  const { className, label, max = DEFAULT_MAX, score } = props;

  /*
   * Both values are clamped before anything is drawn or announced.
   *
   * `playerMeterStat` validates `0`–`10` in the Studio, but validation is not a guarantee — a
   * required rule does not stop a document being published through the API, and `max` is a prop
   * anyone can pass. Unclamped, a score of 12 renders a 120%-wide fill that escapes the track, and
   * `aria-valuenow` outside `aria-valuemin`/`aria-valuemax` is an invalid state a screen reader is
   * free to report however it likes. A non-finite `max` would additionally make `ratio` `NaN` and
   * the inline `width` invalid, which silently collapses the fill to nothing.
   */
  const safeMax = Number.isFinite(max) && max > 0 ? max : DEFAULT_MAX;
  const safeScore = Number.isFinite(score) ? Math.min(Math.max(score, 0), safeMax) : 0;
  const ratio = safeScore / safeMax;
  /*
   * Rounded to two decimal places, which is a hundredth of a track — 0.02px on the comp's 183px
   * meter, well inside a device pixel. Not cosmetic housekeeping: `8 / 10 * 100` is
   * `80.00000000000001` in IEEE 754, so the unrounded form writes a seventeen-digit percentage into
   * the style attribute of the most-inspected element in the card.
   */
  const percent = Math.round(ratio * 10_000) / 100;

  return (
    /*
     * `role="meter"` rather than `progressbar`, and the difference is not cosmetic: `progressbar`
     * means "progress towards the completion of a task", which a personality stat is not and never
     * will be. `meter` is ARIA's "graphical display of a numeric value within a defined range",
     * which is this exactly.
     *
     * Support was measured rather than assumed, because `meter` is the newer of the two and the
     * obvious reason to reach for `progressbar` instead is that it is better established. Read out
     * of Chromium's own accessibility tree over CDP, this element is
     * `meter "Dance", value 8, valuemin 0, valuemax 10`, not ignored — the role lands, and the
     * `Default` story pins the same four facts from the DOM side so a regression fails the suite
     * rather than waiting for a review.
     *
     * The same measurement settled the other two questions here, and both answers are the opposite
     * of what the specs predict:
     *
     * 1. ARIA marks `meter` **children presentational**, which would prune the head row and mean the
     *    fraction could never be announced twice. Chromium does not implement that: the `StaticText`
     *    for "DANCE" and for "8/10" are both in the tree and neither is ignored. So the fraction is
     *    read *as well as* the value, and it is deliberately **not** `aria-hidden` even so. Hiding it
     *    would buy one less repetition in the engines that expose the role, at the price of the
     *    score disappearing outright in any that do not — verbosity against loss, which is not a
     *    close call.
     * 2. `aria-valuetext` appears as an empty string in the CDP dump, which reads like Chromium
     *    ignoring it. It is not: a `role="slider"` probe *with* the attribute serialises identically
     *    to one *without* it, and `aria-valuetext` on a slider is supported everywhere. The empty
     *    string is how that endpoint reports the property, not what the engine holds.
     *
     * `aria-valuetext` is set for the reason it exists: the bare number is ambiguous, and a screen
     * reader is entitled to report a range widget as a percentage — "80%" for 8/10 — where a stat is
     * a count out of ten and not a proportion. The spoken form matches the printed one.
     */
    <div
      aria-label={label}
      aria-valuemax={safeMax}
      aria-valuemin={0}
      aria-valuenow={safeScore}
      aria-valuetext={`${safeScore} of ${safeMax}`}
      className={classNames(styles.meter, { [styles.low]: ratio < LOW_SCORE_RATIO }, className)}
      role="meter"
    >
      <span className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={styles.score}>{`${safeScore}/${safeMax}`}</span>
      </span>
      <span className={styles.track}>
        {/*
         * The one value that cannot come from the stylesheet — it is the datum. Everything else
         * about the fill (both inks, the radius, the height) is a custom property the module owns.
         */}
        <span className={styles.fill} style={{ width: `${percent}%` }} />
      </span>
    </div>
  );
};

export default StatMeter;
