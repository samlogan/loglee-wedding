import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor, within } from 'storybook/test';

import type {
  ISpecCardGridSection,
  ISpecCardGridSectionCard
} from '@/tools/sanity/schema/sections/specCardGridSection';
import { mockBlock } from '@/tools/storybook/mockBlockContent';
import mockImage from '@/tools/storybook/mockImage';
import sectionFixture from '@/tools/storybook/sectionFixture';

import SpecCardGridSection from '.';

import styles from './styles.module.scss';
import cardStyles from '@/components/MediaCard/styles.module.scss';

const FIGMA = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=';

/**
 * The room-type grid on `/stay`.
 *
 * `parameters.design` points at the **grid frame** (1:630) rather than at the whole page frame the
 * ticket links, so `/review-design` compares against the thing this section renders. `Mobile` below
 * overrides it with the mobile frame's equivalent (1:700).
 */
const meta = {
  title: 'Sections/Spec Card Grid',
  component: SpecCardGridSection,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}1-630` }
  }
} satisfies Meta<typeof SpecCardGridSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A fixed width on a plain block wrapper, because the grid's two switches are **container** queries
 * on the section's own content box — so a wrapper genuinely changes the layout under test, where a
 * viewport media query would need a browser resize the component-test runner does not do.
 *
 * `px` and not the `rem` `HeaderDisplaySection.stories` uses, and the difference is not a
 * disagreement. That section's switch is a `rem` threshold, so a `rem` wrapper keeps the story's
 * branch stable under a changed root font size. This section's thresholds are also `rem`, but the
 * *point* of most of these stories is to pin an exact pixel width and measure pixels against it —
 * `Default` asserts a 1240px wrapper resolves three tracks, and the drawn frames are stated in px.
 * `RootTextScaled` and `Reflow320` are the two that deliberately vary the root size instead, and
 * they set it on `document.documentElement` where `rem` is actually resolved.
 *
 * Block, not flex or inline-block: an `inline-size` container inside a shrink-to-fit ancestor
 * collapses to its padding, which is the trap `HeaderDisplaySection` and `ScheduleSection` both
 * document at their own container declarations.
 */
const atWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ display: 'block', width }}>
      <Story />
    </div>
  );

// ---------------------------------------------------------------------------
// Design-faithful mock data — the copy, captions, labels and footnotes the comp draws.
// ---------------------------------------------------------------------------

/**
 * The drawn copy, verbatim from nodes 1:631 / 1:644 / 1:657, with one deliberate departure: **case**.
 *
 * Figma types "KING ROOM", "2 MAX" and "EXTRA BEDS AT A CHARGE" in capitals; this stores sentence
 * case, so the uppercasing under test is the design system's CSS rather than the mock's shift key.
 * It renders identically to the comp, and it is the shape an editor should store.
 *
 * **The usual justification for that is overstated and is not repeated here.** CSS uppercase over
 * stored capitals is a *mitigation*, not a guarantee: Gecko exposes the DOM text to the
 * accessibility tree, so Firefox users hear "2 max", but Chromium and WebKit expose the
 * **transformed** text — so NVDA on Chrome and VoiceOver on Safari still meet "2 MAX", which is
 * exactly the shape a screen reader is most likely to spell out letter by letter. Storing sentence
 * case is still strictly better than authoring capitals (it is right in one engine instead of none,
 * and it keeps the CMS copy reusable), which is why the code does not change. Only the claim does.
 *
 * The footnotes are **items**, never one punctuated string. The middot is the renderer's.
 */
const KING_ROOM: ISpecCardGridSectionCard = {
  _key: 'king',
  caption: 'king-room.jpg',
  description: [mockBlock('normal', 'One king bed, ensuite, furnished balcony with pool view.')],
  footnotes: ['Extra beds at a charge', 'Cot free'],
  image: mockImage({ altText: 'A king room at the Lodge', height: 750, seed: 'spec-card-king', width: 1200 }),
  label: '2 max',
  title: '<h2>King Room</h2>'
};

const TWIN_DOUBLE: ISpecCardGridSectionCard = {
  _key: 'twin',
  caption: 'twin-double.jpg',
  description: [
    mockBlock(
      'normal',
      'Two double beds, ensuite, balcony with pool view. Suits a family with two kids or a group of four.'
    )
  ],
  footnotes: ['Pool view', 'Balcony'],
  image: mockImage({ altText: 'A twin double room', height: 750, seed: 'spec-card-twin', width: 1200 }),
  label: '4 max',
  title: '<h2>Twin Double</h2>'
};

/**
 * The third card, and the one that makes the row uneven — the drawn description runs to a third line
 * and the label is a unit count rather than an occupancy.
 *
 * The extra sentence past the comp's two is deliberate. The drawn copy is three lines in the drawn
 * 386.66px track and two in a slightly wider one, which makes "is this card taller than that one?" a
 * function of the viewport — no use as the input to an alignment test. This is unambiguously taller
 * at every width a three-up row can produce, so `Default`'s assertion cannot pass by coincidence.
 */
const FAMILY_ROOM: ISpecCardGridSectionCard = {
  _key: 'family',
  caption: 'family-room.jpg',
  description: [
    mockBlock(
      'normal',
      'Two separate rooms with an ensuite and spa bath. A king bed in one, two singles plus a lounge in the other, and a door between them that actually closes.'
    )
  ],
  footnotes: ['No direct pool access or view'],
  image: mockImage({ altText: 'A family room', height: 750, seed: 'spec-card-family', width: 1200 }),
  label: '2 rooms',
  title: '<h2>Family Room</h2>'
};

/**
 * Two more rooms, invented rather than drawn, so that `ManyCards` can show a second row.
 *
 * Both are short on purpose: the second row has to be visibly shorter than the first for that
 * story's last assertion — each row stretches to its *own* content — to mean anything.
 */
const GARDEN_ROOM: ISpecCardGridSectionCard = {
  _key: 'garden',
  caption: 'garden-room.jpg',
  description: [mockBlock('normal', 'One queen bed, ensuite, doors onto the garden wing.')],
  footnotes: ['Ground floor'],
  image: mockImage({ altText: 'A garden room', height: 750, seed: 'spec-card-garden', width: 1200 }),
  label: '2 max',
  title: '<h2>Garden Room</h2>'
};

const RIVER_ROOM: ISpecCardGridSectionCard = {
  _key: 'river',
  caption: 'river-room.jpg',
  description: [mockBlock('normal', 'Two singles, shared bathroom, river frontage.')],
  footnotes: ['No ensuite'],
  image: mockImage({ altText: 'A river room', height: 750, seed: 'spec-card-river', width: 1200 }),
  label: '2 max',
  title: '<h2>River Room</h2>'
};

/**
 * The three drawn cards, as an explicit constant.
 *
 * **Every story that measures or reads copy uses this, not the fixture** — and that split is the
 * point. The obvious shape for a section story is `sectionFixture(…) ?? mock`, and this file had it
 * on four stories whose `play` functions then asserted mock-only literals ("Extra beds at a charge
 * · Cot free", "2 max") and mock-only geometry (the third description is taller than the first).
 * The moment somebody publishes a `specCardGridSection` and `yarn storybook:fixtures` runs — which
 * `/commit` does automatically through `story-fixture-checker` — those args become real CMS content
 * and all four break, inside the flow that exists to keep them fresh.
 *
 * So: pinned data for every assertion that is about *this layout*, and `Fluid` below — the one story
 * still on `sectionFixture` — for the assertions that are about the data, all of which are derived
 * from `data` rather than written against the drawn copy.
 */
const MOCK: ISpecCardGridSection = { cards: [KING_ROOM, TWIN_DOUBLE, FAMILY_ROOM] };

/**
 * Real Sanity data when there is any, the mock otherwise — and today it is always the mock: nothing
 * in the dataset publishes this section yet, so `sectionFixture` returns `undefined`. The photographs
 * therefore render the grey Storybook placeholder, which `.storybook/main.ts` documents as "no image
 * resolved". That is the expected state, not a defect.
 */
const data = sectionFixture<ISpecCardGridSection>('specCardGridSection') ?? MOCK;

// ---------------------------------------------------------------------------
// Measurement helpers
// ---------------------------------------------------------------------------

/**
 * The card roots, by `MediaCard`'s own hashed module class rather than by a substring match on
 * `class`. Importing that stylesheet is what makes it exact — the story and the component resolve
 * the same module, so the generated name matches in dev, in a static build and under Vitest.
 */
const cardsIn = (canvasElement: HTMLElement) => [...canvasElement.querySelectorAll<HTMLElement>(`.${cardStyles.card}`)];

/**
 * The footer **containers**, not the text runs inside them. The container carries the hairline and
 * the `margin-block-start: auto` that does the alignment, so its top edge is the thing a reader sees
 * misaligned — and two runs with different line counts could share a top while their rules did not.
 */
const footersIn = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLElement>(`.${cardStyles.footer}`)
];

/**
 * Throws rather than casting a possible `null` away. The section early-returns `null` when it has no
 * renderable cards, and a bare `as HTMLElement` turns that into "Cannot read properties of null"
 * several frames inside `getComputedStyle`, pointing at the helper instead of at the section.
 */
const gridIn = (canvasElement: HTMLElement) => {
  const grid = canvasElement.querySelector<HTMLElement>(`.${styles.grid}`);

  if (!grid) {
    throw new Error('SpecCardGridSection rendered no grid');
  }

  return grid;
};

const topOf = (element: Element) => element.getBoundingClientRect().top;
const heightOf = (element: Element) => element.getBoundingClientRect().height;

/**
 * How many tracks the grid resolved to, read off the used value rather than inferred from a class.
 *
 * The leading-digit guard is load-bearing and is not defensive noise. A grid that has not been laid
 * out resolves `grid-template-columns` to the string `'none'`, and `'none'.split(' ').length` is
 * **1** — so every `toBe(1)` assertion in this file would have passed on a grid that never painted,
 * which is two of the three assertions carrying the most weight here. `NaN` fails them instead.
 */
const trackCountOf = (grid: HTMLElement) => {
  const tracks = getComputedStyle(grid).gridTemplateColumns;

  return /^\d/.test(tracks) ? tracks.split(' ').length : Number.NaN;
};

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * **The section at the canvas's own width — how it behaves on a real page, with no wrapper at all.**
 *
 * Every other story here pins a width, because the two switches are container queries and a wrapper
 * is the only way to drive them in one browser page. That is also their limitation: a fixed 1240px
 * or 390px wrapper *overflows* a viewport narrower than itself, so none of them can answer "does
 * this reflow at 320px?" — the first attempt at that check reported a horizontal scrollbar that the
 * story had created and the section had not.
 *
 * This one has no decorator, so it is the story to resize, to screenshot for a design review at a
 * stated viewport, and to measure reflow against. It asserts the part that must hold at every width:
 * nothing escapes the viewport, and the track count is whatever the container honestly resolved.
 *
 * **It is also the one story on the fixture rather than on `MOCK`**, and the two facts fit together.
 * Every assertion below is derived from `data` rather than written against the drawn copy — a card
 * per entry, a legal track count, a grid that fills its container — so this keeps working the day
 * somebody publishes a `specCardGridSection` and `yarn storybook:fixtures` swaps real content in,
 * which is exactly when the literal-matching stories would have broken.
 */
export const Fluid: Story = {
  args: data,
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      const grid = gridIn(canvasElement);

      // Whatever the canvas is, the grid resolved a legal track count and nothing overflows it.
      await expect([1, 2, 3]).toContain(trackCountOf(grid));
      await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1);

      // One card per entry in whatever `data` turned out to be — fixture or mock.
      await expect(cardsIn(canvasElement)).toHaveLength(data.cards?.length ?? 0);

      // The grid fills its container rather than sitting in a fixed-width box of its own.
      const container = grid.parentElement as HTMLElement;
      await expect(grid.getBoundingClientRect().width).toBeCloseTo(
        container.getBoundingClientRect().width - 2 * Number.parseFloat(getComputedStyle(container).paddingLeft),
        0
      );
    });
  }
};

/**
 * The drawn desktop grid: three cards in a row at 1240px of wrapper.
 *
 * The drawn frame is 1280px wide with 40px gutters, i.e. a 1200px content box. 1240px is used here
 * instead so the story fits a laptop canvas without a horizontal scrollbar; `--container-gutter` is
 * `fluid(20px, 40px)` against the **viewport**, so the content box lands between 1160 and 1200px
 * depending on how wide the runner's page is. Both are comfortably past the `60rem` three-up
 * threshold, which is why the assertion below reads the resolved track count rather than assuming
 * one.
 *
 * **This is the acceptance criterion the section exists to satisfy**, and it is asserted by
 * measurement rather than by screenshot, because a screenshot cannot tell a bottom-aligned row from
 * one where every card happens to have the same amount of copy.
 */
export const Default: Story = {
  args: MOCK,
  decorators: [atWidth('1240px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cards = cardsIn(canvasElement);
    const footers = footersIn(canvasElement);
    const footnotes = [
      canvas.getByText('Extra beds at a charge · Cot free'),
      canvas.getByText('Pool view · Balcony'),
      canvas.getByText('No direct pool access or view')
    ];
    const descriptions = [
      canvas.getByText(/One king bed/),
      canvas.getByText(/Two double beds/),
      canvas.getByText(/Two separate rooms/)
    ];

    // AC: an unbounded repeater rendered as a list, not three fixed slots.
    await expect(cards).toHaveLength(3);
    await expect(within(canvas.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);

    /*
     * AC: the footnote is a list of short strings joined by the renderer. Asserted on the rendered
     * text — one node holding both items with the separator between them — because the failure this
     * guards against is an editor typing the middot into the CMS, which would show up here as a
     * doubled separator.
     */
    await expect(footnotes[0].textContent).toBe('Extra beds at a charge · Cot free');

    await waitFor(async () => {
      /*
       * Three tracks at this width, and the gutter is inside `fluid(16px, 20px)`.
       *
       * The range is the token's whole output, which makes this a shape check rather than a value
       * check — deliberately. `fluid()` interpolates against the **viewport**, and the runner's
       * viewport is not the 1240px wrapper, so the only value this could assert exactly is the one
       * the runner happens to have. The drawn 20px at the desktop anchor is verified by measuring
       * a real 1440px browser, not here.
       */
      const grid = gridIn(canvasElement);
      await expect(trackCountOf(grid)).toBe(3);
      const gap = Number.parseFloat(getComputedStyle(grid).columnGap);
      await expect(gap).toBeGreaterThanOrEqual(16);
      await expect(gap).toBeLessThanOrEqual(20);

      // 1. The row stretched every card to a common height.
      await expect(heightOf(cards[1])).toBeCloseTo(heightOf(cards[0]), 0);
      await expect(heightOf(cards[2])).toBeCloseTo(heightOf(cards[0]), 0);

      // 2. Every footer — rule and all — starts on the same line, to within half a pixel …
      await expect(topOf(footers[1])).toBeCloseTo(topOf(footers[0]), 0);
      await expect(topOf(footers[2])).toBeCloseTo(topOf(footers[0]), 0);

      // … and so does the footnote type inside it.
      await expect(topOf(footnotes[1])).toBeCloseTo(topOf(footnotes[0]), 0);
      await expect(topOf(footnotes[2])).toBeCloseTo(topOf(footnotes[0]), 0);

      /*
       * 3. Not vacuous. Without this the three assertions above would pass just as happily on three
       * identical cards, which is the one arrangement that cannot tell you whether the mechanism
       * works.
       */
      await expect(heightOf(descriptions[2])).toBeGreaterThan(heightOf(descriptions[0]));
    });
  }
};

/**
 * The drawn mobile grid (1:700): one column, 390px of container, and — the half that matters —
 * **cards that do not stretch**.
 *
 * The comp is explicit about it: cards one and two are 329px tall and the third is 350px, because
 * its description runs to a third line. A fixed card height would have satisfied "the footnotes line
 * up" on desktop and been wrong here, which is why this story asserts the *inequality* rather than
 * just the column count.
 */
export const Mobile: Story = {
  args: MOCK,
  decorators: [atWidth('390px')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-700` } },
  play: async ({ canvasElement }) => {
    const cards = cardsIn(canvasElement);

    await waitFor(async () => {
      // One track, so each row holds one card and there is nothing for stretch to equalise.
      await expect(trackCountOf(gridIn(canvasElement))).toBe(1);

      /*
       * **The AC, stated as an inequality.** Each card hugs its own content, so the tallest is
       * taller than the shortest — which is exactly what a fixed card height, or `stretch` reaching
       * across a single column, would flatten.
       *
       * Only the first-versus-third pair is asserted, and that restraint is the point. The first
       * draft also claimed `cards[1] > cards[0]`, which holds at the runner's own width and fails at
       * 320px, where the smaller end of every fluid type token lets both of those descriptions fit
       * in two lines. That assertion was encoding an accident of line wrapping rather than the
       * behaviour under test. The third card's copy is two sentences longer than the first's and is
       * taller at every width a single column can produce.
       */
      await expect(heightOf(cards[2])).toBeGreaterThan(heightOf(cards[0]));

      /*
       * The same fact from the other side, and the exact inverse of `Default`: the footers do **not**
       * share a `y`. `Default` proves the mechanism fires in a row; this proves it does not fire
       * where the design says it should not.
       */
      const footers = footersIn(canvasElement);
      await expect(topOf(footers[2])).toBeGreaterThan(topOf(footers[0]));

      /*
       * The stacked cards are a column, not a squeezed row: each starts below the one before it by
       * its own height plus the grid's gap.
       *
       * The gap is drawn 16px on the mobile frame and the range here reaches 20 because `fluid()`
       * interpolates against the **viewport**, which in a component test is the runner's browser
       * page rather than the 390px wrapper. That is the honest behaviour, not a fudge: the gutter is
       * a property of the page's density while the track count is a property of the space this
       * section was given, and only the second is a container query.
       */
      const gap = topOf(cards[1]) - (topOf(cards[0]) + heightOf(cards[0]));
      await expect(gap).toBeGreaterThanOrEqual(15);
      await expect(gap).toBeLessThanOrEqual(20);
    });
  }
};

