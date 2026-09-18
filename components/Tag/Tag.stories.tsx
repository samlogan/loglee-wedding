import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor, within } from 'storybook/test';

import Tag from '.';

/**
 * `Foundations`, not `Content` and not `Surfaces`.
 *
 * The group test is "has no domain meaning and no content of its own — a primitive, or structural
 * infrastructure", and a chip answers yes to both halves: it takes a word and draws a box round it,
 * knowing nothing about weddings, venues or schedules. It does not *present other content* the way
 * `Surfaces/Card` does — it presents its own label, the same relationship `Foundations/Button` has
 * with its own. And the string arriving from the CMS does not make it `Content/`: by that test every
 * primitive in the system would be editorial.
 */
const meta = {
  title: 'Foundations/Tag',
  component: Tag,
  tags: ['autodocs'],
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=16-257'
    }
  },
  args: {
    label: 'Tree Cathedral'
  },
  decorators: [
    /*
     * A padded surface, so a chip is measured with air round it rather than flush against the canvas
     * edge — and so a `theme`-inverted chip is visibly inverted *against* something.
     *
     * The wrapper paints `--bg-default` rather than nothing, which is the page the design draws
     * these on. It carries no `data-theme` of its own: the toolbar drives the page theme, and each
     * chip's own `theme` prop drives the chip.
     */
    (Story) => (
      <div style={{ padding: 'var(--spacing-lg)', backgroundColor: 'var(--bg-default)' }}>
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof Tag>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The chip itself. There is exactly one `<span>` in every story here, and it is the whole component. */
const tagOf = (canvasElement: HTMLElement, label: string) => within(canvasElement).getByText(label);

/** sRGB relative luminance, per WCAG 2.1 — the input to every contrast ratio below. */
const luminance = (rgb: string) => {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const channel = (value: number) => {
    const fraction = value / 255;
    return fraction <= 0.039_28 ? fraction / 12.92 : ((fraction + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (foreground: string, background: string) => {
  const [lighter, darker] = [luminance(foreground), luminance(background)].toSorted((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

/** The alpha channel of an `rgb()` / `rgba()` string. `rgb(…)` with no fourth component is opaque. */
const alphaOf = (rgb: string) => Number((rgb.match(/[\d.]+/g) ?? [])[3] ?? 1);

/**
 * The default: a filled chip at the middle step.
 *
 * `filled` rather than `outline` because five of the six instances the design draws are filled, and
 * because it is the safe default — a filled chip is legible wherever it lands, and an outline one is
 * legible only over a plain surface.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const tag = tagOf(canvasElement, 'Tree Cathedral');

    await expect(tag.tagName).toBe('SPAN');
    await waitFor(async () => {
      const styles = getComputedStyle(tag);
      // The opaque fill, which is the whole legibility mechanism.
      await expect(alphaOf(styles.backgroundColor)).toBe(1);
      await expect(styles.borderRadius).toBe('4px');
      await expect(styles.fontFamily).toContain('JetBrains Mono');
      // `size` is the box, not the type: `--body-2xs` is fluid(10px, 11px) at every step.
      await expect(Number.parseFloat(styles.fontSize)).toBeGreaterThanOrEqual(10);
      await expect(Number.parseFloat(styles.fontSize)).toBeLessThanOrEqual(11);
    });
  }
};

/**
 * The thing this component exists to be, stated as an assertion rather than as a comment.
 *
 * `Button` and `Link` are the only other chip-shaped things in the repo and both render a control —
 * a `<button>` or an `<a>` — which would put a fake stop in the tab order for something that does
 * nothing when you press it. Nothing here is focusable, nothing carries a role, and nothing carries
 * a handler.
 */
export const NotInteractive: Story = {
  play: async ({ canvasElement }) => {
    const tag = tagOf(canvasElement, 'Tree Cathedral');

    await expect(tag.tagName).toBe('SPAN');
    await expect(tag.getAttribute('role')).toBeNull();
    await expect(tag.getAttribute('tabindex')).toBeNull();
    await expect(tag.matches('a, button, input, select, textarea, [tabindex], [onclick]')).toBe(false);
    await expect(canvasElement.querySelectorAll('a, button, [tabindex]')).toHaveLength(0);
  }
};

/** The opaque treatment — an inked surface the label sits on, whatever is behind it. */
export const Filled: Story = {
  args: { variant: 'filled' },
  play: async ({ canvasElement }) => {
    const tag = tagOf(canvasElement, 'Tree Cathedral');

    await waitFor(async () => {
      const styles = getComputedStyle(tag);
      await expect(alphaOf(styles.backgroundColor)).toBe(1);
      await expect(styles.borderTopWidth).toBe('0px');
      await expect(contrast(styles.color, styles.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    });
  }
};

/**
 * The stroked treatment — `ScheduleSection`'s location chip, and the one place the label and the
 * rule are the same ink by construction (`border-color: currentColor`).
 */
export const Outline: Story = {
  args: { variant: 'outline' },
  play: async ({ canvasElement }) => {
    const tag = tagOf(canvasElement, 'Tree Cathedral');

    await waitFor(async () => {
      const styles = getComputedStyle(tag);
      await expect(styles.borderTopWidth).toBe('1px');
      await expect(styles.borderTopStyle).toBe('solid');
      // `currentColor`, so the rule and the label cannot drift apart.
      await expect(styles.borderTopColor).toBe(styles.color);
      await expect(alphaOf(styles.backgroundColor)).toBe(0);
    });
  }
};

/** The caption step — the file badge and the `IMAGE · …` captions (8×4 at desktop). */
export const Small: Story = { args: { size: 'sm' } };

/** The middle step — the schedule's location chip and the bordered venue caption (10×6). */
export const Medium: Story = { args: { size: 'md' } };

/** The pill step — the location pills over the Lodge aerial (12×8). */
export const Large: Story = { args: { size: 'lg' } };

/**
 * The three steps side by side, and the invariant that matters most to a consuming section:
 * **`variant` does not change the outer box.** The stroke is subtracted from the padding, so an
 * outline chip and a filled chip at the same `size` measure the same.
 */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-start' }}>
      <Tag label="Small" size="sm" />
      <Tag label="Medium" size="md" />
      <Tag label="Large" size="lg" />
      <Tag label="Small" size="sm" variant="outline" />
      <Tag label="Medium" size="md" variant="outline" />
      <Tag label="Large" size="lg" variant="outline" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [small, medium, large, smallOutline, mediumOutline, largeOutline] = [
      ...canvasElement.querySelectorAll('span')
    ] as HTMLElement[];

    await waitFor(async () => {
      const heightOf = (element: HTMLElement) => element.getBoundingClientRect().height;

      // Monotonic: each step is a larger box than the one below it.
      await expect(heightOf(small)).toBeLessThan(heightOf(medium));
      await expect(heightOf(medium)).toBeLessThan(heightOf(large));

      // And the stroke costs no box, at every step.
      await expect(heightOf(smallOutline)).toBeCloseTo(heightOf(small), 1);
      await expect(heightOf(mediumOutline)).toBeCloseTo(heightOf(medium), 1);
      await expect(heightOf(largeOutline)).toBeCloseTo(heightOf(large), 1);
    });
  }
};

/**
 * Pinned light, whatever the page is.
 *
 * The attribute goes on the chip itself, so the whole `[data-theme]` block in `_variables.scss`
 * re-points beneath one element.
 */
export const LightTheme: Story = {
  args: { theme: 'light' },
  play: async ({ canvasElement }) => {
    const tag = tagOf(canvasElement, 'Tree Cathedral');

    await expect(tag.dataset.theme).toBe('light');
    await waitFor(async () => {
      const styles = getComputedStyle(tag);
      // stone/50 under pine/600 — the caption chips' drawn pair (nodes 16:137, 16:258, 16:644).
      await expect(styles.backgroundColor).toBe('rgb(243, 241, 234)');
      await expect(styles.color).toBe('rgb(30, 70, 50)');
    });
  }
};

/** Pinned dark — the Lodge pill, drawn on a page that is otherwise light. */
export const DarkTheme: Story = {
  args: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    const tag = tagOf(canvasElement, 'Tree Cathedral');

    await expect(tag.dataset.theme).toBe('dark');
    await waitFor(async () => {
      const styles = getComputedStyle(tag);
      // pine/600 under stone/50 — the pills' drawn pair (nodes 16:152, 16:261/263/265).
      await expect(styles.backgroundColor).toBe('rgb(30, 70, 50)');
      await expect(styles.color).toBe('rgb(243, 241, 234)');
      // Never signal/300: the accent token is reserved for interactive states and this is not one.
      await expect(styles.color).not.toBe('rgb(214, 255, 59)');
    });
  }
};

/**
 * The same dark chip, reached by **inheritance** rather than by the prop — a filled tag with no
 * `theme` of its own, inside a themed region.
 *
 * Worth a story of its own because it exercises the mechanism rather than the attribute. The filled
 * ink is the one value that differs between the two themes, and it is carried as an inherited custom
 * property declared on the theme element rather than by a `[data-theme='dark'] .tag` descendant
 * selector — so that the *nearest* theme wins.
 */
export const InheritedDarkTheme: Story = {
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ padding: 'var(--spacing-lg)', backgroundColor: 'var(--bg-default)' }}>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const tag = tagOf(canvasElement, 'Tree Cathedral');

    // The chip carries nothing itself — the ink comes down the tree.
    await expect(tag.dataset.theme).toBeUndefined();
    await waitFor(async () => {
      const styles = getComputedStyle(tag);
      await expect(styles.backgroundColor).toBe('rgb(30, 70, 50)');
      await expect(styles.color).toBe('rgb(243, 241, 234)');
    });
  }
};

/**
 * The nested inversion, which is the case a descendant selector gets wrong: a light region inside a
 * dark one, with the chip inside the light region.
 *
 * `[data-theme='dark'] .tag` would match here — there *is* a dark ancestor — and paint the label
 * off-white on an off-white fill. Inheritance asks the right question instead, so the nearest theme
 * wins and the chip comes out as the light pair. `sections/TwoColumnListSection` puts the inverse
 * theme on an inset panel, so this is a shape the codebase already has.
 */
export const NestedThemeInversion: Story = {
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ padding: 'var(--spacing-lg)', backgroundColor: 'var(--bg-default)' }}>
        <div data-theme="light" style={{ padding: 'var(--spacing-lg)', backgroundColor: 'var(--bg-default)' }}>
          <Story />
        </div>
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const tag = tagOf(canvasElement, 'Tree Cathedral');

    await waitFor(async () => {
      const styles = getComputedStyle(tag);
      await expect(styles.backgroundColor).toBe('rgb(243, 241, 234)');
      await expect(styles.color).toBe('rgb(30, 70, 50)');
      await expect(contrast(styles.color, styles.backgroundColor)).toBeGreaterThanOrEqual(7);
    });
  }
};

/** Capitals from CSS. Off by default, so a chip that prints a file name reproduces it verbatim. */
export const Uppercase: Story = {
  args: { uppercase: true },
  play: async ({ canvasElement }) => {
    const tag = tagOf(canvasElement, 'Tree Cathedral');

    await expect(getComputedStyle(tag).textTransform).toBe('uppercase');
    /*
     * The *stored* string is still sentence case, which is the half that matters for assistive
     * technology: Chromium names an element from its rendered text, so `text-transform` does not
     * keep capitals out of the accessibility tree — only authoring in sentence case does.
     */
    await expect(tag.textContent).toBe('Tree Cathedral');
  }
};

/**
 * The hairline treatment — a dark chip over a dark photograph (node 16:152), where the fill alone
 * does not separate the box from the image.
 */
export const Bordered: Story = {
  args: { bordered: true, theme: 'dark' },
  play: async ({ canvasElement }) => {
    const tag = tagOf(canvasElement, 'Tree Cathedral');

    await waitFor(async () => {
      const styles = getComputedStyle(tag);
      await expect(styles.borderTopWidth).toBe('1px');
      // Muted against the chip's own fill rather than against whatever is behind it.
      await expect(alphaOf(styles.borderTopColor)).toBeLessThan(1);
    });
  }
};

/**
 * The loud register — JetBrains Mono Bold, which is how the location pills are drawn.
 *
 * Tracked at 0.1em rather than the role's loud 0.2em: the comp sets 1.1px on 11px. `Tag` re-points
 * `--mono-letter-spacing-loud` for the whole component so no pill has to.
 */
export const Bold: Story = {
  args: { size: 'lg', uppercase: true, weight: 'bold' },
  play: async ({ canvasElement }) => {
    const tag = tagOf(canvasElement, 'Tree Cathedral');

    await waitFor(async () => {
      const styles = getComputedStyle(tag);
      await expect(styles.fontWeight).toBe('700');
      // 0.1em of the resolved font size, not the 0.2em the bold register would otherwise take.
      await expect(Number.parseFloat(styles.letterSpacing)).toBeCloseTo(Number.parseFloat(styles.fontSize) * 0.1, 1);
    });
  }
};

/** The quiet register at its lightest — the caption chips, which the comp sets in Regular. */
export const Regular: Story = {
  args: { label: 'IMAGE · lodge-aerial.jpg · pines + river + pool', size: 'sm', weight: 'regular' },
  play: async ({ canvasElement }) => {
    const tag = tagOf(canvasElement, 'IMAGE · lodge-aerial.jpg · pines + river + pool');

    await waitFor(async () => expect(getComputedStyle(tag).fontWeight).toBe('400'));
  }
};

/**
 * The explicit AC: a pill stays legible over a photograph, in both themes, at every viewport.
 *
 * Legibility here is a property of the chip and not of the image, and that is the point of asserting
 * it rather than eyeballing it — the fill is **fully opaque**, so the label's contrast is against a
 * known colour and the photograph underneath cannot lower it. Both pairings clear WCAG AAA for
 * small text (7:1) with room to spare.
 */
export const OverPhotograph: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div
      style={{
        position: 'relative',
        minHeight: '260px',
        /*
         * A synthetic worst case rather than a dataset photograph, and deliberately so.
         *
         * `mockImageUrl` falls back to a flat grey placeholder whenever the committed fixtures hold
         * no raster assets — which they currently do not — so a real-image story would quietly become
         * a chip on a plain rectangle, the one background against which a legibility check proves
         * nothing. This ramp puts hard-edged near-black **and** near-white directly under every chip
         * below, at every viewport, which no photograph exceeds. If the chips read here they read
         * anywhere.
         *
         * A literal pair of hex values is right for the same reason the rest of the file has none:
         * this is the adversary, not a surface the design system owns.
         */
        backgroundImage: 'repeating-linear-gradient(115deg, #05070a 0 40px, #f7f7f5 40px 80px)'
      }}
    >
      {/*
       * The idiom a consuming section should copy: the frame is `position: relative`, the chip's own
       * class holds `position: absolute` and its insets, and **nothing else**. Every other property
       * of the chip belongs to `Tag`.
       */}
      <div style={{ position: 'absolute', insetBlockStart: '16px', insetInlineStart: '16px' }}>
        <Tag label="IMAGE · lodge-aerial.jpg" size="sm" theme="light" weight="regular" />
      </div>
      <div
        style={{
          position: 'absolute',
          insetBlockEnd: '24px',
          insetInlineStart: '24px',
          display: 'flex',
          gap: 'var(--spacing-xs)'
        }}
      >
        <Tag label="Tree Cathedral" size="lg" theme="dark" uppercase weight="bold" />
        <Tag label="Wedding Hall" size="lg" theme="dark" uppercase weight="bold" />
        <Tag label="Pool" size="lg" theme="dark" uppercase weight="bold" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const tags = [...canvasElement.querySelectorAll('span')] as HTMLElement[];

    await expect(tags).toHaveLength(4);
    await waitFor(async () => {
      for (const tag of tags) {
        const styles = getComputedStyle(tag);
        // Opaque, so the photograph behind it is not part of the contrast calculation.
        await expect(alphaOf(styles.backgroundColor)).toBe(1);
        await expect(contrast(styles.color, styles.backgroundColor)).toBeGreaterThanOrEqual(7);
      }
    });
  }
};

