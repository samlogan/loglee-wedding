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
    (Story, context) => {
      /*
       * A story can pin a theme through `parameters.forceTheme` rather than the toolbar global; see
       * `DarkTheme` below for why it has to. Absent, nothing is added and the toolbar still drives
       * every other story here.
       */
      const forced = context.parameters.forceTheme as 'dark' | 'light' | undefined;

      return (
        <div
          data-theme={forced}
          style={{ padding: 'var(--spacing-lg)', backgroundColor: forced ? 'var(--bg-default)' : undefined }}
        >
          <div style={{ width: '183px' }}>
            <Story />
          </div>
        </div>
      );
    }
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
     * The name comes from `aria-label`, which carries the sentence-case string. The visible run is
     * the same word upper-cased by `text-transform` — and that transform *does* reach a name computed
     * from contents, so an `aria-labelledby` pointed at that span would name this element "DANCE"
     * instead. The attribute is the one naming path the stylesheet cannot touch, which is why it is
     * the one used.
     */
    await expect(meter).toHaveAccessibleName(/^dance$/i);
    await expect(meter).toHaveAttribute('aria-valuenow', '8');
    await expect(meter).toHaveAttribute('aria-valuemin', '0');
    await expect(meter).toHaveAttribute('aria-valuemax', '10');
    await expect(meter).toHaveAttribute('aria-valuetext', '8 of 10');

    /*
     * The score is legible without the bar — the whole reason a colour rule is allowed to exist here,
     * and the whole reason the low fill's 1.23:1 against its track is exempt from WCAG 1.4.11 rather
     * than failing it: the bar is a redundant second presentation of a datum that is already text.
     *
     * `toBeVisible()` is not enough on its own to protect that. It reads `display`, `visibility`,
     * `opacity` and `hidden`, and knows nothing about `aria-hidden` — so hiding the fraction from
     * assistive technology, which is the tempting fix for the double-announcement noted in
     * `index.tsx`, would keep this line green while removing the exemption underneath it.
     */
    await expect(within(meter).getByText('8/10')).toBeVisible();
    await expect(within(meter).getByText('8/10')).not.toHaveAttribute('aria-hidden');

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

      /*
       * The bar's drawn geometry, which is the whole of what a design review measures here and was
       * previously stated only in the stylesheet. All three come straight off the comp: a 6px track
       * (node 1:214) under a 6px gap (node 1:208 is 29px tall = 17 + 6 + 6).
       *
       * This is the half of the suite that needs a real browser rather than jsdom — none of these
       * numbers exists without a layout engine.
       */
      const track = trackOf(meter);
      await expect(getComputedStyle(track).height).toBe('6px');
      await expect(getComputedStyle(meter).rowGap).toBe('6px');

      /*
       * And the fill takes the track's pill rather than declaring one, which is what makes the left
       * cap sit inside the track's own cap. Compared between the two elements rather than against a
       * literal, because the interesting property is `inherit` holding — the resolved value is
       * `--radius-full` (200px), which the browser then clamps to 3px on a 6px bar. That clamp is
       * the comp's stated radius (`rounded-[3px]` on every track and fill in the band) and it is
       * invisible to `getComputedStyle`, so it is asserted as the pill intent, not as "3px".
       */
      await expect(getComputedStyle(fillOf(meter)).borderRadius).toBe(getComputedStyle(track).borderRadius);

      /*
       * The capitals are `text-transform`, so every text assertion above reads the sentence-case
       * string and none of them can see it. Without this, removing the declaration renders "Dance"
       * where the comp draws "DANCE" and the suite stays green.
       */
      await expect(getComputedStyle(meter.querySelector('span > span') as HTMLElement).textTransform).toBe('uppercase');
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

      // Below half, so the ink is the accent — the fill has no width to show it with, but the rule
      // still has to fire, and a second guard on it costs one line.
      const { accent, fill } = tokens(meter);
      await expect(fill).not.toBe('');
      await expect(fill).toBe(accent);
    });
  }
};

