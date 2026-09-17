import { DOCS_FONT, DOCS_TEXT } from './docsChrome';
import { px, useTokens } from './tokens';

/**
 * The layout system — spacing steps and container widths — read from the running page.
 *
 * Deliberately **not** backed by a committed JSON audit. The version this was ported from read its
 * numbers from `audits/layout-drift.json` with a `live ?? committed` fallback, under a caption
 * saying the values were read live. `getPropertyValue` returns `''` for an undeclared custom
 * property and `''` is falsy, so renaming a token silently fell through to the number frozen into
 * the JSON — the page kept printing a stale value while asserting it was current. The drift it
 * existed to surface was the one thing it hid.
 *
 * Reading tokens directly has no such failure mode: a renamed token disappears from the table, which
 * is visible.
 */

const block = { color: DOCS_TEXT, fontFamily: 'var(--body-font), sans-serif' } as const;

/**
 * `sb-unstyled` opts a table out of Storybook's docs table rules — which then hands it to the app's
 * own `table { width: 100% }`. The explicit `width: auto` beats both, since an inline style outranks
 * any stylesheet rule, layered or not.
 */
const tableStyle = { width: 'auto', borderCollapse: 'separate', borderSpacing: '14px 6px' } as const;
const cell = { fontSize: 12, textAlign: 'left', verticalAlign: 'middle' } as const;

/** A proportional bar, always normalised against the largest value in its own table. */
const bar = (value: number, max: number) => ({
  display: 'inline-block',
  height: 10,
  borderRadius: 2,
  background: 'var(--fg-accent, #888)',
  // Normalised, not raw. A bar sized directly from the value gives two tables on one page two
  // different scales, and is unbounded — a large value draws a bar wider than the viewport.
  width: max > 0 ? `${Math.max((value / max) * 220, 2)}px` : '2px'
});

/**
 * The section spacing scale, desktop and mobile.
 *
 * `Section` builds its classes dynamically (`styles[\`spacing_top_${x}\`]`), so a typo'd token yields
 * silently zero padding. The measured proof of that is the `Foundations/Section` → `Spacing Scale`
 * story, which reads the applied padding off the DOM; this table is the token reference behind it.
 */
export const SpacingScale = () => {
  const tokens = useTokens();
  if (!tokens) {
    return null;
  }

  const steps = tokens.root
    .filter((name) => /^--section-spacing-.+-desktop$/.test(name))
    .map((name) => {
      const step = name.replace('--section-spacing-', '').replace('-desktop', '');
      return {
        step,
        desktop: tokens.rootValues[name],
        mobile: tokens.rootValues[`--section-spacing-${step}-mobile`]
      };
    })
    .filter((row) => px(row.desktop) !== null)
    .toSorted((a, b) => (px(a.desktop) ?? 0) - (px(b.desktop) ?? 0));

  if (!steps.length) {
    return (
      <p className={DOCS_FONT} style={block}>
        No <code>--section-spacing-*</code> tokens resolved.
      </p>
    );
  }

  const max = Math.max(...steps.map((s) => px(s.desktop) ?? 0));

  return (
    <div className={`${DOCS_FONT} sb-unstyled`} style={block}>
      <table className="sb-unstyled" style={tableStyle}>
        <thead>
          <tr>
            <th style={cell}>Step</th>
            <th style={cell}>Desktop</th>
            <th style={cell}>Mobile</th>
            <th style={cell} />
          </tr>
        </thead>
        <tbody>
          {steps.map(({ step, desktop, mobile }) => (
            <tr key={step}>
              <td style={cell}>
                <code>{step}</code>
              </td>
              <td style={cell}>{desktop}</td>
              <td style={cell}>{mobile || '—'}</td>
              <td style={cell}>
                <span style={bar(px(desktop) ?? 0, max)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 12, opacity: 0.7, marginTop: 12 }}>
        A section with no explicit <code>spacing</code> prop takes the default. <code>none</code> is a real step and
        resolves to zero — it has no token, which is why it is absent here rather than shown as <code>0px</code>.
      </p>
    </div>
  );
};

/**
 * Container widths.
 *
 * Each row reports the token cap only. What a container *renders* at depends on the viewport, and
 * saying so numerically needs a live measurement rather than a token — that is what the
 * `Foundations/Container` → `Width Scale` story does, reporting cap, rendered width and gutter
 * together. At a 1280px viewport `lg`, `xl` and `full` all render identically, which is worth seeing
 * rather than inferring from a table of caps.
 */
export const ContainerWidths = () => {
  const tokens = useTokens();
  if (!tokens) {
    return null;
  }

  const widths = tokens.root
    .filter((name) => name.startsWith('--container-'))
    .map((name) => ({ name: name.replace('--container-', ''), value: tokens.rootValues[name] }))
    .filter((row) => px(row.value) !== null)
    .toSorted((a, b) => (px(a.value) ?? 0) - (px(b.value) ?? 0));

  if (!widths.length) {
    return (
      <p className={DOCS_FONT} style={block}>
        No <code>--container-*</code> tokens resolved.
      </p>
    );
  }

  const max = Math.max(...widths.map((w) => px(w.value) ?? 0));

  return (
    <div className={`${DOCS_FONT} sb-unstyled`} style={block}>
      <table className="sb-unstyled" style={tableStyle}>
        <thead>
          <tr>
            <th style={cell}>Width</th>
            <th style={cell}>Max</th>
            <th style={cell} />
          </tr>
        </thead>
        <tbody>
          {widths.map(({ name, value }) => (
            <tr key={name}>
              <td style={cell}>
                <code>{name}</code>
              </td>
              <td style={cell}>{value}</td>
              <td style={cell}>
                <span style={bar(px(value) ?? 0, max)} />
              </td>
            </tr>
          ))}
          {/*
           * `full` is a real option on the Container `width` prop but has no `--container-full`
           * token — it means "no cap". Stated once, here, rather than emitted as a second row
           * sharing a name with a token row, which reads as two different things called the same
           * thing.
           */}
          <tr>
            <td style={cell}>
              <code>full</code>
            </td>
            <td style={{ ...cell, opacity: 0.7 }}>no cap</td>
            <td style={cell} />
          </tr>
        </tbody>
      </table>
    </div>
  );
};
