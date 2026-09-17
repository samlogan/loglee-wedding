import { DOCS_FONT, DOCS_TEXT } from './docsChrome';
import { useTokens } from './tokens';

/**
 * The colour system, read from the running page. The CSSOM walk, the theme derivation and the
 * per-page cache all live in `./tokens` — see the notes there on why the walk must visit *and*
 * recurse, and why the theme selector is matched with a regex rather than a substring test.
 *
 * **These pages describe the system; they do not report findings.** No completeness score, no
 * contrast pass/fail, no "unused token" flags. This Storybook is client-facing, and a verdict column
 * turns a reference into an audit. Verdicts belong in the `yarn audit:*` CLI output, where the
 * numbers can be blunt without a client reading them over your shoulder.
 */

const block = { color: DOCS_TEXT, fontFamily: 'var(--body-font), sans-serif' } as const;

/**
 * The matrices are laid out on a fixed grid rather than sized to their contents.
 *
 * With `width: auto` every matrix measures its own widest token name and its own widest theme
 * header, so each one starts at a different left edge and puts its swatches on a different pitch.
 * Read down the page they look misaligned, because they are. A fixed layout with declared column
 * widths makes them share one grid.
 */
const TOKEN_COL = 190;
const THEME_COL = 104;
const ROW_HEIGHT = 34;

const matrixLabelCell = {
  width: TOKEN_COL,
  height: ROW_HEIGHT,
  textAlign: 'right',
  paddingRight: 20,
  fontSize: 12,
  whiteSpace: 'nowrap',
  verticalAlign: 'middle'
} as const;

const matrixValueCell = {
  width: THEME_COL,
  height: ROW_HEIGHT,
  paddingRight: 12,
  textAlign: 'left',
  fontSize: 12,
  verticalAlign: 'middle'
} as const;

const swatch = (value: string) => ({
  width: 34,
  height: 20,
  borderRadius: 3,
  background: value || 'transparent',
  border: '1px solid rgba(128,128,128,0.35)',
  display: 'inline-block'
});

/**
 * A short note for a family, when there is something useful to say. Purely cosmetic — a family
 * with no entry here still renders, it just has no subtitle. Nothing is gated on this map.
 */
const SUBTITLES: Record<string, string> = {
  shades: 'Flat surfaces',
  stone: 'Warm neutral, the base',
  pine: 'Brand green',
  signal: 'Bright accent, interactive states only',
  'system-error': 'System',
  'system-success': 'System',
  'system-warning': 'System',
  'system-info': 'System'
};

/** Families are listed in this order when present; anything unrecognised sorts to the end. */
const FAMILY_ORDER = ['shades', 'stone', 'pine', 'signal'];

/**
 * Derive the colour families from `:root` rather than listing them.
 *
 * This used to be a hardcoded array, which quietly stopped matching the moment the palette was
 * renamed — the brand ramps vanished from a page that presents itself as a complete reading of the
 * stylesheet, with nothing to indicate anything was missing. `system-info` had never appeared at
 * all, because nobody added it.
 *
 * A colour token here is either `--shades-{word}` or `--{family}-{number}`, where family may itself
 * contain dashes (`--system-error-500`). Non-colour tokens in `:root` — spacing, radius, container
 * widths, font sizes and weights, button sizing — all end in a word rather than a number, so the
 * numeric-suffix test separates them without inspecting any value. That matters: filtering on
 * "can I parse this as a colour" is what an earlier version did, and it silently dropped any token
 * written as an 8-digit hex or an `oklch()`.
 */
const deriveFamilies = (names: string[]) => {
  const families = new Map<string, string[]>();

  for (const name of names) {
    // Indexed rather than named groups — tsconfig targets ES2017, which predates named groups.
    const match = /^--(.+)-\d+$/.exec(name);
    const family = match?.[1] ?? (name.startsWith('--shades-') ? 'shades' : null);
    if (!family) {
      continue;
    }
    families.set(family, [...(families.get(family) ?? []), name]);
  }

  return [...families.entries()]
    .toSorted(([a], [b]) => {
      const ai = FAMILY_ORDER.indexOf(a);
      const bi = FAMILY_ORDER.indexOf(b);
      return (ai === -1 ? FAMILY_ORDER.length : ai) - (bi === -1 ? FAMILY_ORDER.length : bi) || a.localeCompare(b);
    })
    .map(([family, tokens]) => ({
      family,
      subtitle: SUBTITLES[family],
      // Numeric shades ascend; the word-suffixed shades ramp keeps declaration order.
      tokens: tokens.toSorted((a, b) => (Number(a.split('-').pop()) || 0) - (Number(b.split('-').pop()) || 0))
    }));
};