/*
 * The two stories below exist to pin `LOW_SCORE_RATIO` at 0.5 *from both sides*, which nothing did.
 *
 * `LowScore` (3/10) and `Default` (8/10) between them only prove the threshold sits somewhere in
 * (0.3, 0.8] — so the derived midpoint, which is the longest comment block in `index.tsx` and one of
 * the four calls this component was reviewed on, was free to be retuned to 0.4 or 0.7 with the suite
 * still green. 5/10 taking the ordinary ink rules out everything above 0.5 and rules out `<=`;
 * 4/10 taking the accent rules out everything at or below 0.4. Together they leave (0.4, 0.5] with a
 * strict `<`, which is the rule as written.
 */

/**
 * Exactly half. Takes the **ordinary** ink: the rule is "below half", not "at most half".
 *
 * The boundary case is the one worth a story because it is the one an off-by-one gets wrong, and
 * because `<` versus `<=` is otherwise invisible — every other score in the suite is well clear of
 * the line in one direction or the other.
 */
export const AtThreshold: Story = {
  args: { label: 'Patience', score: 5 },
  play: async ({ canvasElement }) => {
    const meter = meterOf(canvasElement, /^patience$/i);

    await expect(meter).toHaveAttribute('aria-valuenow', '5');

    await waitFor(async () => {
      await expect(filledPercent(meter)).toBe(50);

      const { accent, fill, icon } = tokens(meter);
      await expect(fill).not.toBe('');
      await expect(fill).toBe(icon);
      await expect(fill).not.toBe(accent);
    });
  }
};

/** One below the threshold, and the first score that takes the accent. The other half of the pin. */
export const BelowThreshold: Story = {
  args: { label: 'Mornings', score: 4 },
  play: async ({ canvasElement }) => {
    const meter = meterOf(canvasElement, /^mornings$/i);

    await expect(meter).toHaveAttribute('aria-valuenow', '4');

    await waitFor(async () => {
      await expect(filledPercent(meter)).toBe(40);

      const { accent, fill, icon } = tokens(meter);
      await expect(fill).not.toBe('');
      await expect(fill).toBe(accent);
      await expect(fill).not.toBe(icon);
    });
  }
};

/**
 * The same 8/10 meter on the dark theme, where the stylesheet makes a claim worth holding it to.
 *
 * `--fg-icon` was chosen over `--button-primary-bg` on the argument that it "keeps the *relationship*
 * the comp draws — the low fill stays the louder of the two on both surfaces". Nothing rendered that.
 * On dark the ordinary fill is pine/100 and the low fill is signal/300, so the claim is testable:
 * the two inks must stay distinct, and both must stay clear of the track.
 *
 * One thing this story makes visible rather than asserts, because it is a design observation and not
 * a rule: on dark `--fg-accent` resolves to signal/300 too, so the meter's *label* and a *low fill*
 * are the same colour, while an ordinary fill is a third. Measured at 4.66:1 (ordinary) and 5.88:1
 * (low) against the track, both comfortably clear of 3:1 — where the light theme's low pair is
 * 1.23:1. Dark is the better-contrasted of the two surfaces here, which is the opposite of the usual
 * worry and the reason it is worth having on the page.
 */
export const DarkTheme: Story = {
  parameters: { forceTheme: 'dark' },
  play: async ({ canvasElement }) => {
    const meter = meterOf(canvasElement, /^dance$/i);
    const surface = meter.closest('[data-theme]') as HTMLElement;

    // Synchronous: the decorator sets the attribute during the first render. A story-level
    // `globals: { theme: 'dark' }` would only land on a later one — measured at 5209ms against a
    // 102ms mount, so there is no `waitFor` timeout worth guessing. See the twin note in
    // `PlayerCard.stories.tsx`.
    await expect(surface.dataset.theme).toBe('dark');

    await waitFor(async () => {
      const { accent, fill, icon } = tokens(meter);
      await expect(fill).not.toBe('');
      await expect(fill).toBe(icon);
      await expect(fill).not.toBe(accent);

      // …and the bar is still drawn, which is the failure mode a theme flip actually produces: a
      // fill that resolves to the same ink as its track reads as no bar rather than as a wrong one.
      await expect(getComputedStyle(meter).getPropertyValue('--meter-track').trim()).not.toBe(fill);
      await expect(filledPercent(meter)).toBe(80);
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
