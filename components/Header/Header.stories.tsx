import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { IHeaderDocument } from '@/tools/sanity/schema/documents/headerDocument';
import type { IWeddingSettingsDocument } from '@/tools/sanity/schema/documents/weddingSettings';
import type { IHeaderObject } from '@/tools/sanity/schema/objects/header';
import globalFixture from '@/tools/storybook/globalFixture';
import mockButton from '@/tools/storybook/mockButton';
import mockLink from '@/tools/storybook/mockLink';

import Header from '.';

const navItem = (title: string, pathname: string): IHeaderObject['navItems'][number] => ({
  _key: pathname,
  title,
  link: mockLink({ internalLink: { title, slug: { current: pathname }, pathname } })
});

/**
 * The five links the ticket specifies, which is the design's six with `/kids` dropped.
 *
 * Only a fallback: both singletons are read from the Sanity fixtures first. `globalFixture` returns
 * `undefined` when the key is missing or null — which is what this project's dataset currently
 * yields, since nothing has been published to it yet — and the guards below test the *field* each
 * story renders rather than the object, because a GROQ projection hands back a shaped object with
 * null leaves for a document whose fields are blank, and that object is not nullish. A bare
 * `?? FALLBACK` would not fire for it.
 */
const FALLBACK_HEADER: IHeaderObject = {
  navItems: [
    navItem('The Weekend', '/the-weekend/'),
    navItem('Stay', '/stay/'),
    navItem('The Lodge', '/the-lodge/'),
    navItem('RSVP', '/rsvp/'),
    navItem('FAQ', '/faq/')
  ],
  addButton: true,
  button: mockButton('RSVP', navItem('RSVP', '/rsvp/').link)
};

/** Figma sets the reply-by line as "RSVP by 01.12.26" (nodes 1:78, 1:123). */
const FALLBACK_RSVP_LABEL = 'RSVP by 01.12.26';

const headerFixture = globalFixture<IHeaderDocument>('header');
const settingsFixture = globalFixture<Partial<IWeddingSettingsDocument>>('weddingSettings');

const header: IHeaderObject = headerFixture?.header?.navItems?.length ? headerFixture.header : FALLBACK_HEADER;
const rsvpLabel = settingsFixture?.rsvpLabel || FALLBACK_RSVP_LABEL;
const actionLabel = header.button?.label ?? '';

/**
 * A fixed-width column, so the bar's one breakpoint can be exercised without owning the window.
 *
 * The switch is a **container** query on the header's own inline size, which in the app is the
 * viewport's — so constraining the wrapper is a faithful test of the same rule rather than a
 * stand-in for it. 23.4375rem is the design's 375px phone frame and the narrow anchor of every
 * `fluid()` token; 90rem is 1440px, the wide anchor and the desktop frame.
 */
const Column = ({ children, width }: { children: ReactNode; width: string }) => (
  <div style={{ width, minHeight: '32rem' }}>{children}</div>
);

/** The phone page frame (node 1:102), whose nav is node 1:103. */
const MOBILE_DESIGN = {
  type: 'figma',
  url: 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=1-102'
};

const meta = {
  title: 'Navigation/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    /*
     * The desktop page frame, which is what the unqualified stories are compared against. The two
     * phone-width stories override this with the mobile frame — bound per story rather than once
     * here, so `/review-design` measures each against the frame it was actually built from instead
     * of holding a 375px bar up against a 1280px drawing.
     */
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=1-44'
    },
    // Site chrome is full-width, and a docs page otherwise caps it at the reading column.
    fullBleed: true,
    // `usePathname` is what decides which link is the current page; `appDirectory` is what makes
    // the `next/navigation` mock exist at all.
    nextjs: { appDirectory: true, navigation: { pathname: '/' } }
  },
  args: { header, rsvpLabel }
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `findByRole`, not `getByRole`, and the reason is the container query.
 *
 * A container query cannot be evaluated before its container has been laid out, so on the first
 * style pass the bar renders as though the query did not match: the toggle is `display: none` and
 * the desktop link list is not. The correct layout lands a frame later. Every assertion about which
 * half of the nav exists therefore has to be retried rather than read once — starting with this
 * lookup, which would otherwise throw before the toggle is exposed at all.
 */
const toggleOf = (canvasElement: HTMLElement) => within(canvasElement).findByRole('button', { name: /menu/i });

