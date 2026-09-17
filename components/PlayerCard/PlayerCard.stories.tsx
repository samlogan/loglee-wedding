import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor, within } from 'storybook/test';

import type { IPlayerMeterStat, IPlayerStat, IPlayerTextStat } from '@/tools/sanity/schema/documents/player';

import PlayerCard from '.';

/**
 * The comp's card, verbatim in shape (Figma node 1:175): four text stats in two columns, a
 * full-width closer, and three meters.
 *
 * The comp prints bracketed placeholders — `[Home town]`, `[Drink]` — which are a content note
 * rather than content. These are real values of comparable length, so the first `/review-design`
 * compares like for like instead of measuring the brackets.
 *
 * Sentence case throughout: the capitals are `text-transform` in the stylesheet, so baking them into
 * the data would put the shouting in the accessible name.
 */
const STATS: IPlayerStat[] = [
  { _key: 'home', _type: 'playerTextStat', label: 'Home town', value: 'Wollongong, NSW', fullWidth: false },
  { _key: 'move', _type: 'playerTextStat', label: 'Special move', value: 'The worm', fullWidth: false },
  { _key: 'weak', _type: 'playerTextStat', label: 'Weakness', value: 'A cheese board', fullWidth: false },
  {
    _key: 'drink',
    _type: 'playerTextStat',
    label: "Favourite drink at Fin's",
    value: 'Espresso martini',
    fullWidth: false
  },
  {
    _key: 'met',
    _type: 'playerTextStat',
    label: 'How we met',
    value: 'A mutual friend put us on the same trivia team, and we lost badly enough to need a second date.',
    fullWidth: true
  },
  { _key: 'dance', _type: 'playerMeterStat', label: 'Dance', score: 8 },
  { _key: 'bbq', _type: 'playerMeterStat', label: 'BBQ', score: 9 },
  { _key: 'nav', _type: 'playerMeterStat', label: 'Navigation', score: 3 }
];

// Narrowed with predicates rather than a bare arrow, so `TEXT_STATS` is a list of text stats to the
// compiler as well as at runtime — `AllFullWidthStats` spreads `fullWidth` onto each one, which a
// plain `IPlayerStat[]` would not accept.
const TEXT_STATS = STATS.filter((stat): stat is IPlayerTextStat => stat._type === 'playerTextStat');
const METER_STATS = STATS.filter((stat): stat is IPlayerMeterStat => stat._type === 'playerMeterStat');

/**
 * The same eight stats, authored the way an editor actually would after a few rounds of edits:
 * meters above, between and below the text stats, and the full-width closer no longer last.
 *
 * Kept as its own constant so `InterleavedOrder` can assert against what it was given rather than
 * against `TEXT_STATS`, which would be asserting the order it wants rather than the order the
 * renderer preserved.
 */
const INTERLEAVED: IPlayerStat[] = [
  METER_STATS[0],
  TEXT_STATS[0],
  METER_STATS[1],
  TEXT_STATS[1],
  TEXT_STATS[4],
  METER_STATS[2],
  TEXT_STATS[2],
  TEXT_STATS[3]
];

const INTERLEAVED_TEXT_LABELS = INTERLEAVED.filter(
  (stat): stat is IPlayerTextStat => stat._type === 'playerTextStat'
).map((stat) => stat.label);

/**
 * `Surfaces`, not `Content`.
 *
 * The card does render CMS copy, which is the `Content` test — but so does every component that ever
 * receives a string, and the four members of that group (`Text`, `TextBlock`, `TextTitle`,
 * `Heading`) are typography renderers whose whole job is the copy itself. This one's job is the
 * box, the bands and the grid; the copy passes through it. "Presents or discloses other content" is
 * the question it actually answers yes to, which is what puts it beside `Surfaces/Card`.
 *
 * Its meter is filed under `Foundations` instead — see the note in `StatMeter.stories.tsx`.
 */