/**
 * The inferred middle state — two tracks, which the comp does not draw.
 *
 * Worth a story precisely because it is inferred: it is the one layout nobody can check against a
 * frame, so the thing to pin is that it behaves like a row rather than like a third thing. Two cards
 * bottom-align, the third wraps onto a second row and aligns with nothing.
 */
export const TwoUp: Story = {
  args: MOCK,
  decorators: [atWidth('720px')],
  play: async ({ canvasElement }) => {
    const cards = cardsIn(canvasElement);
    const footers = footersIn(canvasElement);

    await waitFor(async () => {
      await expect(trackCountOf(gridIn(canvasElement))).toBe(2);

      // The first row is a row: two cards side by side, footers on one line.
      await expect(topOf(cards[1])).toBeCloseTo(topOf(cards[0]), 0);
      await expect(topOf(footers[1])).toBeCloseTo(topOf(footers[0]), 0);

      // The third has wrapped, and is therefore below both of them.
      await expect(topOf(cards[2])).toBeGreaterThan(topOf(cards[0]) + heightOf(cards[0]));
    });
  }
};

/**
 * **A card with no image** — an explicit acceptance criterion.
 *
 * The media band is dropped entirely rather than left as a fixed height of empty surface, and the
 * caption goes with it: a chip inset into nothing is worse than no chip. The card still stretches to
 * the row, so its footnote stays aligned with the two that do have photographs — which is the part
 * that would break if the band were kept as an empty box of a different height.
 */