/**
 * The panel, found the way assistive technology would: through the toggle's `aria-controls`.
 *
 * `CSS.escape` is not decoration. `useId` is free to put characters in an id that are not valid in
 * a CSS selector — React 18 emitted `:r0:`, which throws here unescaped — and `getElementById`,
 * which needs no escaping at all, is auto-rewritten to this by `unicorn/prefer-query-selector`
 * under `yarn fix`. Escaping is the version that survives the formatter.
 */
const panelOf = (toggle: HTMLElement): HTMLElement =>
  document.querySelector(`#${CSS.escape(toggle.getAttribute('aria-controls') ?? '')}`) as HTMLElement;

/** Everything in the bar the keyboard can reach right now — the same rule the trap applies. */
const reachableIn = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter(
    (element) => element.getClientRects().length > 0 && !element.closest('[inert]')
  );

/**
 * The bar at desktop width, on the page its fourth link points at.
 *
 * Asserts both halves of "you are here": `aria-current="page"` on exactly one link, and a rule
 * under it the other four do not have. Neither is sufficient alone — an underline says nothing to a
 * screen reader, and `aria-current` alone leaves a sighted reader guessing.
 */
export const Desktop: Story = {
  decorators: [
    (Story) => (
      <Column width="90rem">
        <Story />
      </Column>
    )
  ],
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: '/rsvp/' } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nav = canvas.getByRole('navigation', { name: 'Primary' });
    const links = within(nav).getAllByRole('link');

    await expect(links.map((link) => link.textContent)).toEqual(['The Weekend', 'Stay', 'The Lodge', 'RSVP', 'FAQ']);

    const current = within(nav).getByRole('link', { current: 'page' });
    await expect(current).toHaveTextContent('RSVP');

    /*
     * The rule is a pseudo-element, so it is read off `::after`. Polled because both the token it
     * is painted in and the transform are settled asynchronously — the theme attribute lands after
     * mount, and the rule transitions. `scaleX(0)` is `matrix(0, 0, 0, 1, 0, 0)` and `scaleX(1)` is
     * the identity; a stylesheet that failed to load reports `none` for both, which is the
     * regression worth catching, since the current page would then look like every other link.
     */
    await waitFor(async () => {
      await expect(getComputedStyle(current, '::after').transform).toBe('matrix(1, 0, 0, 1, 0, 0)');
      await expect(getComputedStyle(links[0], '::after').transform).toBe('matrix(0, 0, 0, 1, 0, 0)');
    });

    // The reply-by line is what the accent pill reads at this width, and it came from the CMS.
    await expect(canvas.getByRole('link', { name: rsvpLabel })).toBeVisible();

    // No hamburger above the breakpoint, and nothing to disclose. Polled for the same reason.
    await waitFor(async () => {
      await expect(canvas.queryByRole('button', { name: /menu/i })).not.toBeInTheDocument();
    });
  }
};

/**
 * The phone bar with the menu closed: wordmark, a short RSVP pill and the two-bar toggle
 * (Figma node 1:103).
 *
 * The important assertion is the negative one. A closed panel is still in the DOM — it has to be,
 * for the fade — so what keeps its links out of the tab order and off a screen reader is
 * `visibility: hidden` plus `inert`. Querying by role is how that gets checked: Testing Library
 * resolves the accessibility tree, so a link that were merely transparent would still be found.
 */
export const MobileClosed: Story = {
  decorators: [
    (Story) => (
      <Column width="23.4375rem">
        <Story />
      </Column>
    )
  ],
  parameters: { design: MOBILE_DESIGN },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = await toggleOf(canvasElement);

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAccessibleName('Open menu');
    await expect(panelOf(toggle)).toHaveAttribute('inert');

    // Neither nav is reachable: the desktop list is `display: none` at this width and the panel is
    // hidden, so nothing announces "The Weekend" until the menu is opened. Polled, because the
    // desktop list *is* exposed for the frame before the container query resolves.
    await waitFor(async () => {
      await expect(canvas.queryAllByRole('link', { name: 'The Weekend' })).toHaveLength(0);
    });

    // The bar still carries the action, in its short form — there is no room for the date here.
    await expect(canvas.getByRole('link', { name: actionLabel })).toBeVisible();
  }
};

/**
 * The menu open, and the whole keyboard contract with it.
 *
 * The design system board (node 1:968) draws the closed bar and the button set but not this state,
 * so the panel is composed from the design's own vocabulary rather than copied — which makes the
 * behaviour, not the pixels, the part worth pinning down here.
 */
