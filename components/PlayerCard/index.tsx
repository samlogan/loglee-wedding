import StatMeter from '@/components/StatMeter';
import Text from '@/components/Text';
import classNames from '@/helpers/classNames';
import type { IPlayerMeterStat, IPlayerStat, IPlayerTextStat } from '@/tools/sanity/schema/documents/player';

import styles from './styles.module.scss';

export interface PlayerCardProps {
  className?: string;
  /**
   * The fixed title at the left of the header band.
   *
   * A prop with a default rather than a CMS field — the comp prints the same two words on every
   * player, so there is nothing to author. It stays a prop because this is a component rather than a
   * section: a second use with a different band title should not need a second component.
   */
  title?: string;
  /** The readout at the right of the header band, e.g. "LVL 33". Authored whole, on `player.level`. */
  level?: string;
  /**
   * The authored stat list, text and meter shapes interleaved in whatever order the Studio holds
   * them. Partitioned here — see the note on `PlayerCard` below.
   */
  stats?: IPlayerStat[];
  /** Passed through to every meter. See `StatMeter`'s `max`. */
  meterMax?: number;
}

/*
 * Narrowed on `_type` rather than on the presence of a field.
 *
 * `playerTextStat` and `playerMeterStat` are separate Sanity types precisely so the discriminator is
 * the one Sanity already writes — `tools/sanity/schema/documents/player.ts` says as much. Testing
 * for `'score' in stat` instead would work today and quietly mis-file the first text stat that grows
 * a numeric field.
 */
const isTextStat = (stat: IPlayerStat): stat is IPlayerTextStat => stat._type === 'playerTextStat';
const isMeterStat = (stat: IPlayerStat): stat is IPlayerMeterStat => stat._type === 'playerMeterStat';

/**
 * The monospace stat card on the player pages (Figma node 1:175 desktop, 1:243 mobile).
 *
 * Three stacked bands: an inverted header, the text stats, and the meters. **The renderer decides
 * which band a stat lands in**, by partitioning the one authored array on `_type` — so an editor
 * who interleaves the two shapes, or drags a meter above a text stat, cannot produce a card with a
 * meter stranded in the grid. The Studio field says so in its own description; this is the half that
 * makes it true.
 *
 * Each band is dropped entirely when it has nothing in it, rather than rendered empty. A `<dl>` with
 * no terms is not merely blank — it is announced as an empty list — and an empty meter band would
 * still draw its separating rule and its padding.
 *
 * A plain `<div>` at the root, and a plain `<div>` for the header band. `<header>` is tempting and
 * wrong: it maps to the `banner` landmark unless it is nested inside `article`, `aside`, `main`,
 * `nav` or `section`, so a card sitting in a page would contribute a second banner to the document.
 * Reaching for `<article>` to suppress that only trades it for an `article` node in every screen
 * reader's element list. The band is chrome; it needs no role at all.
 *
 * The text stats *are* a description list, though, and that is worth the markup: `<dt>`/`<dd>` is
 * what ties "Home town" to "Wollongong" programmatically rather than leaving two adjacent spans and
 * hoping reading order carries it. HTML allows the pairs to be wrapped in a `<div>`, which is what
 * makes the grid cell possible.
 */
const PlayerCard = (props: PlayerCardProps) => {
  const { className, level, meterMax, stats, title = 'Player card' } = props;

  const textStats = stats?.filter(isTextStat) ?? [];
  const meterStats = stats?.filter(isMeterStat) ?? [];

  return (
    <div className={classNames(styles.card, className)}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {level && <span className={styles.level}>{level}</span>}
      </div>

      {textStats.length > 0 && (
        <dl className={styles.stats}>
          {textStats.map((stat) => (
            <div className={classNames(styles.stat, { [styles.fullWidth]: stat.fullWidth })} key={stat._key}>
              <dt className={styles.statLabel}>{stat.label}</dt>
              {/*
               * Always rendered, even when the value is blank. `value` is optional on the schema, and
               * a `<dt>` whose `<dd>` is missing is not a description list — the pairing an assistive
               * technology reports would silently slide onto the next stat's value. An empty `<dd>`
               * is valid and keeps the grid cell and its rule where the comp draws them.
               *
               * The full-width stat is the only one set in the body face; `Text` owns that step of
               * the type scale, so it draws that one and the mono cells are plain text — `Text` has
               * no `mono` variant, so routing them through it would mean overriding every
               * declaration it makes.
               *
               * `size="md"` is the single statement of that step. The stylesheet used to restate it
               * as `font-size: var(--body-md)` on the `<dd>` as well; it now sets only the family,
               * which is the half `Text` cannot supply (`variant_body` declares no `font-family`,
               * so without it this run would inherit the mono face from `.statValue`).
               */}
              <dd className={styles.statValue}>
                {stat.fullWidth ? <Text as="span" size="md" text={stat.value} /> : stat.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {meterStats.length > 0 && (
        <div className={styles.meters}>
          {meterStats.map((stat) => (
            <StatMeter key={stat._key} label={stat.label} max={meterMax} score={stat.score} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerCard;
