import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import formatOrdinal from '@/helpers/formatOrdinal';
import hasTitleText from '@/helpers/hasTitleText';
import stripTitleTags from '@/helpers/stripTitleTags';
import type {
  INumberedGridSection,
  INumberedGridSectionItem
} from '@/tools/sanity/schema/sections/numberedGridSection';
import { mockBlock } from '@/tools/storybook/mockBlockContent';
import { mockExternalLink } from '@/tools/storybook/mockLink';
import sectionFixture from '@/tools/storybook/sectionFixture';

import NumberedGridSection from '.';

const FIGMA = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=';

/**
 * The Lodge's facilities table — a bordered grid of auto-numbered cells sharing one outer border,
 * under a heading row.
 *
 * `parameters.design` points at **node 16:166, the grid**, rather than at the page frame the ticket
 * links. The design has no wrapper frame around this section — the heading row (16:163) and the grid
 * are siblings at page level, and three separate tickets point at 16:102 — so the grid is the
 * largest node that is only this section, and it is the part that identifies it. The `Mobile` story
 * overrides it with the phone equivalent.
 */
const meta = {
  title: 'Sections/Numbered Grid',
  component: NumberedGridSection,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}16-166` }
  }
} satisfies Meta<typeof NumberedGridSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A fixed width, so the section's two container queries resolve the same way whatever the test
 * canvas happens to be. Matching `ScheduleSection` and `HeaderDisplaySection`.
 *
 * `rem` and not `px`: the switches are `45rem` and `38rem`, so a `px` wrapper would make every
 * assertion below depend on the reader's root font size — `Desktop` would quietly flip to the
 * two-column branch at a ~24px root and assert the wrong layout while still passing its name. The
 * design's px frame is stated at each call site.
 */
const atWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ width }}>
      <Story />
    </div>
  );

/** The description is the only cell field that needs a shape rather than a string. */
const gridItem = (
  item: Omit<INumberedGridSectionItem, 'content'> & { content?: string }
): INumberedGridSectionItem => ({
  ...item,
  content: item.content ? [mockBlock('normal', item.content)] : undefined
});

/**
 * The nine facilities of node 16:166, verbatim — copy, tags and order.
 *
 * The one deliberate departure from the comp is **case**: Figma types "CHAMPAGNE GARDEN" and
 * "OUTDOOR" in capitals, and these pass "Champagne garden" and "Outdoor" so that the uppercasing
 * under test is the section's own `textTransform` rather than the mock's shift key. It renders
 * identically, and it is the shape an editor should store — the schema says so, because short
 * literal all-caps runs are what screen readers most often spell out letter by letter.
 *
 * Nine is the design's count and is load-bearing here rather than incidental: nine into three
 * columns is exact and nine into two is not, so the same array exercises both the complete grid and
 * the orphaned last cell simply by changing the width it is rendered at.
 *
 * The tags keep the comp's mix on purpose — a category, an opening time, a booking state and a joke
 * in one column — because that mix is the evidence that settled `tag` as one free-text string rather
 * than an enum or an hours field.
 */
const ITEMS: INumberedGridSectionItem[] = [
  gridItem({
    _key: 'champagne-garden',
    title: '<h3>Champagne garden</h3>',
    tag: 'Outdoor',
    content: "Outdoor drinks under the trees. Where you'll find us most afternoons."
  }),
  gridItem({
    _key: 'terrace',
    title: '<h3>The terrace</h3>',
    tag: 'Outdoor',
    content: 'Sun, shade and a second place for a glass in hand.'
  }),
  gridItem({
    _key: 'pool',
    title: '<h3>Pool</h3>',
    tag: 'From 12pm',
    content: 'Palm Springs style, with pool service for guests from midday.'
  }),
  gridItem({
    _key: 'sauna',
    title: '<h3>Sauna</h3>',
    tag: 'Wellness',
    content: 'Sweat out Friday before Saturday starts.'
  }),
  gridItem({
    _key: 'hot-tub',
    title: '<h3>Hot tub</h3>',
    tag: 'Wellness',
    content: 'Outdoor, among the pines. Best after dark.'
  }),
  gridItem({
    _key: 'spa',
    title: '<h3>Spa</h3>',
    tag: 'Bookings',
    content: 'Treatments by appointment — book through reception.'
  }),
  gridItem({
    _key: 'gym',
    title: '<h3>Gym</h3>',
    tag: 'Open',
    content: 'For the people who will actually use it. We salute you.'
  }),
  gridItem({
    _key: 'games-room',
    title: '<h3>Games room</h3>',
    tag: 'Indoor',
    content: "Pool table, board games, and the kids' room on Saturday night."
  }),
  gridItem({
    _key: 'tennis',
    title: '<h3>Tennis + yard games</h3>',
    tag: 'BYO skill',
    content: 'Court, racquets and lawn games by the firepits.'
  })
];

/**
 * The comp's section as an explicit constant — node 16:163's heading and qualifier over the nine
 * facilities of `ITEMS`.
 *
 * **Every story that counts, numbers or measures uses this, not the fixture** — the same split as
 * `SpecCardGridSection.stories`, and for the same reason. `Desktop` and `Mobile` assert the drawn nine
 * literally: nine cells, ordinals `01`–`09`, cell 09 as the phone orphan. They used to render `data`
 * and passed only because `/the-lodge` happens to publish nine facilities too, so one added or removed
 * in the Studio would have turned both red for no code reason.
 */
const MOCK: INumberedGridSection = {
  title: '<h2>Between events</h2>',
  meta: 'Free for all guests',
  items: ITEMS
};

/**
 * Real Sanity data when the dataset has a published instance, the design-faithful mock otherwise.
 *
 * There is one — `/the-lodge`'s facilities table — so today this is the fixture: the comp's heading
 * and qualifier, and nine facilities that are not the comp's nine. `PublishedContent` is the one story
 * on it, and every assertion there is derived from the data rather than from the comp.
 */
const data = sectionFixture<INumberedGridSection>('numberedGridSection') ?? MOCK;

/* ------------------------------------------------------------------------------------------------
 * Shared queries. The section's own class names are hashed, so everything is reached structurally —
 * which also means these assertions break if the markup changes shape, which is the point.
 * ---------------------------------------------------------------------------------------------- */

const gridOf = (canvasElement: HTMLElement) => canvasElement.querySelector('ol') as HTMLOListElement;
const cellsOf = (canvasElement: HTMLElement) => [...gridOf(canvasElement).children] as HTMLElement[];
/** The heading row is the grid's previous sibling; the qualifier is the `<p>` inside it. */
const metaOf = (canvasElement: HTMLElement): HTMLElement | null =>
  gridOf(canvasElement).previousElementSibling?.querySelector('p') ?? null;

/**
 * The qualifier's resolved `display`, or `null` when it is not in the markup at all.
 *
 * Two different absences, and the stories distinguish them on purpose: hidden by the container query
 * (the phone frame, where the copy exists but the design drops it) versus never rendered (the field
 * left empty in the CMS).
 */
const metaDisplayOf = (canvasElement: HTMLElement) => {
  const element = metaOf(canvasElement);

  return element ? getComputedStyle(element).display : null;
};

/** `grid-template-columns` computes to a list of used pixel lengths, one per column. */
const columnCountOf = (grid: HTMLElement) => getComputedStyle(grid).gridTemplateColumns.split(' ').length;

/**
 * The whole point of the section, asserted as one function because it has to hold at three columns,
 * at two, and with a ragged final row.
 *
 * Three separate claims:
 *
 *  1. **Nothing doubles.** Neighbours butt edge to edge (no gap), and each cell contributes exactly
 *     one 1px trailing hairline, so every interior line is 1px of ink rather than two cells' worth.
 *     Checked as `border-block-end` / `border-inline-end` at 1px against `border-block-start` /
 *     `border-inline-start` at 0 — the asymmetry *is* the mechanism.
 *  2. **Nothing is missing.** The grid carries the inset outline that closes the perimeter, which is
 *     the only thing drawing the outer edge beside an empty trailing slot.
 *  3. **Nothing was invented to close it.** The number of children equals the number of items, so
 *     the empty slot is a hole in the grid rather than a filler element in the accessibility tree.
 */
const expectSharedBorders = async (canvasElement: HTMLElement, itemCount: number) => {
  const grid = gridOf(canvasElement);
  const cells = cellsOf(canvasElement);
  const gridStyle = getComputedStyle(grid);

  await expect(cells).toHaveLength(itemCount);

  await expect(gridStyle.outlineStyle).toBe('solid');
  await expect(gridStyle.outlineWidth).toBe('1px');
  // Pulled inside the border box so it lands in the same 1px band the edge cells' own borders
  // occupy, instead of adding a second line outside them.
  await expect(gridStyle.outlineOffset).toBe('-1px');

  /*
   * Physical property names, reading the logical ones the module declares. The runner is a single
   * LTR horizontal-tb document, so `block-end` resolves to `bottom` and `inline-end` to `right`;
   * asking `getComputedStyle` for the physical pair is what every browser has always answered.
   */
  for (const cell of cells) {
    const style = getComputedStyle(cell);
    await expect(style.borderBottomWidth).toBe('1px');
    await expect(style.borderRightWidth).toBe('1px');
    await expect(style.borderTopWidth).toBe('0px');
    await expect(style.borderLeftWidth).toBe('0px');
  }

  // Row one, read across: each cell starts exactly where the previous one ends, so the 1px between
  // them is the left cell's border and nothing else.
  const columns = columnCountOf(grid);
  for (let column = 1; column < Math.min(columns, cells.length); column += 1) {
    await expect(cells[column].getBoundingClientRect().left).toBeCloseTo(
      cells[column - 1].getBoundingClientRect().right,
      0
    );
  }

  /*
   * The perimeter is the outline, and the last column sits flush inside it — when row one is full.
   * With fewer items than columns there is no last column to sit there, and the outline closes the
   * hole exactly as it does beside the phone orphan. Every `MOCK` story has a full first row, so for
   * them the condition always holds and the assertion always runs; `PublishedContent` is the one that
   * could meet a short row, and without the guard it would fail on `undefined` rather than on anything
   * about the grid.
   */
  if (cells.length >= columns) {
    await expect(cells[columns - 1].getBoundingClientRect().right).toBeCloseTo(grid.getBoundingClientRect().right, 0);
  }
  await expect(cells[0].getBoundingClientRect().left).toBeCloseTo(grid.getBoundingClientRect().left, 0);
};

/** The visible ordinals, in DOM order — the `aria-hidden` span at the head of each cell. */
const ordinalsOf = (canvasElement: HTMLElement) =>
  cellsOf(canvasElement).map((cell) => cell.querySelector('[aria-hidden="true"]')?.textContent);

/**
 * **The section rendered against whatever is in the dataset today**, at the canvas's own width.
 *
 * Every assertion is read out of `data`: one cell per named item, numbered from its array position and
 * carrying its own published name; a column count the stylesheet can actually produce; the qualifier
 * present exactly when the data has one; and the section's whole claim — shared borders, a closed
 * perimeter, nothing invented to fill a ragged last row — at the published count rather than the
 * comp's nine. That is the complement to `Desktop` and `Mobile`, which pin nine.
 *
 * No decorator, so the column count is whatever the canvas resolves: two or three, never one.
 */
export const PublishedContent: Story = {
  args: data,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The component's own filter: an item with no name draws no cell.
    const published = (data.items ?? []).filter((item) => hasTitleText(item?.title));

    /*
     * Not vacuous. `data` is the fixture when there is one and `MOCK` when there is not, so there are
     * always facilities to render — zero here means the dataset lost its content, which is worth
     * failing on rather than passing silently.
     */
    await expect(published.length).toBeGreaterThan(0);

    await expect([2, 3]).toContain(columnCountOf(gridOf(canvasElement)));

    // One cell per item, every interior line 1px, the perimeter closed, and no filler — at this count.
    await expectSharedBorders(canvasElement, published.length);

    // Numbered from array position, however many there are.
    await expect(ordinalsOf(canvasElement)).toEqual(published.map((_, index) => formatOrdinal(index)));

    // Each cell named by its own published title, in order — `h3` under the section's `h2` when there
    // is one, `h2` when there is not.
    const cellLevel = hasTitleText(data.title) ? 3 : 2;
    await expect(canvas.getAllByRole('heading', { level: cellLevel }).map((heading) => heading.textContent)).toEqual(
      published.map((item) => stripTitleTags(item.title).text)
    );

    // The qualifier is in the markup exactly when the data has one.
    await expect(metaOf(canvasElement) === null).toBe(!data.meta?.trim());
  }
};

/** The comp's section at the canvas's own width — on `MOCK`, like every story but the one above. */
export const Default: Story = {
  args: MOCK
};

/**
 * The desktop frame (16:166) — three columns, nine cells, a complete final row.
 *
 * 75rem is the design's 1200px content width at a 16px root.
 */
export const Desktop: Story = {
  args: MOCK,
  decorators: [atWidth('75rem')],
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    const cells = cellsOf(canvasElement);

    await expect(columnCountOf(grid)).toBe(3);
    await expectSharedBorders(canvasElement, 9);

    /*
     * "Cells uniform height regardless of content" is `grid-auto-rows: 1fr`, not a fixed height — so
     * it is asserted as a *relationship* rather than a number. Nine cells in three equal rows means
     * every cell measures the same, including the ones holding one line of copy against the three
     * that hold two.
     */
    const [first, ...rest] = cells.map((cell) => cell.getBoundingClientRect().height);
    for (const height of rest) {
      await expect(height).toBeCloseTo(first, 0);
    }

    /*
     * The numbering is a function of array position. `formatOrdinal` takes the zero-based `map`
     * index and returns the one-based padded string, so a list starting at "02" is the signature of
     * a caller that passed `index + 1`.
     */
    await expect(ordinalsOf(canvasElement)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09']);

    // The qualifier shares the heading's baseline on a container this wide (node 16:163).
    await expect(metaDisplayOf(canvasElement)).toBe('block');
  }
};

/**
 * The phone frame (16:312) — two columns, nine cells, and the orphan.
 *
 * 24.375rem is the design's 390px viewport at a 16px root. The section is rendered at that width
 * rather than that viewport, which is what the container queries buy: the assertions hold in the
 * same browser window as `Desktop`.
 */
export const Mobile: Story = {
  args: MOCK,
  decorators: [atWidth('24.375rem')],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}16-312` }
  },
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    const cells = cellsOf(canvasElement);

    // Two, never one — node 16:312 is a 2×5 grid and the AC says so explicitly.
    await expect(columnCountOf(grid)).toBe(2);
    await expectSharedBorders(canvasElement, 9);

    /*
     * ## The orphan
     *
     * Nine into two leaves cell 09 alone on row five (node 16:393). Three things are true of it, and
     * together they are the decision: it keeps its own column width rather than stretching across
     * the row, the table's right edge is still drawn beside it, and **no filler element was added**
     * to draw that edge — `expectSharedBorders` has already asserted the child count is nine.
     *
     * The empty half is therefore a hole in the grid, closed by the container's inset outline. That
     * is what the design draws, and it is the option with nothing in the accessibility tree: a
     * filler `<li>` would be announced as a tenth list item with no content, and `aria-hidden` on it
     * would leave `<ol>` with a child that is neither a list item nor hidden from layout.
     */
    const orphan = cells[8];
    await expect(orphan.getBoundingClientRect().left).toBeCloseTo(cells[0].getBoundingClientRect().left, 0);
    await expect(orphan.getBoundingClientRect().right).toBeLessThan(grid.getBoundingClientRect().right - 1);
    // The orphan's row is the last one, so the outline is the only thing closing its right half.
    await expect(orphan.getBoundingClientRect().bottom).toBeCloseTo(grid.getBoundingClientRect().bottom, 0);

    /*
     * Rows are sized to content here, which is the other half of the "uniform on desktop" pair. The
     * design draws five rows at 139.22, 139.61, 139.61, 139.61 and 153 — so at least two cells must
     * differ in height, where on `Desktop` none may.
     */
    const heights = cells.map((cell) => Math.round(cell.getBoundingClientRect().height));
    await expect(new Set(heights).size).toBeGreaterThan(1);

    /*
     * "FREE FOR ALL GUESTS" is dropped on the phone (16:310 draws the heading alone). `display: none`
     * rather than a width branch in the component, so it leaves the accessibility tree too — a phone
     * reader is not read a line phone readers cannot see. See the note on `.meta`.
     */
    await expect(metaDisplayOf(canvasElement)).toBe('none');
  }
};