export const MobileOpen: Story = {
  decorators: [
    (Story) => (
      <Column width="23.4375rem">
        <Story />
      </Column>
    )
  ],
  parameters: { design: MOBILE_DESIGN, nextjs: { appDirectory: true, navigation: { pathname: '/stay/' } } },
  play: async ({ canvasElement, step }) => {
    const toggle = await toggleOf(canvasElement);
    const panel = panelOf(toggle);
    // The trap's container is the whole bar, so the wordmark and the pill stay reachable above the
    // open panel. Anything outside this element is what focus must not reach.
    const bar = canvasElement.querySelector('header') as HTMLElement;

    await step('The toggle discloses the panel and moves focus into it', async () => {
      await userEvent.click(toggle);

      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(toggle).toHaveAccessibleName('Close menu');
      await expect(panel).not.toHaveAttribute('inert');
      await waitFor(async () => {
        await expect(panel.contains(document.activeElement)).toBe(true);
      });
    });

    await step('The five links and the full reply-by action are now announced', async () => {
      const menu = within(panel);
      /*
       * `getByRole` resolving at all is the accessibility assertion: Testing Library skips anything
       * `display: none`, `visibility: hidden` or `aria-hidden`, which is what the closed panel is.
       * `toBeVisible` adds the opacity check on top, and has to be polled — the fade is still in
       * flight at this point, and jest-dom reads a mid-transition `opacity: 0` as not visible.
       */
      await expect(menu.getAllByRole('link')).toHaveLength(6);
      await waitFor(async () => {
        await expect(menu.getByRole('link', { name: 'The Weekend' })).toBeVisible();
        await expect(menu.getByRole('link', { name: rsvpLabel })).toBeVisible();
      });

      // The current page is announced here too, not only in the desktop list.
      await expect(menu.getByRole('link', { current: 'page' })).toHaveTextContent('Stay');
    });

    await step('Tab never leaves the bar', async () => {
      // Two more presses than there are stops, so the cycle has to come round on itself.
      for (let press = 0; press < reachableIn(bar).length + 2; press += 1) {
        await userEvent.tab();
        await expect(bar.contains(document.activeElement)).toBe(true);
      }
    });

    await step('…and wraps at both ends rather than falling out', async () => {
      const reachable = reachableIn(bar);
      const first = reachable[0];
      const last = reachable.at(-1) as HTMLElement;

      last.focus();
      await userEvent.tab();
      await expect(document.activeElement).toBe(first);

      first.focus();
      await userEvent.tab({ shift: true });
      await expect(document.activeElement).toBe(last);
    });

    await step('Escape closes it and hands focus back to the toggle', async () => {
      await userEvent.keyboard('{Escape}');

      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(panel).toHaveAttribute('inert');
      await waitFor(async () => {
        await expect(toggle).toHaveFocus();
      });
    });
  }
};

/**
 * The menu open, and then the layout grows out from under it.
 *
 * This is a regression test with a nasty failure mode behind it. Above the switch the CSS takes both
 * halves of the disclosure away — the toggle is `display: none` and so is the panel — while
 * `menuOpen` stayed true, because nothing cleared it. The page was left with `overflow: hidden` and
 * no scroll, and the focus trap stayed active over the two controls still in the bar, cycling
 * between them with the rest of the document unreachable: a keyboard trap under WCAG 2.1.2, reached
 * by nothing more exotic than rotating a phone.
 *
 * The column is resized directly rather than the window, because the switch is a container query and
 * the bar's inline size is what it reads — which is the same reason `useHeaderState` watches the bar
 * with a `ResizeObserver` instead of calling `matchMedia`.
 */
