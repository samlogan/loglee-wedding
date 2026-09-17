import type { Decorator } from '@storybook/nextjs-vite';

import SectionErrorBoundary from '@/components/SectionErrorBoundary';

/**
 * Shared setup for every `Sections/*` story.
 *
 * ## Why the theme is injected into args rather than set on a wrapper
 *
 * A section writes its own `data-theme` from `getSectionTheme(props)`, which reads
 * `sectionFields.themeOptions.theme`. That attribute sits on the section element itself and so
 * shadows the body-level `data-theme` the toolbar sets — theming the backdrop does nothing visible.
 * The theme is a prop the section reads, not a value it inherits, so the only thing that works is
 * overriding the arg.
 *
 * A story that pins its own theme still wins (`storyTheme ?? toolbar`). That is deliberate: a
 * per-theme story would otherwise render identically to Default.
 *
 * ## Why the toolbar sometimes appears to do nothing
 *
 * `getSectionTheme(props, fallbackTheme)` returns the editor-selected theme, or the fallback when
 * none is set — so a section whose fixture pins a theme ignores the toolbar, correctly, and looks
 * indistinguishable from a broken decorator without this note. Check the fixture before assuming the
 * toolbar is at fault.
 *
 * Some projects extend the helper with an allow-list third argument, constraining a section to the
 * themes it was designed for; a selection outside that list then resolves to the fallback. This
 * repo's helper has no such argument — if one is added, a per-theme story can render identically to
 * `Default` and document nothing, so check the allow-list before writing one.
 *
 * ## Why this file exports a decorator and not a `sectionStory()` factory
 *
 * Storybook indexes stories by **parsing** the file, not running it, so a default export built from
 * a shared function call fails with "CSF: default export must be an object". Only decorators and
 * args helpers can be shared; each story file keeps its own `meta` object literal.
 */
export const sectionDecorator: Decorator = (Story, context) => {
  // `Sections/` is a contract, not a label. Renaming the group silently disables this decorator, the
  // error boundary below, and the full-width docs preview — which is why `audit:groups` enforces it.
  if (typeof context.title !== 'string' || !context.title.startsWith('Sections/')) {
    return <Story />;
  }

  const existing = (context.args.sectionFields as Record<string, unknown>) ?? {};
  const themeOptions = (existing.themeOptions as Record<string, unknown>) ?? {};
  const args = {
    ...context.args,
    sectionFields: {
      ...existing,
      // Spread the existing themeOptions rather than replacing them — `spacingOptions` and other
      // siblings live here too, and today themeOptions holds only `theme`, but assuming that is how
      // a sibling key gets quietly dropped later.
      themeOptions: {
        ...themeOptions,
        theme: themeOptions.theme ?? (context.globals.theme as string) ?? 'light'
      }
    }
  };

  return (
    /*
     * `resetKeys` so a caught error clears when the reviewer changes something. Without it the
     * boundary latches: one throwing control combination would pin its stack trace across every
     * later control and theme change, and the section would look broken in all of them.
     *
     * `args` is included deliberately even though its identity churns — that is what makes a control
     * change reset it. It cannot loop: after a reset the children rethrow and `componentDidUpdate`
     * re-runs against the props of that same render, finds them unchanged, and stops.
     */
    <SectionErrorBoundary name={context.title} resetKeys={[context.id, context.globals.theme, args]} showDetails>
      {/*
       * The marker `.storybook/overrides.css` looks for to widen the docs preview. Sections are
       * full-width page furniture and Storybook's docs column is 1000px, so without this they render
       * at roughly tablet width and their breakpoints read as the design rather than as the
       * container.
       *
       * If a section's layout shifts because of this wrapper (a `height: 100%` chain would be the
       * candidate), switch it to `style={{ display: 'contents' }}` — `:has()` is a DOM selector and
       * still matches an element with no box.
       */}
      <div data-section-story>
        <Story args={args} />
      </div>
    </SectionErrorBoundary>
  );
};