/**
 * The base ramps, read from `:root`.
 *
 * Every token in a matching family is shown, whatever its value format. An earlier version filtered
 * on "can I parse this as rgb/hex", which silently dropped any token written as an 8-digit hex or an
 * `oklch()` — the swatch simply vanished from the ramp with no trace, on a page that presents itself
 * as a complete reading of the stylesheet. A value the browser resolved is a value worth showing.
 */
export const Ramps = () => {
  const tokens = useTokens();
  if (!tokens) {
    return null;
  }

  const families = deriveFamilies(tokens.root.filter((name) => tokens.rootValues[name]));

  return (
    <div className={DOCS_FONT} style={block}>
      {families.map(({ family, subtitle, tokens: names }) => {
        if (!names.length) {
          return null;
        }
        return (
          <div key={family} style={{ marginBottom: 28 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
              {family}
              {subtitle ? <span style={{ opacity: 0.6, fontWeight: 400 }}> — {subtitle}</span> : null}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {names.map((name) => (
                <div key={name} style={{ width: 78 }}>
                  <div style={{ ...swatch(tokens.rootValues[name]), width: '100%', height: 44 }} />
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>{name.replace(/^--/, '')}</div>
                  <div style={{ fontSize: 10, opacity: 0.5 }}>{tokens.rootValues[name]}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const GROUPS: Record<string, RegExp> = {
  Surfaces: /^--bg-/,
  Foreground: /^--fg-/,
  Lines: /^--(stroke-|focus-ring)/,
  Inputs: /^--input-/
};

/**
 * One token group across every theme.
 *
 * An empty cell means the token resolved to nothing under that theme — not that the theme "inherits"
 * it. Custom properties inherit, and the probe is a bare `<div data-theme>` appended to `<body>`, so
 * a token a theme does not redefine still resolves through `:root` and paints a normal swatch. There
 * is deliberately no faded state: it would describe a case this mechanism cannot produce.
 */
export const TokenMatrix = ({ group }: { group: keyof typeof GROUPS }) => {
  const tokens = useTokens();
  if (!tokens) {
    return null;
  }

  const match = GROUPS[group];
  const names = tokens.themed.filter((name) => match.test(name));
  if (!names.length) {
    return (
      <p className={DOCS_FONT} style={block}>
        No tokens match <code>{String(match)}</code>.
      </p>
    );
  }

  // Width derived from the theme count rather than a literal, so a new theme widens the table
  // instead of collapsing into the last column.
  const matrixTableStyle = {
    width: TOKEN_COL + THEME_COL * tokens.themes.length,
    tableLayout: 'fixed',
    borderCollapse: 'separate',
    borderSpacing: 0
  } as const;

  return (
    <div className={DOCS_FONT} style={block}>
      <table className="sb-unstyled" style={matrixTableStyle}>
        <thead>
          <tr>
            <th style={matrixLabelCell}>Token</th>
            {tokens.themes.map((theme) => (
              <th key={theme} style={matrixValueCell}>
                {theme}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {names.map((name) => (
            <tr key={name}>
              <td style={matrixLabelCell}>{name.replace(/^--/, '')}</td>
              {tokens.themes.map((theme) => {
                const value = tokens.byTheme[theme]?.[name] ?? '';
                return (
                  <td key={theme} style={matrixValueCell} title={value}>
                    <span style={{ ...swatch(value), width: THEME_COL - 24 }} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Derived, not listed. A project that renames or adds a foreground token gets it here automatically,
 * and one that has fewer does not render a row with an undefined colour. Capped so a large set does
 * not turn each card into a wall of text.
 */
const foregroundTokens = (themed: string[]) => themed.filter((name) => name.startsWith('--fg-')).slice(0, 5);

/** Each theme's surface with its foregrounds drawn on it, which is how they are actually used. */
export const ThemeCards = () => {
  const tokens = useTokens();
  if (!tokens) {
    return null;
  }

  return (
    <div className={DOCS_FONT} style={{ ...block, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {tokens.themes.map((theme) => {
        const values = tokens.byTheme[theme] ?? {};
        return (
          <div
            key={theme}
            style={{
              minWidth: 200,
              flex: '1 1 200px',
              padding: 16,
              borderRadius: 8,
              background: values['--bg-default'],
              border: `1px solid ${values['--stroke-divider'] || 'rgba(128,128,128,0.35)'}`
            }}
          >
            <p style={{ margin: '0 0 10px', fontSize: 12, opacity: 0.7, color: values['--fg-muted'] }}>{theme}</p>
            {foregroundTokens(tokens.themed).map((name) => (
              <p key={name} style={{ margin: '0 0 4px', fontSize: 13, color: values[name] }}>
                {name.replace(/^--fg-/, '')}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
};