const meta = {
  title: 'Surfaces/Player Card',
  component: PlayerCard,
  tags: ['autodocs'],
  parameters: {
    // The card, not the page frame it sits on, so /review-design compares like for like.
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=1-175'
    }
  },
  args: {
    level: 'LVL 33',
    stats: STATS
  },
  decorators: [
    /*
     * 624px is the card's width in the desktop comp (node 1:175), inside a gutter.
     *
     * Stated in `px` rather than the `rem` a story wrapper would usually use, because the rule under
     * test — the card's container query — is a `px` threshold. A `rem` harness would make these
     * stories depend on the root font size as well as on the rule, so a change to either could move
     * the result and neither would be distinguishable from the other.
     *
     * Two elements, and not one with both properties: the reset puts every `div` on
     * `box-sizing: border-box`, so a single `width: 624px; padding: 24px` box hands the card 576px
     * and every measurement in these stories is quietly taken at the wrong width. Measured — that is
     * how this was found, with the meter band laying out two tracks where the comp draws three.
     */
    (Story) => (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <div style={{ width: '624px' }}>
          <Story />
        </div>
      </div>
    )
  ]
} satisfies Meta<typeof PlayerCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const statsOf = (canvasElement: HTMLElement) => canvasElement.querySelector('dl');

/** The meter band is whatever holds the meters — found through one rather than by position. */
const metersOf = (canvasElement: HTMLElement) =>
  within(canvasElement).queryAllByRole('meter')[0]?.parentElement ?? null;

/**
 * Found through a band rather than by walking down from the canvas: the number of wrappers above the
 * card differs per story (`NarrowColumn` adds a second decorator), so a positional lookup would be
 * right for some stories and silently return a wrapper for others.
 */
const cardOf = (canvasElement: HTMLElement) =>
  (statsOf(canvasElement) ?? metersOf(canvasElement))?.parentElement as HTMLElement;

/** How many tracks the browser actually laid out, which is the question both bands' rules answer. */
const trackCount = (element: Element) => getComputedStyle(element).gridTemplateColumns.split(' ').length;

/**
 * The comp's card at the comp's width.
 *
 * Pins the two-column grid, the full-width closer, the body-face swap on its value, and the rule
 * between the bands — everything the desktop frame states.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const stats = statsOf(canvasElement) as HTMLElement;
    const meters = metersOf(canvasElement) as HTMLElement;

    await expect(canvas.getByText('Player card')).toBeVisible();
    await expect(canvas.getByText('LVL 33')).toBeVisible();

    // Five terms and five definitions — the `<dd>` is rendered even when a value is blank, so the
    // pairing an assistive technology reports cannot slide onto the next stat.
    await expect(stats.querySelectorAll('dt')).toHaveLength(TEXT_STATS.length);
    await expect(stats.querySelectorAll('dd')).toHaveLength(TEXT_STATS.length);
    await expect(canvas.getAllByRole('meter')).toHaveLength(METER_STATS.length);

    await waitFor(async () => {
      await expect(trackCount(stats)).toBe(2);
      // Three meters across, which is what `auto-fit` yields at the comp's width — see `.meters`.
      await expect(trackCount(meters)).toBe(METER_STATS.length);

      /*
       * The rule between the bands. Polled because it is drawn in `--stroke-divider`, a
       * `[data-theme]` token: until the preview sets the attribute the whole `border-top` shorthand
       * is invalid at computed-value time and reports `none` — the same answer a missing rule gives.
       */
      await expect(getComputedStyle(meters).borderTopStyle).toBe('solid');
    });

    const cells = stats.querySelectorAll('div');
    const closer = cells[cells.length - 1] as HTMLElement;
    const ordinary = cells[0] as HTMLElement;

    await waitFor(async () => {
      // Spans both columns. Measured rather than read off `grid-column`, because the span is only
      // worth anything if it actually produces a wider box.
      await expect(closer.offsetWidth).toBeGreaterThan(ordinary.offsetWidth * 1.5);

      // …and drops its rule, which every other cell keeps.
      await expect(getComputedStyle(ordinary).borderBottomStyle).toBe('solid');
      await expect(getComputedStyle(closer).borderBottomStyle).toBe('none');

      /*
       * The closer's value is the one set in the body face rather than the mono. Compared against a
       * sibling rather than against a family name, so it holds whichever fonts are loaded — and
       * both sides resolve through `--body-font` / `--mono-font`, which `next/font` sets on `<body>`,
       * so this is polled like everything else that reads a custom property.
       */
      const closerValue = getComputedStyle(closer.querySelector('dd') as HTMLElement).fontFamily;
      const ordinaryValue = getComputedStyle(ordinary.querySelector('dd') as HTMLElement).fontFamily;
      await expect(closerValue).not.toBe('');
      await expect(closerValue).not.toBe(ordinaryValue);
    });
  }
};

