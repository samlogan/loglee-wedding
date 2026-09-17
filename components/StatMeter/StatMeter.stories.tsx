import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor, within } from 'storybook/test';

import StatMeter from '.';

/**
 * `Foundations`, not `Surfaces`.
 *
 * The group test is "has no domain meaning and no content of its own — a primitive, or structural
 * infrastructure", and a meter answers yes to both halves: it takes a label, a number and the top of
 * a scale and draws a bar, knowing nothing about players, weddings or stats. It does not present
 * *other* content the way `Surfaces/Card` and `Surfaces/Accordion` do — it presents its own datum,
 * which is the same relationship `Foundations/Button` has with its label.
 */
const meta = {
  title: 'Foundations/Stat Meter',
  component: StatMeter,
  tags: ['autodocs'],
  parameters: {
    // The meter itself, rather than the page frame it sits on, so /review-design compares the
    // component against the component.
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=1-208'
    }
  },
  args: {
    label: 'Dance',
    score: 8
  },
  decorators: [
    /*
     * 183px is the width the comp gives one of its three meters inside the 624px card
     * (node 1:208), inside a gutter so the bar is not flush against the canvas edge. The meter is a
     * block box and takes its width from here, so without it every story would measure a 1440px bar.
     *
     * Two elements rather than one carrying both properties: the reset puts every `div` on
     * `box-sizing: border-box`, so `width: 183px; padding: 24px` would leave the meter 135px and
     * every story would be measured at a width the comp never draws.
     */
    (Story) => (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <div style={{ width: '183px' }}>
          <Story />
        </div>
      </div>
    )
  ]
} satisfies Meta<typeof StatMeter>;

export default meta;

type Story = StoryObj<typeof meta>;

const meterOf = (canvasElement: HTMLElement, name: string | RegExp) =>
  within(canvasElement).getByRole('meter', { name });

/** The painted bar is the meter's second child; its fill is the only element carrying a width. */
const fillOf = (meter: HTMLElement) => meter.lastElementChild?.firstElementChild as HTMLElement;
const trackOf = (meter: HTMLElement) => meter.lastElementChild as HTMLElement;

/** How far along the track the fill actually reaches, as a whole percentage. */
const filledPercent = (meter: HTMLElement) =>
  Math.round((fillOf(meter).getBoundingClientRect().width / trackOf(meter).getBoundingClientRect().width) * 100);

/**
 * Which token the fill resolved to, read back off the element.
 *
 * Compared against another custom property on the same element rather than against a literal hex, so
 * the assertion survives a palette change and still fails if the rule stops applying. Both sides are
 * read the same way, so both are in the same notation — a `background-color` read would be `rgb()`
 * against the token's `#rrggbb` and could not be compared at all.
 */
const tokens = (meter: HTMLElement) => {
  const style = getComputedStyle(meter);
  return {
    fill: style.getPropertyValue('--meter-fill').trim(),
    accent: style.getPropertyValue('--button-accent-bg').trim(),
    icon: style.getPropertyValue('--fg-icon').trim()
  };
};

/**
 * The comp's "DANCE 8/10" meter (node 1:208), and where the assistive-technology contract is pinned.
 *
 * Every `aria-value*` is asserted rather than eyeballed, because a bar is exactly the kind of
 * graphic whose meaning lives entirely in attributes nobody can see. `aria-valuetext` in particular:
 * without it a screen reader may report a meter as a percentage, and "80%" is the wrong unit for a
 * stat that is printed as a count out of ten.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const meter = meterOf(canvasElement, /^dance$/i);

    /*
     * The name comes from `aria-label`, which carries the same string as the visible label — the
     * uppercasing is `text-transform`, so it is a presentation difference rather than a different
     * word, and WCAG 2.5.3 (Label in Name) holds.
     */
    await expect(meter).toHaveAccessibleName(/^dance$/i);
    await expect(meter).toHaveAttribute('aria-valuenow', '8');
    await expect(meter).toHaveAttribute('aria-valuemin', '0');
    await expect(meter).toHaveAttribute('aria-valuemax', '10');
    await expect(meter).toHaveAttribute('aria-valuetext', '8 of 10');

    // The score is legible without the bar — the whole reason a colour rule is allowed to exist here.
    await expect(within(meter).getByText('8/10')).toBeVisible();

    await waitFor(async () => {
      await expect(filledPercent(meter)).toBe(80);

      /*
       * Polled, and checked for emptiness, for the reason `FieldCheckbox`'s stories are: every token
       * here resolves through `[data-theme]`, which the preview sets on `<body>`, and until it lands
       * *both* sides of this comparison are the empty string and would match each other. The
       * emptiness check is what turns "the theme has not arrived" from a pass into a timeout.
       */
      const { accent, fill, icon } = tokens(meter);
      await expect(fill).not.toBe('');
      await expect(fill).toBe(icon);
      await expect(fill).not.toBe(accent);
    });
  }
};

