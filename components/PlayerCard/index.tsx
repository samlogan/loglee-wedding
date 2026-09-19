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
 * wrong — though not for the reason it first looks. It maps to the `banner` landmark only when it is
 * *not* nested inside `article`, `aside`, `main`, `nav` or `section`, and `Layout` already renders
 * `<main>`; measured on Chromium, a `<header>` inside `main` maps to `sectionheader`, never
 * `banner`. So the cost is not a duplicate banner on the page as it stands. It is a node in every
 * screen reader's element list that names nothing, repeated on every card — plus a real `banner` the
 * day a card is rendered outside `main`. Reaching for `<article>` to suppress it only trades one
 * such node for another. The band is chrome; a plain `<div>` contributes nothing at all, which is
 * exactly what it is worth.
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
        <Text as="span" className={styles.title} text={title} textTransform="uppercase" variant="mono" weight="bold" />
        {level && (
          <Text
            as="span"
            className={styles.level}
            text={level}
            textTransform="uppercase"
            variant="mono"
            weight="bold"
          />
        )}
      </div>

      {textStats.length > 0 && (
        <dl className={styles.stats}>
          {textStats.map((stat) => (
            <div className={classNames(styles.stat, { [styles.fullWidth]: stat.fullWidth })} key={stat._key}>
              <Text
                as="dt"
                className={styles.statLabel}
                text={stat.label}
                textTransform="uppercase"
                variant="mono"
                weight="regular"
              />
              {/*
               * Always rendered, even when the value is blank. `value` is optional on the schema, and
               * a `<dt>` whose `<dd>` is missing is not a description list — the pairing an assistive
               * technology reports would silently slide onto the next stat's value. An empty `<dd>`
               * is valid and keeps the grid cell and its rule where the comp draws them.
               *
               * Every value is in the mono face, the full-width one included. It used to be the one
               * run set in the body face, as the comp drew it; the couple asked for it to match the
               * rest of the card.
               */}
              <Text as="dd" className={styles.statValue} text={stat.value} variant="mono" weight="regular" />
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
