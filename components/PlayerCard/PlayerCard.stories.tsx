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
 * Sentence case throughout — the right content model, but *not* because it keeps capitals out of the
 * accessible tree. Measured, Chromium names these terms "HOME TOWN" and "SPECIAL MOVE": it computes
 * a name from rendered text, and `text-transform` is part of what is rendered. What sentence case
 * actually protects is the one name the stylesheet cannot reach — each meter's `aria-label`, which
 * `StatMeter` takes verbatim from `label`.
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
    (Story, context) => {
      /*
       * A story can pin a theme through `parameters.forceTheme` instead of the toolbar global, and
       * `DarkTheme` below explains at length why it has to. Absent, both attributes are omitted and
       * the canvas behaves exactly as before — the toolbar still drives every other story.
       */
      const forced = context.parameters.forceTheme as 'dark' | 'light' | undefined;

      return (
        <div
          data-theme={forced}
          style={{ padding: 'var(--spacing-lg)', backgroundColor: forced ? 'var(--bg-default)' : undefined }}
        >
          <div style={{ width: '624px' }}>
            <Story />
          </div>
        </div>
      );
    }
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

      /*
       * The gutter all three bands share. `--card-gutter` exists precisely so the header, the stat
       * grid and the meter band cannot drift apart, and until now that was prose: each band could
       * have been given its own 18px and nothing would have noticed until one of them was retuned.
       */
      const card = cardOf(canvasElement);
      const gutters = [...card.children].map((band) => getComputedStyle(band).paddingLeft);
      await expect(gutters).toHaveLength(3);
      await expect(new Set(gutters).size).toBe(1);

      /*
       * `overflow: hidden` is what clips the header band's square top corners to the card's 8px
       * radius, which is why no band declares a radius of its own. Remove it and the band's corners
       * poke out at both ends — a visible break with nothing else in the suite to catch it.
       */
      await expect(getComputedStyle(card).overflow).toBe('hidden');
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

      /*
       * …and the *size* swaps with it. Asserted on the `<Text>` inside the `<dd>` rather than on the
       * `<dd>`, because that is where the step now lives: the stylesheet states only the family, so
       * reading the block would report the mono size it inherits and pass whatever `Text` did.
       * Compared against the ordinary cell rather than against `16px`, so it survives a retune of
       * `--body-md` and still fails if the prop is dropped.
       */
      const closerStep = getComputedStyle(closer.querySelector('dd > *') as HTMLElement).fontSize;
      await expect(closerStep).not.toBe('');
      await expect(closerStep).not.toBe(getComputedStyle(ordinary.querySelector('dd') as HTMLElement).fontSize);
    });

    /*
     * The capitals are `text-transform`, not the data, which means every text assertion in this file
     * queries the untransformed string and none of them can see the transform at all: drop it from
     * the stylesheet and the whole suite stays green while every label in the card renders in the
     * wrong case. Checked on both registers, the header's bold and the stat's regular.
     *
     * Worth being clear about which side of the fence that transform sits on. Testing Library finds
     * these nodes by their sentence-case text content, while Chromium's accessible name for the same
     * `<dt>` is "HOME TOWN" — the transform reaches the name and not the text node. It costs nothing
     * here, and it is the whole reason `StatMeter` names its meter with `aria-label` rather than
     * `aria-labelledby`.
     */
    await waitFor(async () => {
      await expect(getComputedStyle(canvas.getByText('Player card')).textTransform).toBe('uppercase');
      await expect(getComputedStyle(ordinary.querySelector('dt') as HTMLElement).textTransform).toBe('uppercase');
    });

    /*
     * A meter's label and the stat label above it are one type role, and `.meters` makes that true
     * by setting `--meter-label-size` from the card's own `--card-label-size`.
     *
     * Asserting the two rendered sizes match is **not** enough, and that is the whole point of this
     * block. They matched for the entire life of the component while the override was dead —
     * `StatMeter` declared `--meter-label-size` on `.meter` itself, and a custom property declared
     * on an element beats the same property inherited from an ancestor, so the band's value never
     * reached the label. The two agreed only because both computed the same `fluid(10px, 11px)`
     * independently, which is exactly the drift the override exists to prevent.
     *
     * So the card's knob is moved and the meter label has to follow it. `finally` rather than a
     * trailing line, because a failed assertion would otherwise leave a 40px label on the canvas
     * for every story that runs after this one.
     */
    const card = cardOf(canvasElement);
    const meterLabel = canvas.getAllByRole('meter')[0].querySelector('span > span') as HTMLElement;
    const statLabel = ordinary.querySelector('dt') as HTMLElement;

    await waitFor(async () => {
      const size = getComputedStyle(statLabel).fontSize;
      await expect(size).not.toBe('');
      await expect(getComputedStyle(meterLabel).fontSize).toBe(size);
    });

    try {
      card.style.setProperty('--card-label-size', '40px');

      await waitFor(async () => {
        await expect(getComputedStyle(statLabel).fontSize).toBe('40px');
        await expect(getComputedStyle(meterLabel).fontSize).toBe('40px');
      });
    } finally {
      card.style.removeProperty('--card-label-size');
    }
  }
};