export const CardWithoutImage: Story = {
  args: { cards: [{ ...KING_ROOM, caption: 'king-room.jpg', image: undefined }, TWIN_DOUBLE, FAMILY_ROOM] },
  decorators: [atWidth('1240px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cards = cardsIn(canvasElement);
    const footers = footersIn(canvasElement);

    // Two photographs for three cards, and the orphaned caption is not drawn anywhere.
    await expect(canvasElement.querySelectorAll('img')).toHaveLength(2);
    await expect(canvas.queryByText('king-room.jpg')).toBeNull();
    // Still a complete card: name, spec label, copy, rule, footnote.
    await expect(canvas.getByRole('heading', { name: 'King Room' })).toBeTruthy();
    await expect(canvas.getByText('2 max')).toBeTruthy();

    await waitFor(async () => {
      // The row still bottom-aligns — the card without a band is shorter in content, not in height.
      await expect(heightOf(cards[0])).toBeCloseTo(heightOf(cards[1]), 0);
      await expect(topOf(footers[0])).toBeCloseTo(topOf(footers[1]), 0);
    });
  }
};

/**
 * **A card with no footnote** — the other explicit acceptance criterion.
 *
 * The hairline belongs to the footer, so it goes too. A rule with nothing under it is the failure
 * mode worth asserting against, and it is the one an `items.length` guard would produce: an empty
 * array is truthy, so the obvious check draws the rule anyway.
 */
export const CardWithoutFootnote: Story = {
  args: { cards: [{ ...KING_ROOM, footnotes: [] }, { ...TWIN_DOUBLE, footnotes: undefined }, FAMILY_ROOM] },
  decorators: [atWidth('1240px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // An empty array and an absent field both render nothing — and no hairline with it.
    await expect(footersIn(canvasElement)).toHaveLength(1);
    await expect(canvas.queryByText(/Extra beds at a charge/)).toBeNull();
    await expect(canvas.queryByText(/Pool view/)).toBeNull();
    // The one card that does have a footnote still has it.
    await expect(canvas.getByText('No direct pool access or view')).toBeTruthy();
    // And the two without one are still complete cards.
    await expect(cardsIn(canvasElement)).toHaveLength(3);
  }
};

/**
 * **An unbounded repeater, not three fixed slots** — the first acceptance criterion, and the one a
 * three-card mock cannot demonstrate on its own.
 *
 * Five cards fill a three-up row and start a second of two. The second row stretches to its own
 * content, independently of the first, which is what "no fixed card height" buys: a short second row
 * does not inherit the first row's height.
 */
export const ManyCards: Story = {
  args: { cards: [KING_ROOM, TWIN_DOUBLE, FAMILY_ROOM, GARDEN_ROOM, RIVER_ROOM] },
  decorators: [atWidth('1240px')],
  play: async ({ canvasElement }) => {
    const cards = cardsIn(canvasElement);
    const footers = footersIn(canvasElement);

    await expect(cards).toHaveLength(5);

    await waitFor(async () => {
      await expect(trackCountOf(gridIn(canvasElement))).toBe(3);

      // Three on the first row …
      await expect(topOf(cards[1])).toBeCloseTo(topOf(cards[0]), 0);
      await expect(topOf(cards[2])).toBeCloseTo(topOf(cards[0]), 0);
      // … two on the second, which starts below the first.
      await expect(topOf(cards[3])).toBeGreaterThan(topOf(cards[0]) + heightOf(cards[0]));
      await expect(topOf(cards[4])).toBeCloseTo(topOf(cards[3]), 0);

      // Each row bottom-aligns its own footers, and the second row is shorter than the first.
      await expect(topOf(footers[1])).toBeCloseTo(topOf(footers[0]), 0);
      await expect(topOf(footers[4])).toBeCloseTo(topOf(footers[3]), 0);
      await expect(heightOf(cards[3])).toBeLessThan(heightOf(cards[0]));
    });
  }
};

/**
 * The same grid at a 32px root font size, which is the case the `rem` container thresholds have to
 * survive.
 *
 * CLAUDE.md's sibling sections hit the hazard from the other side: a `rem` threshold that hides
 * something can *delete content* when a reader raises their text size alone (WCAG 1.4.4). This
 * section's thresholds hide nothing — they only change the track count — and doubling the root size
 * halves the container in `rem`, so a 1240px wrapper drops from three tracks to one and every card,
 * label and footnote is still in the document.
 */
export const RootTextScaled: Story = {
  args: MOCK,
  decorators: [atWidth('1240px')],
  /*
   * The root font size is changed in the `play` function rather than by a decorator, because `rem`
   * is resolved against the **root** element: a wrapper `<div style={{ fontSize: '32px' }}>` looks
   * like it should do this and changes nothing at all about a `rem` container query. That is itself
   * the trap worth recording — the first draft of this story had exactly that decorator, and it
   * passed against the unscaled layout.
   */
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const root = document.documentElement;
    const previous = root.style.fontSize;

    try {
      await step('Three tracks at the default root size', async () => {
        await waitFor(async () => {
          // 1240px of wrapper less two 40px gutters is 1160px of content — 72.5rem, past `60rem`.
          await expect(trackCountOf(gridIn(canvasElement))).toBe(3);
        });
      });

      root.style.fontSize = '32px';

      await step('One track, and nothing deleted, at a 32px root', async () => {
        /*
         * The same 1160px of content is 36.25rem at a 32px root — under both thresholds, so the grid
         * drops straight from three tracks to one. That is the switch firing in the direction that
         * helps: more text, fewer and wider columns.
         */
        await waitFor(async () => {
          await expect(trackCountOf(gridIn(canvasElement))).toBe(1);
        });

        // Crossing the threshold changes the layout and removes nothing: every card, heading, spec
        // label and footnote is still in the document.
        await expect(cardsIn(canvasElement)).toHaveLength(3);
        await expect(canvas.getAllByRole('heading')).toHaveLength(3);
        await expect(footersIn(canvasElement)).toHaveLength(3);
        await expect(canvas.getByText('2 max')).toBeVisible();
        await expect(canvas.getByText('Extra beds at a charge · Cot free')).toBeVisible();

        /*
         * **And this is the half `toBeVisible()` cannot see.**
         *
         * It checks `display`, `visibility`, `opacity`, the `hidden` attribute and `<details>`
         * ancestry — not whether an ancestor's `overflow: hidden` has clipped the element out of
         * view. `MediaCard` sets exactly that on `.card`, to clip the media band into the corner
         * radius, so a title pushed out of its card by a flex minimum passes every assertion above
         * while being invisible on screen. The one story whose job is to prove resize safety was
         * blind to the only resize failure this card has.
         *
         * `scrollWidth <= clientWidth` is the measurement that sees it: it asks whether the card's
         * content is wider than the box painting it, which is what clipping means.
         */
        await waitFor(async () => {
          for (const card of cardsIn(canvasElement)) {
            await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
          }
        });
      });
    } finally {
      // The root element is shared across stories in the runner, so this has to be put back.
      root.style.fontSize = previous;
    }
  }
};

/**
 * The content an editor is most likely to paste in and least likely to look at afterwards: a room
 * name with no spaces in it, and a footnote item that is a URL.
 *
 * Both are the case `minmax(0, 1fr)` is usually credited with solving, and it only solves half of
 * it. The track does not widen and the page does not scroll — that part works — but without
 * `overflow-wrap` the string still overflows its own box and `MediaCard`'s `overflow: hidden` clips
 * it mid-word, silently. Measured before the fix at 1440px: three 440px tracks, no page scroll, and
 * a heading whose right edge was 753px past the right edge of its own card, with the spec label
 * beside it pushed out of the card entirely.
 *
 * So the assertions are about **containment**, not about wrapping: every text box stays inside its
 * card, and the grid is still the width it was.
 */
export const LongUnbreakableContent: Story = {
  args: {
    cards: [
      {
        ...KING_ROOM,
        footnotes: ['https://thelodge.example.com/rooms/king/availability/2027/february/twelfth'],
        title: '<h2>Supercalifragilisticexpialidociousaccommodationwingannexe</h2>'
      },
      TWIN_DOUBLE,
      FAMILY_ROOM
    ]
  },
  decorators: [atWidth('1240px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [card] = cardsIn(canvasElement);
    const grid = gridIn(canvasElement);

    await waitFor(async () => {
      /*
       * The track count and the grid's own width are untouched — this is the `minmax(0, 1fr)` half.
       *
       * Measured against the container rather than against the viewport: the wrapper this story
       * pins is wider than the component-test runner's page, so `document.scrollWidth` here reports
       * the *story's* overflow and would fail whatever the section did. `Fluid` is the story that
       * owns the viewport-level claim, because it is the one with no wrapper.
       */
      await expect(trackCountOf(grid)).toBe(3);
      const container = grid.parentElement as HTMLElement;
      await expect(grid.getBoundingClientRect().width).toBeCloseTo(
        container.getBoundingClientRect().width - 2 * Number.parseFloat(getComputedStyle(container).paddingLeft),
        0
      );

      /*
       * … and this is the `overflow-wrap` half. Both runs wrap inside the card instead of running
       * out of it. A half-pixel of tolerance, because a wrapped glyph's advance can round past the
       * padding edge by a sub-pixel without anything being clipped.
       */
      const cardRight = card.getBoundingClientRect().right;
      const heading = canvas.getByRole('heading', { level: 2, name: /Supercalifragilistic/ });
      const footnote = canvas.getByText(/thelodge\.example\.com/);

      await expect(heading.getBoundingClientRect().right).toBeLessThanOrEqual(cardRight + 0.5);
      await expect(footnote.getBoundingClientRect().right).toBeLessThanOrEqual(cardRight + 0.5);

      // And the label the overflow used to push out of the card is still beside the name.
      const label = canvas.getByText('2 max');
      await expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(cardRight + 0.5);
      await expect(label).toBeVisible();
    });
  }
};

/**
 * **320px, at both a default and a 32px root** — the narrowest viewport WCAG 1.4.10 asks about, with
 * the content most likely to break it: a long room name against a label at the schema's 20-character
 * cap.
 *
 * `RootTextScaled` tests the easy direction. Raising the root there drops a 1240px wrapper from
 * three tracks to one, which gives each card *more* room, not less. This is the other direction, and
 * it is where the header row's flex minimum bites: `.title` and `.label` share a row, `.label` is
 * `flex: 0 0 auto`, and a title whose min-content width will not fit pushes the row past the card —
 * where `MediaCard`'s `overflow: hidden` clips it silently rather than producing a scrollbar. That
 * is content loss, not two-dimensional scrolling, and it is the failure
 * `HeaderDisplaySection/styles.module.scss` measured on the same mechanism.
 *
 * `overflow-wrap: anywhere` is what holds it: `anywhere` is the only value that reduces an element's
 * min-content size, so the flex minimum collapses and the name wraps instead. **That declaration is
 * no longer in this file** — it is on `components/MediaCard`'s `.card`, because the clip it guards
 * against is the card's own `overflow: hidden` and `/the-lodge`'s venue grid had independently
 * written the identical rule on its own grid item. `overflow-wrap` is inherited, so this story
 * measures exactly what it measured before.
 *
 * ## The label used to be the part this section could not fix
 *
 * The **name** wrapped and the **label** did not, and could not: `MediaCard`'s `.label` was
 * `flex: 0 0 auto`, and a flex item that cannot shrink ignores `overflow-wrap` entirely, because its
 * size is its content's. Measured on this story at a 320px wrapper, stepping the label through real
 * values:
 *
 *   default root   5, 7, 8, 10, 12, 13 characters   all fit
 *   32px root      5, 7, 8 fit   ·   10, 12, 13 clip
 *
 * That is where `label`'s old `Rule.max(8)` came from — and `/the-lodge` had capped its identical
 * field at 10 from the same measurement on the other page. The card now carries `flex: 0 1 auto`
 * plus `min-width: 0` on `.label`, which is the fix both notes named, so the label wraps rather than
 * disappearing and the two caps are reconciled to one advisory 10.
 *
 * `MediaCard.LongLabelAndTitle` measures the label half at the same 320px / 32px-root combination,
 * on the component that now owns it. This story keeps the grid half.
 *
 * One honest caveat, worth knowing before trusting the numbers. The wrapper is 320px but the
 * runner's viewport is not, so every `fluid()` token stays near its wide anchor — the title renders
 * at roughly 30px inside a 320px box rather than the ~26px a real 320px viewport would give. That
 * over-tests rather than under-tests, which is the safe direction.
 */
export const Reflow320: Story = {
  args: {
    cards: [
      { ...KING_ROOM, label: 'Sleeps 4', title: '<h2>The Old Coach House Garden Suite</h2>' },
      TWIN_DOUBLE,
      FAMILY_ROOM
    ]
  },
  decorators: [atWidth('320px')],
  play: async ({ canvasElement, step }) => {
    const root = document.documentElement;
    const previous = root.style.fontSize;

    /** Nothing inside a card is wider than the box that paints it — i.e. nothing is clipped away. */
    const expectNothingClipped = async () => {
      await waitFor(async () => {
        await expect(trackCountOf(gridIn(canvasElement))).toBe(1);

        for (const card of cardsIn(canvasElement)) {
          await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
        }

        for (const footer of footersIn(canvasElement)) {
          await expect(footer.scrollWidth).toBeLessThanOrEqual(footer.clientWidth + 1);
        }
      });
    };

    try {
      await step('Nothing is clipped at 320px', expectNothingClipped);

      root.style.fontSize = '32px';

      // 1.4.4: a text-size increase on its own must not cost content, and at 320px there is no
      // column count left to give up — so the wrapping is doing all of the work.
      await step('Nothing is clipped at 320px with a 32px root', expectNothingClipped);

      const canvas = within(canvasElement);
      await expect(cardsIn(canvasElement)).toHaveLength(3);
      await expect(canvas.getByRole('heading', { name: 'The Old Coach House Garden Suite' })).toBeVisible();
      await expect(canvas.getByText('Sleeps 4')).toBeVisible();
    } finally {
      root.style.fontSize = previous;
    }
  }
};

/**
 * **Blank and half-blank cards, which are the two an editor reaches by accident.** "Add item", tab
 * through, move on.
 *
 * `hasCardContent` drops a card with nothing in it, so the grid does not draw a bordered box of
 * padding. Two things about it are easy to get wrong and are asserted here rather than trusted:
 *
 * - It deliberately does **not** count `caption`. The card only renders a caption inset into a media
 *   band, so a card holding nothing but a file name has nothing to show — the chip would be dropped
 *   with the band and the card would be the empty box again.
 * - It **does** count a card with only a label, which renders as a legitimate if sparse card. The
 *   guard's job is "is there anything to draw", not "is this card finished".
 */
export const WithBlankCard: Story = {
  args: {
    cards: [
      KING_ROOM,
      { _key: 'blank' },
      { _key: 'caption-only', caption: 'orphan.jpg' },
      { _key: 'label-only', label: '1 max' },
      TWIN_DOUBLE
    ]
  },
  decorators: [atWidth('1240px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Five entries, three cards: the empty one and the caption-only one are both dropped.
    await expect(cardsIn(canvasElement)).toHaveLength(3);
    await expect(within(canvas.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
    await expect(canvas.queryByText('orphan.jpg')).toBeNull();

    /*
     * The label-only card is the one that survives on a single field, and it is a real card.
     *
     * `'1 max'` rather than repeating `KING_ROOM`'s `'2 max'`, so this resolves to one element.
     * `getByText` throws on a second match, which is the right default and a trap for a story whose
     * whole point is several cards sharing a shape.
     */
    await expect(canvas.getByText('1 max')).toBeVisible();
  }
};

/**
 * **No renderable cards at all — the section returns `null` rather than an empty shell.**
 *
 * `cards` is not `required()`, so the way here is a half-built section in the Studio's Presentation
 * preview. The alternative is a `Section` with its bottom padding and nothing in it: a strip of page
 * that looks like a styling bug rather than like unfinished content. `TwoColumnListSection` and
 * `ScheduleSection` both bail the same way.
 *
 * Asserted on the `<section>` rather than on the card count, because the card count is already zero
 * in the failure case this guards against.
 */
export const NoCards: Story = {
  args: { cards: [{ _key: 'blank' }] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('section')).toBeNull();
    await expect(cardsIn(canvasElement)).toHaveLength(0);
  }
};