/**
 * A ragged final row at the **three**-column width — the other shape of the same problem, and the
 * one the design never draws.
 *
 * Five items into three columns leaves two cells on row two and one empty slot, so the outline is
 * closing a hole that is a third of the table wide rather than a half. Worth its own story because
 * the naive fix for the phone case (a single filler element) would pass `Mobile` and fail here.
 */
export const IncompleteLastRow: Story = {
  args: { ...MOCK, items: ITEMS.slice(0, 5) },
  decorators: [atWidth('75rem')],
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    const cells = cellsOf(canvasElement);

    await expect(columnCountOf(grid)).toBe(3);
    await expectSharedBorders(canvasElement, 5);

    const last = cells[4];
    await expect(last.getBoundingClientRect().right).toBeLessThan(grid.getBoundingClientRect().right - 1);
    await expect(last.getBoundingClientRect().bottom).toBeCloseTo(grid.getBoundingClientRect().bottom, 0);
    await expect(ordinalsOf(canvasElement)).toEqual(['01', '02', '03', '04', '05']);
  }
};

/**
 * The heading alone, which is what the phone frame draws and what an editor gets by leaving the
 * optional field empty. The row must not reserve the space.
 */
export const WithoutMeta: Story = {
  args: { ...MOCK, meta: undefined },
  decorators: [atWidth('75rem')],
  play: async ({ canvasElement }) => {
    // Not rendered at all, rather than rendered empty — the row is `space-between`, so an empty
    // element would still hold the heading away from the edge it is drawn against.
    await expect(metaOf(canvasElement)).toBeNull();
  }
};