/**
 * The card at the mobile comp's *width* (node 1:243), where both bands collapse to one column.
 *
 * The narrow wrapper is the point, and it is a width rather than a viewport: the card's layout is a
 * container query, because its width comes from the column it sits in and never from the window. A
 * story that reached this branch by shrinking the viewport would pass just as well against the
 * viewport media query this deliberately is not — and that rule gets the middle of the range
 * backwards, giving a narrow card in a sidebar the desktop grid.
 *
 * **This is not the mobile comp, and it is worth being exact about why.** Layout here is the card's
 * (container-driven, so narrow); *type and spacing* are still the canvas's (viewport-driven, because
 * `fluid()` interpolates on `vw` by construction), so at a 1440px canvas this renders node 1:243's
 * grid at node 1:175's 11px/13px/18px rather than its own 10px/12px/14px. That is not a defect in
 * either the component or the story — it is what a 350px card in a wide window genuinely looks like,
 * and it is the case this story exists to pin. The mobile frame's own numbers were checked by
 * driving the viewport to 375px in the design review; they match to four decimal places. There is no
 * story that reproduces them, because a story cannot set a viewport the component test runner
 * honours.
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
 * The width between the two comps, where the bands deliberately disagree.
 *
 * Neither frame draws this, and it is the case that decides whether the meter band is a track list
 * or a breakpoint. At 440px of card the text stats are still a single column — 460px is where they
 * flip — while the meter band fits two 193px meters, which is the width the comp actually draws
 * (183.33px). Pinned to the text stats' threshold instead, the same card would draw one 404px bar
 * with its label and its fraction at opposite ends of the row.
 *
 * So this story asserts the *asymmetry*: one stat track, two meter tracks, on one card. It fails if
 * the meter band is ever coupled back to `.stats`' container query — which is exactly the tidy-
 * looking change someone will propose, since the comp's own desktop card runs two stat columns above
 * three meter columns and so never asserts a shared count either.
 *
 * 440px has ~20px of clearance on the stats side (they need 460) and ~26px on the meters side (two
 * tracks need 180 + 180 + an 18px gap inside gutters that are themselves fluid), so the assertion
 * does not hang on the viewport the suite happens to run at.
 */