/**
 * The same card at the mobile comp's width (node 1:243), where both bands collapse to one column.
 *
 * The narrow wrapper is the point, and it is a *width* rather than a viewport: the card's layout is
 * a container query, because its width comes from the column it sits in and never from the window.
 * A story that reached this branch by shrinking the viewport would pass just as well against the
 * viewport media query this deliberately is not — and that rule gets the middle of the range
 * backwards, giving a narrow card in a sidebar the desktop grid.
 *
 * The mobile comp has **no meter band at all**, so the stacked meters here are inferred rather than
 * measured. Flagged for design review.
 */
export const NarrowColumn: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '350px' }}>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const stats = statsOf(canvasElement) as HTMLElement;
    const meters = metersOf(canvasElement) as HTMLElement;

    await waitFor(async () => {
      await expect(trackCount(stats)).toBe(1);
      await expect(trackCount(meters)).toBe(1);
    });

    // The closer still spans the single column and still has no rule, so the two rules do not
    // disagree about which cell is the last one.
    const cells = stats.querySelectorAll('div');
    const closer = cells[cells.length - 1] as HTMLElement;

    await waitFor(async () => {
      await expect(getComputedStyle(closer).borderBottomStyle).toBe('none');
    });
  }
};

/**
 * Meters authored above, between and below the text stats — which the Studio lets an editor do, and
 * says it is safe to do.
 *
 * The renderer partitions on `_type`, so the two bands come out in the same order whatever the array
 * holds. This is the story that fails if that partition is removed and the card starts rendering the
 * authored sequence.
 */
export const InterleavedOrder: Story = {
  args: { stats: INTERLEAVED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const stats = statsOf(canvasElement) as HTMLElement;
    const meters = metersOf(canvasElement) as HTMLElement;
    const bands = [...cardOf(canvasElement).children];

    await expect(stats.querySelectorAll('dt')).toHaveLength(TEXT_STATS.length);
    await expect(canvas.getAllByRole('meter')).toHaveLength(METER_STATS.length);

    // Every text stat precedes every meter in the document, regardless of the authored order.
    await expect(bands.indexOf(stats)).toBeLessThan(bands.indexOf(meters));

    /*
     * Partitioned, but *stable*: the order within each band is still the order they were authored
     * in, with the other type's entries lifted out. Asserted against the story's own array rather
     * than against `TEXT_STATS`, so it is a test of what the renderer did with this input rather
     * than a restatement of the constant at the top of the file.
     */
    const terms = [...stats.querySelectorAll('dt')].map((term) => term.textContent);
    await expect(terms).toEqual(INTERLEAVED_TEXT_LABELS);

    /*
     * The closer is authored in the middle here, which is the case worth having a story for:
     * `fullWidth` is a property of the stat and not of its position, so this puts a cell spanning
     * both columns between two half-width rows. Grid's default sparse row flow puts it on a row of
     * its own and carries on, rather than leaving a hole — measured here rather than reasoned about,
     * because the alternative (`grid-auto-flow: dense`) would reorder the stats to fill one.
     */
    const cells = [...stats.querySelectorAll('div')] as HTMLElement[];
    const closerIndex = INTERLEAVED_TEXT_LABELS.indexOf('How we met');

    await waitFor(async () => {
      await expect(cells[closerIndex].offsetWidth).toBeGreaterThan(stats.clientWidth * 0.8);
      await expect(getComputedStyle(cells[closerIndex]).borderBottomStyle).toBe('none');
      // The row below it starts back at half width — the span does not leak onto the next cell.
      await expect(cells[closerIndex + 1].offsetWidth).toBeLessThan(stats.clientWidth * 0.6);
    });
  }
};

/**
 * Every text stat marked full width — the layout the ticket's "full-width stats" case asks for, past
 * the single closer the comp draws.
 *
 * Worth a story of its own because `grid-column: 1 / -1` has to resolve against a track list that
 * still exists: a grid whose every item spans it is the case where an `auto-fit` track list would
 * have collapsed to nothing.
 */
