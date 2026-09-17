import fonts from '@/config/fonts';

/**
 * What a custom doc-block component has to set for itself.
 *
 * Storybook styles the tags it emits from markdown — `p`, headings, lists, tables — and leaves
 * everything else at the page defaults. Two of those defaults are wrong for a custom block.
 *
 * **Text colour.** `.sbdocs-content` sits at the inherited body colour. Setting a colour on the
 * container instead of per-block would fix bare markup but turn the inline `code` chips unreadable,
 * since those rely on that same inherited value against their own background. So each block sets it
 * on its own root.
 *
 * **Font variables.** `next/font` exposes the families as CSS custom properties. `preview.tsx`
 * applies them to `<body>` at module scope, which covers docs pages — but a block that renders into
 * a portal escapes `<body>`'s class list, and `font-family: var(--body-font), sans-serif` with an
 * empty variable is invalid at computed-value time, so the whole declaration drops and the text
 * silently falls back. `DOCS_FONT` on a block root re-scopes the variables inside it.
 *
 * Both constants look redundant until one of those two failure modes bites, which is why the reasons
 * are written here rather than left to be rediscovered.
 */

/**
 * White because the docs pages are dark — `preview.tsx` sets `parameters.docs.theme` to the same
 * dark `theme.ts` the manager uses. If that theme ever flips to light, this must flip with it; they
 * are one decision, not two.
 */
export const DOCS_TEXT = '#ffffff';

export const DOCS_FONT = fonts;