/**
 * A label longer than the space it is given.
 *
 * `overflow-wrap: anywhere` rather than `break-word`, because only `anywhere` reduces the box's
 * `min-content` contribution — and this box is sized from its own intrinsic width. With
 * `break-word` a long unbreakable run resolves the cap against the whole string and the chip
 * silently overflows instead of wrapping.
 */
export const LongLabel: Story = {
  args: { label: 'The-Tree-Cathedral-And-The-Long-Walk-Down-To-The-River', uppercase: true },
  decorators: [
    (Story) => (
      <div style={{ width: '180px', padding: 'var(--spacing-lg)', backgroundColor: 'var(--bg-default)' }}>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const tag = canvasElement.querySelector('span') as HTMLElement;

    await waitFor(async () => {
      // Wrapped inside the 180px column rather than hanging out of it.
      await expect(tag.getBoundingClientRect().width).toBeLessThanOrEqual(180);
      await expect(tag.getBoundingClientRect().height).toBeGreaterThan(30);
    });
  }
};

/**
 * Nothing rather than an empty box.
 *
 * A chip is a painted surface with padding, so a blank label would publish a small empty rectangle
 * with no accessible name. Every call site guards its own field too; this is the backstop.
 */
export const BlankLabel: Story = {
  args: { label: '   ' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('span')).toHaveLength(0);
  }
};