export const MediumColumn: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '442px' }}>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const stats = statsOf(canvasElement) as HTMLElement;
    const meters = metersOf(canvasElement) as HTMLElement;

    await waitFor(async () => {
      await expect(trackCount(stats)).toBe(1);
      await expect(trackCount(meters)).toBe(2);

      /*
       * And the meters that result are near the width the comp draws rather than the width of the
       * card. Bounded on both sides: the upper bound is what fails if the band is stacked again,
       * the lower is what fails if 180px is ever lowered far enough to squeeze three across here.
       */
      const first = meters.firstElementChild as HTMLElement;
      await expect(first.offsetWidth).toBeLessThan(260);
      await expect(first.offsetWidth).toBeGreaterThan(150);
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

/**
 * The comp's card on the dark theme, where the header band's one contentious decision gets rendered.
 *
 * The band inverts through the design system's ink-chip pair (`--button-secondary-bg` /
 * `--button-secondary-fg`) rather than through `data-theme="dark"` on the band itself. The argument
 * for that is in the stylesheet and it is a *negative* one — `data-theme="dark"` paints
 * `--bg-default`, which is pine/600, so the band would come out green rather than ink — and a
 * negative argument is exactly the kind nothing renders. This is what it renders.
 *
 * What the assertion pins is the property that matters on both surfaces: the band is inverted
 * *relative to the surface around it*. On light that is ink under off-white; on dark it is off-white
 * under pine. Stated as "different from the page, and legible against itself", so it holds either
 * way round and fails if the band ever resolves to the page's own colour — which is precisely what
 * the `data-theme` spelling would have done.
 *
 * **Themed through `parameters.forceTheme`, not `globals: { theme: 'dark' }`, and the difference is
 * not stylistic.** A story-level globals override is applied on a *later* render than the first:
 * the preview mounts on whatever the globals store holds, then `withThemeByDataAttribute` rewrites
 * `body[data-theme]` when the change propagates. Measured on a cold iframe of this very story, the
 * card was in the DOM at 102ms and the attribute flipped to `dark` at **5209ms** — so a `play`
 * function polling for it fails at the 1s default, fails at 5s, and can only be made to pass by
 * guessing a timeout longer than a machine-dependent delay. (`.storybook/preview.tsx` documents the
 * smaller cousin of this: ~1.2s for the attribute to appear at all, which is why the default theme
 * is seeded there.) The decorator sets the attribute *in* the first render, so there is no race to
 * lose — and because the theme blocks in `_variables.scss` are bare `[data-theme='…']` selectors
 * rather than `body[data-theme='…']`, a wrapper themes its subtree exactly as the body would.
 */
export const DarkTheme: Story = {
  parameters: { forceTheme: 'dark' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = cardOf(canvasElement);
    const header = card.children[0] as HTMLElement;
    const surface = card.closest('[data-theme]') as HTMLElement;

    await expect(canvas.getByText('Player card')).toBeVisible();
    // Synchronous, because the decorator put it there — this is the assertion that was unwinnable
    // against the globals round-trip and is trivially true against a wrapper.
    await expect(surface.dataset.theme).toBe('dark');

    await waitFor(async () => {
      const band = getComputedStyle(header);
      const page = getComputedStyle(surface).backgroundColor;

      await expect(band.backgroundColor).not.toBe(page);
      await expect(band.backgroundColor).not.toBe(band.color);
      // The card's own border resolves on the same theme, so it standing up is what makes the two
      // assertions above mean "inverted" rather than "no token has resolved yet".
      await expect(getComputedStyle(card).borderTopStyle).toBe('solid');
    });
  }
};

/**
 * A long authored level on a narrow card — the header band's one overflow case.
 *
 * `level` is free text with no length validation in the Studio, so "LVL 33" is the Studio's example
 * rather than a contract, and the default title is left in place: this is the shape the CMS can
 * actually produce without anybody doing anything unusual.
 *
 * The band is a single row whose level is `flex-shrink: 0`, and the card clips, so the *title* has
 * to be able to give way as far as its own last character — which is what `min-width: 0` and
 * `overflow-wrap: anywhere` buy it. Without them a flex item's automatic minimum is its longest
 * word, the title stops there, the row lays out wider than its box, and the run that disappears
 * under `overflow: hidden` is the level: the one thing in the band that cannot shrink. Measured at
 * exactly this width and this string — 25px of header over the edge before the fix, none after, with
 * no cue either way that anything had been cut.
 *
 * **Where the guarantee stops, and it is worth being exact.** It holds while the level *itself*
 * fits the row — at 320px that is around 31 monospace characters. Past that the level alone exceeds
 * the 282px content box and clips again, because `flex-shrink: 0` is the whole point of it: the
 * readout is the run that must stay whole, and no amount of collapsing the title can make a
 * 34-character level fit. This story pins the boundary reachable with plausible content, not the one
 * that needs abuse.
 *
 * Asserted as "the row fits its box", which is the property that actually matters and holds however
 * the two runs are balanced, rather than as a wrap count that would pin one particular reflow.
 */
export const LongHeaderText: Story = {
  args: { level: 'LVL 33 — GRANDMASTER OF ARMS' },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const card = cardOf(canvasElement);
    const header = card.children[0] as HTMLElement;

    await waitFor(async () => {
      // Nothing overflows, so `overflow: hidden` has nothing to clip …
      await expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
      await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);

      // … and the level is the run that stayed whole, which is what the title gives way for.
      const level = header.children[1] as HTMLElement;
      await expect(level.scrollWidth).toBeLessThanOrEqual(level.clientWidth);
      await expect(level.getBoundingClientRect().right).toBeLessThanOrEqual(header.getBoundingClientRect().right + 0.5);

      /*
       * And the title gave way by *truncating*. Asserted because "the row fits" on its own is also
       * satisfied by a title collapsed into a column of single characters, which is what the first
       * version of this fix actually produced — lossless, and worse to look at than the clip.
       */
      const title = header.children[0] as HTMLElement;
      await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
      await expect(getComputedStyle(title).textOverflow).toBe('ellipsis');
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
