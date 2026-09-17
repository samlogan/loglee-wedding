import { useEffect, useState } from 'react';

/**
 * Reads the design tokens out of the running page rather than out of the stylesheet source.
 *
 * Shared by every Foundations/Design System page, so the walk and the probing happen once per page
 * rather than once per doc block, and so there is exactly one copy of the two things below that are
 * easy to get subtly wrong.
 *
 * Token *names* and the *theme list* come from the CSSOM, so adding either to
 * `tools/sass/global/_variables.scss` shows up on the next build with no list to update. Token
 * *values* come from `getComputedStyle` on a probe element, so what you see is what the browser
 * resolved — `var()` chains followed, theme cascade applied — not what the source appears to say.
 */

/**
 * Walk every rule, descending into anything that groups other rules.
 *
 * This recursion is not optional. `tools/sass/global/styles.scss` wraps its imports in
 * `@layer global` and Sass inlines them, so `:root` and every `[data-theme]` block compiles *inside*
 * a `CSSLayerBlockRule`. A flat walk over `sheet.cssRules` — which is what you would write first —
 * finds zero tokens and every block on the page renders empty.
 *
 * Duck-typed on `cssRules` rather than `instanceof CSSLayerBlockRule` so it does not depend on the
 * TS DOM lib shipping that interface, and so it covers `@media` and `@supports` for free.
 *
 * The visit and the recursion are deliberately **not** exclusive. `CSSStyleRule` implements CSS
 * nesting, so it carries a `cssRules` list of its own — the overwhelming majority of rules in a
 * built sheet are style rules, not layer blocks. Treating "has `cssRules`" as "is a group, recurse
 * instead of visiting" therefore skips almost every rule in the sheet and finds zero tokens.
 */
const walkRules = (rules: CSSRuleList, visit: (rule: CSSStyleRule) => void) => {
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) {
      visit(rule);
    }
    if ('cssRules' in rule) {
      walkRules((rule as CSSGroupingRule).cssRules, visit);
    }
  }
};

/**
 * Matched with a regex that captures the quoted theme name, not a loose `includes('[data-theme')`.
 *
 * A component module is free to write `.card[data-theme='dark'] { --fg-accent: … }`, and a substring
 * test would pull that component's private token into the global matrix — where it probes as empty,
 * because the `.card` rule cannot match a bare probe element. A token that is fine would render as
 * five blank swatches.
 */
const THEME_SELECTOR = /^\[data-theme=['"]?([\w-]+)['"]?\]$/;

const readTokenNames = () => {
  const root = new Set<string>();
  const themed = new Set<string>();
  const themes = new Set<string>();

  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      // Cross-origin sheet — not ours, and unreadable by design.
      continue;
    }
    walkRules(rules, (rule) => {
      const selector = rule.selectorText?.trim() ?? '';
      const isRoot = selector === ':root' || selector.startsWith(':root,');
      const themeMatch = selector.match(THEME_SELECTOR);
      if (!(isRoot || themeMatch)) {
        return;
      }
      if (themeMatch) {
        themes.add(themeMatch[1]);
      }
      for (const property of rule.style) {
        if (!property.startsWith('--')) {
          continue;
        }
        (isRoot ? root : themed).add(property);
      }
    });
  }

  return {
    root: [...root].toSorted(),
    themed: [...themed].toSorted(),
    themes: [...themes].toSorted()
  };
};

/** Resolve tokens under a given theme by probing a real element the browser has laid out. */
const readValues = (names: string[], theme?: string) => {
  const probe = document.createElement('div');
  if (theme) {
    probe.dataset.theme = theme;
  }
  probe.style.display = 'none';
  document.body.append(probe);
  try {
    const computed = getComputedStyle(probe);
    const values: Record<string, string> = {};
    for (const name of names) {
      values[name] = computed.getPropertyValue(name).trim();
    }
    return values;
  } finally {
    // `finally` so a throw between append and remove cannot leak a hidden `<div data-theme>` into
    // `<body>` — the same element `withThemeByDataAttribute` writes to.
    probe.remove();
  }
};

export interface Tokens {
  /** Custom properties declared on `:root`. */
  root: string[];
  /** Custom properties declared inside a `[data-theme]` block. */
  themed: string[];
  /** Theme names, derived from the selectors rather than hardcoded. */
  themes: string[];
  byTheme: Record<string, Record<string, string>>;
  rootValues: Record<string, string>;
}

/**
 * Read once per page, not once per block.
 *
 * A docs page mounts several of these components independently, and each read walks every stylesheet
 * in the preview iframe and appends a probe per theme. Memoising at module scope makes that happen
 * once. Storybook reloads the iframe on navigation, so the cache cannot go stale within a page's
 * lifetime.
 */
let cache: Tokens | null = null;

export const readTokens = (): Tokens => {
  if (cache) {
    return cache;
  }
  const { root, themed, themes } = readTokenNames();
  const byTheme: Record<string, Record<string, string>> = {};
  for (const theme of themes) {
    byTheme[theme] = readValues(themed, theme);
  }
  cache = { root, themed, themes, byTheme, rootValues: readValues(root) };
  return cache;
};

/** Lazy initialiser rather than setState-in-effect — the value is a one-shot read, not a subscription. */
export const useTokens = (): Tokens | null => {
  const [state] = useState<Tokens | null>(() => (typeof document === 'undefined' ? null : readTokens()));
  return state;
};

/**
 * Numeric part of a CSS length, for ordering a scale by size rather than by a hardcoded list.
 * Returns `null` for anything that is not a plain length, so unparseable values sort last instead of
 * silently becoming 0 and jumping to the front.
 */
export const px = (value: string): number | null => {
  const match = value.match(/^(-?[\d.]+)px$/);
  return match ? Number(match[1]) : null;
};