/**
 * Cells with no tag and no description — the minimum an item can be, since only the name is
 * required.
 *
 * The ordinal must stay put rather than centring in the head row now that nothing balances it, and
 * the table must still be square: `grid-auto-rows: 1fr` means the short cells take the height of the
 * tallest, which here is all of them.
 */
export const NameOnly: Story = {
  args: {
    ...MOCK,
    items: ITEMS.map((item) => ({ _key: item._key, title: item.title }))
  },
  decorators: [atWidth('75rem')],
  play: async ({ canvasElement }) => {
    const cells = cellsOf(canvasElement);

    await expectSharedBorders(canvasElement, 9);
    await expect(cells[0].querySelectorAll('span')).toHaveLength(1);
    await expect(ordinalsOf(canvasElement)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09']);
  }
};

/**
 * The page flipped to dark.
 *
 * A story-level `globals.theme` rather than `args.sectionFields`, following `TwoColumnListSection`:
 * it is the *same* path the toolbar drives, so it exercises `tools/storybook/sectionStory`'s
 * injection rather than stepping around it — and `INumberedGridSection` does not declare
 * `sectionFields`, so passing one through `args` would not type.
 *
 * The assertion is the reason the story exists: **nothing in the module names a colour**, so the
 * table's rules have to invert with the page. `--stroke-cards` is `--stone-900` on light and
 * `--stone-50` on dark, and a hardcoded `#131412` would leave the grid invisible here while looking
 * perfect in every other story.
 */
export const OnDarkPage: Story = {
  args: MOCK,
  decorators: [atWidth('75rem')],
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    const STONE_50 = 'rgb(243, 241, 234)';

    await expect(getComputedStyle(grid).outlineColor).toBe(STONE_50);
    await expect(getComputedStyle(cellsOf(canvasElement)[0]).borderBottomColor).toBe(STONE_50);
  }
};

