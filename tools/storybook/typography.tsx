import { DOCS_FONT, DOCS_TEXT } from './docsChrome';
import { px, useTokens } from './tokens';

/**
 * The type system, read from the running page.
 *
 * The steps and the weight ladder are **derived from the token names**, not from a list kept here.
 * That distinction is the whole point of the page: a hardcoded `['2xl','xl','lg',…]` looks identical
 * on the day it is written and then silently under-reports the system the moment someone adds
 * `--heading-3xl` or `--font-weight-extrabold`, while the prose above it still claims everything is
 * read live.
 *
 * Steps are ordered by their resolved pixel value, largest first, so the ladder reads as a scale
 * without anyone maintaining the order either.
 */

const block = { color: DOCS_TEXT, fontFamily: 'var(--body-font), sans-serif' } as const;

/**
 * `sb-unstyled` opts a table out of Storybook's docs table rules — which then hands it to the app's
 * own `table { width: 100% }`. A three-column table then spreads across the full page and the
 * specimen detaches from the token naming it. The explicit `width: auto` beats both, since an inline
 * style outranks any stylesheet rule, layered or not.
 */
const tableStyle = { width: 'auto', borderCollapse: 'separate', borderSpacing: '8px 5px' } as const;
const cell = { fontSize: 12, textAlign: 'left', verticalAlign: 'baseline' } as const;

/** `--heading-lg` → `lg`. Excludes the `-mobile` variants and the non-scale tokens. */
const stepsFor = (family: 'heading' | 'body', names: string[]) => {
  const prefix = `--${family}-`;
  return (
    names
      .filter((name) => name.startsWith(prefix) && !name.endsWith('-mobile'))
      .map((name) => name.slice(prefix.length))
      // `--heading-line-height` / `--heading-letter-spacing` / `--body-default-font-weight` share the
      // prefix but are not sizes. A step is a single word with no dashes.
      .filter((step) => !step.includes('-'))
  );
};

export const TypeScale = ({ family }: { family: 'heading' | 'body' }) => {
  const tokens = useTokens();
  if (!tokens) {
    return null;
  }

  const fontVar = family === 'heading' ? '--heading-font' : '--body-font';
  const steps = stepsFor(family, tokens.root)
    .map((step) => ({
      step,
      desktop: tokens.rootValues[`--${family}-${step}`],
      mobile: tokens.rootValues[`--${family}-${step}-mobile`]
    }))
    // Only sizes belong on a size scale; anything that did not resolve to a length is not one.
    .filter((row) => px(row.desktop) !== null)
    .toSorted((a, b) => (px(b.desktop) ?? 0) - (px(a.desktop) ?? 0));

  if (!steps.length) {
    return (
      <p className={DOCS_FONT} style={block}>
        No <code>--{family}-*</code> size tokens resolved.
      </p>
    );
  }

  return (
    <div className={`${DOCS_FONT} sb-unstyled`} style={block}>
      {steps.map(({ step, desktop, mobile }) => (
        <div key={step} style={{ marginBottom: 18, borderBottom: '1px solid rgba(128,128,128,0.25)' }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, opacity: 0.7 }}>
            <code>
              --{family}-{step}
            </code>{' '}
            {/* A missing mobile token is stated, not quietly rendered as "identical". */}· {desktop} desktop ·{' '}
            {mobile ? (mobile === desktop ? 'same on mobile' : `${mobile} mobile`) : 'no mobile token'}
          </p>
          <p
            style={{
              margin: '0 0 10px',
              fontFamily: `var(${fontVar}), sans-serif`,
              fontSize: desktop,
              lineHeight: 1.15
            }}
          >
            The quick brown fox jumps
          </p>
        </div>
      ))}
    </div>
  );
};

/** The weight ladder, drawn in the body face and ordered by weight. */
export const Weights = () => {
  const tokens = useTokens();
  if (!tokens) {
    return null;
  }

  const weights = tokens.root
    .filter((name) => name.startsWith('--font-weight-'))
    .map((name) => ({ name, value: Number(tokens.rootValues[name]) }))
    .filter((row) => Number.isFinite(row.value))
    .toSorted((a, b) => a.value - b.value);

  if (!weights.length) {
    return (
      <p className={DOCS_FONT} style={block}>
        No <code>--font-weight-*</code> tokens resolved.
      </p>
    );
  }

  return (
    <div className={`${DOCS_FONT} sb-unstyled`} style={block}>
      <table className="sb-unstyled" style={tableStyle}>
        <thead>
          <tr>
            <th style={cell}>Token</th>
            <th style={cell}>Value</th>
            <th style={cell}>Specimen</th>
          </tr>
        </thead>
        <tbody>
          {weights.map(({ name, value }) => (
            <tr key={name}>
              <td style={cell}>
                <code>{name.replace('--font-weight-', '')}</code>
              </td>
              <td style={cell}>{value}</td>
              <td style={{ ...cell, fontFamily: 'var(--body-font), sans-serif', fontWeight: value, fontSize: 18 }}>
                The quick brown fox
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** The two families, side by side, at a size where the difference is legible. */
export const Families = () => {
  const tokens = useTokens();
  if (!tokens) {
    return null;
  }

  return (
    <div className={`${DOCS_FONT} sb-unstyled`} style={block}>
      {(['heading', 'body'] as const).map((family) => (
        <div key={family} style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, opacity: 0.7 }}>
            <code>--{family}-font</code>
          </p>
          <p style={{ margin: 0, fontFamily: `var(--${family}-font), sans-serif`, fontSize: 28 }}>
            The quick brown fox jumps over the lazy dog
          </p>
        </div>
      ))}
    </div>
  );
};
