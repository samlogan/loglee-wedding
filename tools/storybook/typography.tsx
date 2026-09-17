import { DOCS_FONT, DOCS_TEXT } from './docsChrome';
import { resolveLength, useTokens, useViewportWidth } from './tokens';

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

/**
 * The families a size scale can belong to. Derived nowhere — this is the set of token *prefixes*,
 * which is the one thing a page has to name in order to ask a question of the tokens at all.
 */
export type TypeFamily = 'display' | 'heading' | 'body';

/** `--heading-lg` → `lg`. Excludes the non-scale tokens that share the prefix. */
const stepsFor = (family: TypeFamily, names: string[]) => {
  const prefix = `--${family}-`;
  return (
    names
      .filter((name) => name.startsWith(prefix))
      .map((name) => name.slice(prefix.length))
      // `--heading-line-height` / `--display-letter-spacing` / `--body-default-font-weight` share the
      // prefix but are not sizes. A step is a single word with no dashes.
      .filter((step) => !step.includes('-'))
  );
};

/** One decimal is the difference between a readable table and one full of floating-point tails. */
const round = (value: number) => Math.round(value * 10) / 10;

export const TypeScale = ({ family }: { family: TypeFamily }) => {
  const tokens = useTokens();
  /*
   * Subscribed, not read. Every size below is a `clamp()`, so its resolved value is a function of the
   * canvas width — without this the table would report the width the page happened to mount at and
   * keep reporting it while you dragged, which is the one claim a fluid scale most needs to back up.
   */
  useViewportWidth();

  if (!tokens) {
    return null;
  }

  const fontVar = family === 'body' ? '--body-font' : '--heading-font';
  const steps = stepsFor(family, tokens.root)
    .map((step) => {
      const name = `--${family}-${step}`;
      const declared = tokens.rootValues[name];
      return { step, name, declared, resolved: resolveLength(declared) };
    })
    // Only sizes belong on a size scale; anything the browser would not accept as a length is not one.
    .filter((row) => row.resolved !== null)
    .toSorted((a, b) => (b.resolved ?? 0) - (a.resolved ?? 0));

  if (!steps.length) {
    return (
      <p className={DOCS_FONT} style={block}>
        No <code>--{family}-*</code> size tokens resolved.
      </p>
    );
  }

  return (
    <div className={`${DOCS_FONT} sb-unstyled`} style={block}>
      {steps.map(({ step, name, declared, resolved }) => (
        <div key={step} style={{ marginBottom: 18, borderBottom: '1px solid rgba(128,128,128,0.25)' }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, opacity: 0.7 }}>
            <code>{name}</code> · {round(resolved ?? 0)}px at this width · <code>{declared}</code>
          </p>
          {/*
           * Set from the token rather than from the number resolved above, so the specimen is itself
           * fluid — drag the canvas and it grows with the page instead of being re-rendered in steps.
           */}
          <p
            style={{
              margin: '0 0 10px',
              fontFamily: `var(${fontVar}), sans-serif`,
              fontSize: `var(${name})`,
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

/**
 * Every type role, at a size where the difference between them is legible.
 *
 * The roles are discovered from the `--*-font` custom properties `next/font` writes onto `<body>`,
 * not from a list here. A hardcoded pair is what this was, and it silently omitted the monospace
 * role the moment a third face was added — on a page whose own opening line promises that
 * everything below is read from the running page.
 */
export const Families = () => {
  const tokens = useTokens();
  if (!tokens) {
    return null;
  }

  /*
   * Read off `<body>`, not `tokens.root`. `next/font` declares each family on a generated class it
   * puts on the body element, so these never appear in a `:root` rule and the CSSOM walk in
   * `./tokens` cannot see them. Enumerating a computed style yields custom properties in Chromium,
   * which is what Storybook and the story test runner use.
   */
  const families = [...getComputedStyle(document.body)]
    .filter((name) => /^--[a-z]+-font$/.test(name))
    .map((name) => name.replaceAll(/^--|-font$/g, ''))
    .toSorted();

  return (
    <div className={`${DOCS_FONT} sb-unstyled`} style={block}>
      {families.map((family) => (
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