export const MobileOpenThenWidened: Story = {
  decorators: [
    (Story) => (
      <Column width="23.4375rem">
        <Story />
      </Column>
    )
  ],
  parameters: { design: MOBILE_DESIGN },
  play: async ({ canvasElement, step }) => {
    const toggle = await toggleOf(canvasElement);
    const panel = panelOf(toggle);
    const column = canvasElement.querySelector('header')?.parentElement as HTMLElement;

    await step('The menu opens and locks the page behind it', async () => {
      await userEvent.click(toggle);
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(document.body.style.overflow).toBe('hidden');
    });

    await step('Widening past the switch closes it and gives the page back', async () => {
      column.style.width = '75rem';

      /*
       * All three assertions inside the `waitFor`, including the two that look like they could
       * follow it. `aria-expanded` flips during the commit, but the scroll lock is released by a
       * `useEffect` cleanup — a passive effect, which React flushes *after* paint. Read straight
       * after the attribute settles, `body.style.overflow` is still `'hidden'` for that gap.
       *
       * Three seconds rather than `waitFor`'s default one. The close waits on a resize, a
       * re-render and a passive effect, and under a full `yarn test` run — dozens of stories
       * sharing one browser, several of them rasterising 3D in software — that chain was measured
       * missing one second while passing every time the file ran alone. The assertions are
       * unchanged; only the patience is.
       */
      await waitFor(
        async () => {
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          // The two things the lockup actually cost: a scrollable page, and a panel out of the tab order.
          await expect(document.body.style.overflow).toBe('');
          await expect(panel).toHaveAttribute('inert');
        },
        { timeout: 3000 }
      );

      /*
       * …and the keyboard user is still somewhere, which is a separate claim from the three above.
       *
       * This is the one close path nobody asked for, so the trap's usual answer is unavailable:
       * `returnFocusRef` is the toggle, and the toggle is `display: none` at this width, which
       * makes `focus()` on it a silent no-op. Meanwhile the panel link that had focus has already
       * been blurred to `<body>` by its own `display: none`. Without a fallback, rotating a tablet
       * mid-menu drops focus at the top of the document.
       */
      const bar = canvasElement.querySelector('header') as HTMLElement;
      await waitFor(async () => {
        await expect(bar.contains(document.activeElement)).toBe(true);
      });
    });

    await step('…and the disclosure still works on the way back down', async () => {
      column.style.width = '23.4375rem';

      const reopened = await toggleOf(canvasElement);
      await userEvent.click(reopened);
      await expect(reopened).toHaveAttribute('aria-expanded', 'true');

      // Left closed, because `document.body` outlives the story and the next one would inherit the
      // scroll lock.
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => {
        await expect(document.body.style.overflow).toBe('');
      });
    });

    /*
     * The same trap again, reached without touching the width the CSS switches at.
     *
     * The switch is `56.25rem`, which is 900px only while the root font size is the default 16px.
     * A reader whose browser default is 12px moves it to 675px — so the band from 675 to 900 is one
     * where the CSS has already taken the toggle *and* the panel away. `useHeaderState` compared
     * against a hardcoded `900` there, and across that band left the menu open behind a layout with
     * no affordance to close it: `overflow: hidden` on the body with nothing to unset it, and the
     * focus trap cycling the two controls still in the bar. The px constant is the bug, so the
     * assertion has to move the root font size rather than only the width.
     *
     * Restored in a `finally` — `document.documentElement` outlives the story, and leaking a 12px
     * root would quietly re-scale every `rem` in the stories that run after this one.
     */
    await step('The switch follows the root font size, not a hardcoded 900px', async () => {
      const root = document.documentElement;
      const previousFontSize = root.style.fontSize;

      try {
        root.style.fontSize = '12px';

        const reopened = await toggleOf(canvasElement);
        await userEvent.click(reopened);
        await expect(reopened).toHaveAttribute('aria-expanded', 'true');

        // Past the container query's 675px, comfortably short of 900. Stated in px on purpose:
        // `rem` here would be re-scaled by the very font size under test.
        column.style.width = '700px';

        await waitFor(async () => {
          await expect(reopened).toHaveAttribute('aria-expanded', 'false');
          await expect(document.body.style.overflow).toBe('');
        });
      } finally {
        root.style.fontSize = previousFontSize;
        column.style.width = '23.4375rem';
      }
    });
  }
};

/**
 * `rsvpLabel` left blank in the Studio, which is a supported state rather than an error.
 *
 * The pill falls back to the action's own label from the header document — "RSVP →", which is
 * exactly what the design draws (node 1:61). Nothing is hardcoded and nothing renders empty.
 */
export const WithoutReplyByDate: Story = {
  args: { rsvpLabel: null },
  decorators: [
    (Story) => (
      <Column width="90rem">
        <Story />
      </Column>
    )
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByRole('link', { name: rsvpLabel })).not.toBeInTheDocument();
    // Scoped past the nav: the action's short label is also the name of one of the five links, so
    // an unscoped query matches two.
    const pill = canvas.getAllByRole('link', { name: actionLabel }).find((link) => !link.closest('nav'));
    await expect(pill).toBeVisible();
  }
};

/**
 * No RSVP action configured at all. The bar keeps its wordmark and its links and simply has no
 * pill — the alternative being a lime control that goes nowhere.
 */
export const WithoutAction: Story = {
  args: { header: { ...header, addButton: false, button: undefined } },
  decorators: [
    (Story) => (
      <Column width="90rem">
        <Story />
      </Column>
    )
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nav = canvas.getByRole('navigation', { name: 'Primary' });

    await expect(within(nav).getAllByRole('link')).toHaveLength(5);
    await expect(canvas.queryByRole('link', { name: rsvpLabel })).not.toBeInTheDocument();
  }
};