/**
 * The comp's "NAVIGATION 3/10" meter — the one bar drawn in signal rather than pine.
 *
 * Measured at 4×, the two high scores in the file (8/10 and 9/10) are both `#1e4632` and this one is
 * `#d6ff3b`; the schema has no colour field, so the switch is derived from the value. This is the
 * story that fails if that derivation is removed or inverted.
 */
export const LowScore: Story = {
  args: { label: 'Navigation', score: 3 },
  play: async ({ canvasElement }) => {
    const meter = meterOf(canvasElement, /^navigation$/i);

    await expect(meter).toHaveAttribute('aria-valuenow', '3');

    await waitFor(async () => {
      await expect(filledPercent(meter)).toBe(30);

      const { accent, fill, icon } = tokens(meter);
      await expect(fill).not.toBe('');
      await expect(fill).toBe(accent);
      await expect(fill).not.toBe(icon);
    });
  }
};

/** The floor of the scale. The bar is empty and the value is still announced and printed. */
export const ZeroScore: Story = {
  args: { label: 'Patience', score: 0 },
  play: async ({ canvasElement }) => {
    const meter = meterOf(canvasElement, /^patience$/i);

    await expect(meter).toHaveAttribute('aria-valuenow', '0');
    await expect(meter).toHaveAttribute('aria-valuetext', '0 of 10');
    await expect(within(meter).getByText('0/10')).toBeVisible();

    // Zero is the only score with nothing to see, which is exactly why the text has to carry it.
    await waitFor(async () => {
      await expect(filledPercent(meter)).toBe(0);
      await expect(tokens(meter).fill).not.toBe('');
    });
  }
};

/** The top of the scale. The fill reaches the end of the track without overshooting its pill. */
export const FullScore: Story = {
  args: { label: 'Snacks', score: 10 },
  play: async ({ canvasElement }) => {
    const meter = meterOf(canvasElement, /^snacks$/i);

    await expect(meter).toHaveAttribute('aria-valuenow', '10');
    await expect(meter).toHaveAttribute('aria-valuetext', '10 of 10');

    await waitFor(async () => {
      await expect(filledPercent(meter)).toBe(100);
    });
  }
};

/**
 * A scale that is not the Studio's `0`–`10`.
 *
 * `max` exists so the printed fraction and the drawn proportion cannot disagree: 4 on a five-point
 * scale is 80% full and reads "4/5", where a hard-coded ten would draw the same bar and print
 * "4/10". The low-score rule follows the scale rather than the number, so 4 here is above half and
 * takes the ordinary ink even though 4/10 would not.
 */
export const CustomScale: Story = {
  args: { label: 'Karaoke', max: 5, score: 4 },
  play: async ({ canvasElement }) => {
    const meter = meterOf(canvasElement, /^karaoke$/i);

    await expect(meter).toHaveAttribute('aria-valuemax', '5');
    await expect(meter).toHaveAttribute('aria-valuetext', '4 of 5');
    await expect(within(meter).getByText('4/5')).toBeVisible();

    await waitFor(async () => {
      await expect(filledPercent(meter)).toBe(80);

      const { fill, icon } = tokens(meter);
      await expect(fill).not.toBe('');
      await expect(fill).toBe(icon);
    });
  }
};

/**
 * A score the Studio's validation should have caught.
 *
 * `Rule.required().min(0).max(10)` stops an editor typing 12 in the form; it does not stop a
 * document being written through the API, and `max` is a prop anyone can pass. Unclamped this
 * renders a 120%-wide fill that escapes its track and an `aria-valuenow` outside its own declared
 * range, which is an invalid state a screen reader may report however it likes.
 */
export const OutOfRange: Story = {
  args: { label: 'Enthusiasm', score: 12 },
  play: async ({ canvasElement }) => {
    const meter = meterOf(canvasElement, /^enthusiasm$/i);

    await expect(meter).toHaveAttribute('aria-valuenow', '10');
    await expect(meter).toHaveAttribute('aria-valuetext', '10 of 10');
    await expect(within(meter).getByText('10/10')).toBeVisible();

    await waitFor(async () => {
      await expect(filledPercent(meter)).toBe(100);
    });
  }
};