export const AllFullWidthStats: Story = {
  args: {
    stats: TEXT_STATS.map((stat) => ({ ...stat, fullWidth: true }))
  },
  play: async ({ canvasElement }) => {
    const stats = statsOf(canvasElement) as HTMLElement;
    const cells = [...stats.querySelectorAll('div')] as HTMLElement[];

    await expect(cells).toHaveLength(TEXT_STATS.length);

    await waitFor(async () => {
      // Two tracks are still declared…
      await expect(trackCount(stats)).toBe(2);

      for (const cell of cells) {
        // …and every cell spans both of them, with no rule.
        await expect(cell.offsetWidth).toBeGreaterThan(stats.clientWidth * 0.8);
        await expect(getComputedStyle(cell).borderBottomStyle).toBe('none');
      }
    });
  }
};

/**
 * A card with no meters — a player whose stats are all prose.
 *
 * The band is dropped rather than rendered empty, so there is no stray rule and no empty row of
 * padding below the last stat.
 */
export const WithoutMeters: Story = {
  args: { stats: TEXT_STATS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(statsOf(canvasElement)).toBeInTheDocument();
    await expect(canvas.queryAllByRole('meter')).toHaveLength(0);
    await expect(metersOf(canvasElement)).toBeNull();
  }
};

/**
 * A card with no text stats — meters straight under the header.
 *
 * The separating rule is an adjacent-sibling selector rather than a flat `border-top`, so it
 * disappears with the band it was separating. Without that the card would draw a hairline
 * immediately below the inverted band, where there is nothing on the other side of it.
 */
export const WithoutTextStats: Story = {
  args: { stats: METER_STATS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = cardOf(canvasElement);
    const meters = metersOf(canvasElement) as HTMLElement;

    await expect(statsOf(canvasElement)).toBeNull();
    await expect(canvas.getAllByRole('meter')).toHaveLength(METER_STATS.length);

    /*
     * The card's own border is asserted first, and it is not a throwaway: `border-top-style: none`
     * is also what an *unresolved* `--stroke-divider` reports, so on its own the second assertion
     * would pass on a cold canvas where no token had arrived yet. The card border resolves through
     * `--stroke-cards` on the same theme, so it standing up is what makes the absence below it mean
     * "no rule" rather than "no theme".
     */
    await waitFor(async () => {
      await expect(getComputedStyle(card).borderTopStyle).toBe('solid');
      await expect(getComputedStyle(meters).borderTopStyle).toBe('none');
    });
  }
};

/**
 * Both ends of the scale in one card, beside an ordinary score.
 *
 * 0 is the only score with nothing drawn at all, which is the case that proves the fraction is
 * carrying the value rather than decorating it; 10 is the case where the fill has to reach the end
 * of the track without overrunning its pill. Both are below and above the point where the fill
 * switches ink, so the card also shows the derived colour rule working in both directions.
 */
export const ExtremeScores: Story = {
  args: {
    stats: [
      { _key: 'none', _type: 'playerMeterStat', label: 'Mornings', score: 0 },
      { _key: 'mid', _type: 'playerMeterStat', label: 'Dance', score: 5 },
      { _key: 'all', _type: 'playerMeterStat', label: 'Snacks', score: 10 }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('meter', { name: /^mornings$/i })).toHaveAttribute('aria-valuenow', '0');
    await expect(canvas.getByRole('meter', { name: /^snacks$/i })).toHaveAttribute('aria-valuenow', '10');
    await expect(canvas.getByText('0/10')).toBeVisible();
    await expect(canvas.getByText('10/10')).toBeVisible();

    const [low, mid, high] = canvas.getAllByRole('meter');

    await waitFor(async () => {
      const fillOf = (meter: HTMLElement) => getComputedStyle(meter).getPropertyValue('--meter-fill').trim();

      await expect(fillOf(low)).not.toBe('');
      // 5 of 10 is exactly the threshold and takes the ordinary ink — "below half", not "at most".
      await expect(fillOf(mid)).toBe(fillOf(high));
      await expect(fillOf(low)).not.toBe(fillOf(high));
    });
  }
};

/** No level authored. The readout is dropped rather than rendered blank, leaving the band's title. */
export const WithoutLevel: Story = {
  args: { level: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Player card')).toBeVisible();
    await expect(canvas.queryByText(/^lvl/i)).toBeNull();
  }
};