/**
 * The two states a `blockContentSimple` description can reach that the drawn content never does — a
 * second paragraph, and a link inside one.
 *
 * Both were review findings rather than design requirements, and each closes a gap nothing else in
 * this file could see.
 *
 * **The spacing.** `TextBlock` routes a `normal` block through `config.span`, whose `spacing`
 * default is `md` (16px) rather than `config.p`'s `sm` — so the section's `DESCRIPTION_CONFIG` has
 * to set it explicitly, and the wrong value is invisible on one paragraph because `Text` zeroes the
 * padding on `:last-child`. Two paragraphs is the only thing that shows it, and 8px is the cell's
 * own stack gap, so the box has one rhythm rather than two.
 *
 * **The focus ring.** Every other story in this file renders a section with nothing focusable in it,
 * so none of them could tell you whether the table's borders clip an outline. A link in a
 * description is the one focusable thing this section can contain; `Link`'s `:focus-visible` ring is
 * `3px` at `3px` of offset, against a cell padding that never falls below 14px.
 */
export const RichDescription: Story = {
  args: {
    ...MOCK,
    items: [
      {
        _key: 'spa',
        title: '<h3>Spa</h3>',
        tag: 'Bookings',
        content: [
          mockBlock('normal', 'Treatments by appointment — book through reception.'),
          mockBlock('normal', [
            { text: 'Or ' },
            { text: 'email the spa', marks: ['spa-link'] },
            { text: ' before you arrive.' }
          ])
        ].map((block, index) =>
          index === 1 ? { ...block, markDefs: [{ _key: 'spa-link', _type: 'link', ...mockExternalLink() }] } : block
        )
      },
      ITEMS[1],
      ITEMS[2]
    ]
  },
  decorators: [atWidth('75rem')],
  play: async ({ canvasElement }) => {
    const cell = cellsOf(canvasElement)[0];
    const paragraphs = [...cell.querySelectorAll('p')];

    await expect(paragraphs).toHaveLength(2);

    /*
     * 8px, not the 16px `config.span` would have supplied — measured as the gap between the two
     * paragraph boxes rather than as a declaration, so it stays true if the mechanism changes.
     * `Text` renders the step as `padding-bottom`, and zeroes it on the last child.
     */
    const gap = paragraphs[1].getBoundingClientRect().top - paragraphs[0].getBoundingClientRect().bottom;
    await expect(Math.round(gap)).toBe(0);
    await expect(getComputedStyle(paragraphs[0]).paddingBottom).toBe('8px');
    await expect(getComputedStyle(paragraphs[1]).paddingBottom).toBe('0px');

    // The one focusable thing a cell can hold: its ring must not be clipped by the table's rules.
    const link = cell.querySelector('a') as HTMLAnchorElement;
    await expect(link).not.toBeNull();
    link.focus();
    await expect(document.activeElement).toBe(link);
    await expect(getComputedStyle(cell).overflow).toBe('visible');
    await expect(getComputedStyle(gridOf(canvasElement)).overflow).toBe('visible');
  }
};
