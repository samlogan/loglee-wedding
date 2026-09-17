import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { IHeaderDisplaySection } from '@/tools/sanity/schema/sections/headerDisplaySection';
import { mockBlock } from '@/tools/storybook/mockBlockContent';
import sectionFixture from '@/tools/storybook/sectionFixture';

import HeaderDisplaySection from '.';

const FIGMA = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=';

/**
 * The shared page header used at the top of Planner, Stay and The Lodge.
 *
 * `parameters.design` points at the **header frame** rather than at the whole page frame the ticket
 * links, so `/review-design` compares against the thing this section renders. Node 1:615 is the Stay
 * header, which is the fullest of the three — heading, lede and meta — and so matches `Default`.
 * Stories that mirror a different page override it.
 */
const meta = {
  title: 'Sections/Header Display',
  component: HeaderDisplaySection,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}1-615` }
  }
} satisfies Meta<typeof HeaderDisplaySection>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A fixed width, so the container query resolves the same way whatever the test canvas is.
 *
 * `rem` and not `px`, matching `Header.stories` and `Footer.stories`: the switch is `60rem`, so a
 * `px` wrapper makes the assertions below depend on the reader's root font size — `Desktop` would
 * quietly flip to the stacked branch at a ~24px root and assert the wrong layout while still
 * passing its name. The design's px frame is stated at each call site.
 *
 * Typed `Decorator` rather than `(Story: any)`: Storybook exports the type, `sectionStory.tsx`
 * already uses it, and it removes a lint suppression that seven more section stories would copy.
 */
const atWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ width }}>
      <Story />
    </div>
  );

/**
 * Real Sanity data when there is any, design-faithful mock otherwise — and today it is always the
 * mock: the dataset has no content documents yet, so `sectionFixture` returns `undefined`.
 *
 * The copy and the item counts are Stay's (node 1:615) verbatim. The one deliberate departure is
 * case: Figma types "STAY" and "39 ROOMS" in capitals, and this passes "Stay" and "39 rooms" so the
 * uppercasing under test is the section's CSS rather than the mock's shift key. It renders
 * identically to the comp, and it is the shape an editor should store — the schema now says so,
 * because short literal all-caps runs are what screen readers most often spell out letter by
 * letter.
 */
const data = sectionFixture<IHeaderDisplaySection>('headerDisplaySection') ?? {
  title: '<h1>Stay</h1>',
  content: [
    mockBlock(
      'normal',
      'We’ve booked the whole Lodge so everyone can stay together: 39 rooms across 9 acres of gardens, pine trees and river frontage.'
    )
  ],
  items: ['39 rooms', '9 acres', '2 nights', '1 river']
};

/** The section at the canvas's own width — how it behaves on a real page. */
export const Default: Story = {
  args: data,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // AC: the heading is the page `h1`, whatever tag the editor picked in the Studio's TitleInput.
    // The mock says `<h1>`; `WithoutLede` below passes `<h2>` to prove the tag is forced, not copied.
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Stay');

    // AC: the meta block is a repeater. `role="list"` is on the element for WebKit's benefit; this
    // asserts the semantics it buys.
    await expect(within(canvas.getByRole('list')).getAllByRole('listitem')).toHaveLength(4);
  }
};

/**
 * Desktop: heading and aside side by side, sharing one bottom edge.
 *
 * 80rem is 1280px, the design's desktop frame. Pinned as a wrapper rather than left to the canvas so the
 * container query resolves the same way in the component-test runner as it does here — the switch is
 * on the section's own inline size, and a test canvas narrower than 960px would otherwise assert the
 * stacked layout while claiming to be desktop.
 *
 * Note what this story does *not* reproduce: `fluid()` interpolates on `vw`, so type and spacing are
 * still the canvas's rather than a 1280px window's. Layout is exact; the 132px heading is not.
 */
export const Desktop: Story = {
  args: data,
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole('heading', { level: 1 });
    const row = heading.parentElement as HTMLElement;

    await expect(getComputedStyle(row).flexDirection).toBe('row');
    // The layout idea: the meta hangs off the bottom of the heading. Figma bottom-aligns all three
    // desktop frames, and on Planner the two share a bottom edge to the pixel.
    await expect(getComputedStyle(row).alignItems).toBe('flex-end');
  }
};

/**
 * Mobile: the aside drops beneath the heading and left-aligns.
 *
 * 23.4375rem is 375px, the narrow anchor of the fluid scale and close to the design's 390px mobile
 * frame. A
 * width and not a viewport, deliberately — the reflow is a container query, so a story that reached
 * this branch by shrinking the window would pass just as well against the viewport media query this
 * is not, and that rule gets a narrow section in a wide window backwards.
 */
export const Mobile: Story = {
  args: data,
  decorators: [atWidth('23.4375rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-688` } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole('heading', { level: 1 });
    const row = heading.parentElement as HTMLElement;

    await expect(getComputedStyle(row).flexDirection).toBe('column');

    // Left-aligned beneath the heading, not still hanging off the right edge.
    const aside = row.lastElementChild as HTMLElement;
    await expect(aside.getBoundingClientRect().left).toBeCloseTo(heading.getBoundingClientRect().left, 0);
  }
};

/**
 * No lede — the Planner header (node 1:307), which is the only one of the three that has none.
 *
 * Without a column to fill, the aside hugs its content and parks against the right edge rather than
 * taking half the row. The two items are Planner's two lines verbatim.
 *
 * The title is deliberately `<h2>` here: the section forces `as="h1"`, and this is the story that
 * proves it rather than inheriting whatever the editor chose.
 */
export const WithoutLede: Story = {
  args: {
    title: '<h2>The Weekend</h2>',
    items: ['3 days · 3 nights optional', 'All times AEDT · TBC']
  },
  decorators: [atWidth('80rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-307` } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole('heading', { level: 1 });
    const row = heading.parentElement as HTMLElement;
    const aside = row.lastElementChild as HTMLElement;

    // Forced, not copied from the `<h2>` above.
    await expect(heading.tagName).toBe('H1');
    // Hugging the right edge: the aside's right sits on the row's, and it is nowhere near half wide.
    await expect(aside.getBoundingClientRect().right).toBeCloseTo(row.getBoundingClientRect().right, 0);
    await expect(aside.getBoundingClientRect().width).toBeLessThan(row.getBoundingClientRect().width / 2);

    /*
     * Planner draws its two meta lines stacked, not side by side (node 1:311). The two assertions
     * above are both satisfied by a single over-wide line too, so this is the one that actually
     * pins the drawn shape — same technique `LongMeta` uses, counting distinct item offsets.
     */
    const items = within(canvas.getByRole('list')).getAllByRole('listitem');
    const lines = new Set(items.map((item) => Math.round(item.getBoundingClientRect().top)));
    await expect(lines.size).toBe(2);

    // Right-aligned, as the comp sets them: every line ends on the aside's right edge.
    for (const item of items) {
      await expect(item.getBoundingClientRect().right).toBeCloseTo(aside.getBoundingClientRect().right, 0);
    }
  }
};

/**
 * No meta — The Lodge's mobile header (node 16:277), which drops the row entirely.
 *
 * Nothing to flag as missing: the lede takes the column on its own and the heading keeps its half.
 */
export const WithoutMeta: Story = {
  args: {
    title: '<h1>The Lodge</h1>',
    content: [
      mockBlock(
        'normal',
        'Nine acres of gardens, pine trees and river. Between events, the whole place is yours — eat, swim, sweat, nap, repeat.'
      )
    ]
  },
  decorators: [atWidth('80rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}16-277` } }
};

/**
 * Both optional parts absent — the degenerate case the AC calls out.
 *
 * The aside is not rendered at all rather than rendered empty, so there is no stray flex gap and no
 * empty `<ul>` for a screen reader to announce as "list, 0 items".
 */
export const TitleOnly: Story = {
  args: { title: '<h1>The Weekend</h1>' },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { level: 1 })).toBeInTheDocument();
    await expect(canvas.queryByRole('list')).not.toBeInTheDocument();
  }
};

/**
 * More meta than fits on one line.
 *
 * The design drops items on small screens — The Lodge loses the row, Planner loses its first line —
 * but that is a content decision, so this wraps rather than truncating. The AC asks for exactly
 * that, and the play function asserts it by reading the items' offsets rather than by eye.
 */
export const LongMeta: Story = {
  args: {
    ...data,
    items: [
      '39 rooms',
      '9 acres',
      '2 nights',
      '1 river',
      'Map · level 01',
      '9 locations',
      'All unlocked',
      '3 days · 3 nights optional',
      'All times AEDT · TBC',
      'Check in from 2pm'
    ]
  },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const items = within(canvas.getByRole('list')).getAllByRole('listitem');

    await expect(items).toHaveLength(10);

    // Wrapped, not truncated: the items occupy more than one line, and every one of them is laid
    // out (a truncating rule would leave some at zero width or clipped out of the box).
    const lines = new Set(items.map((item) => Math.round(item.getBoundingClientRect().top)));
    await expect(lines.size).toBeGreaterThan(1);
    for (const item of items) {
      await expect(item.getBoundingClientRect().width).toBeGreaterThan(0);
    }
  }
};

/**
 * The lede an editor typed into and then emptied.
 *
 * Sanity does not unset the field — it keeps one `normal` block whose only child is `''` — so
 * `content` arrives with `length === 1` and every naive truthiness test reports a lede that is not
 * there. The visible cost is not a stray empty paragraph (there is none, `TextBlock` is never
 * mounted) but the *layout*: `.row_split` would apply and hand half the row to an empty column.
 *
 * Asserted on `flex-grow` rather than on a class name, because the class is the mechanism and the
 * 50/50 split is the behaviour.
 */
export const EmptyLede: Story = {
  args: {
    title: '<h1>The Weekend</h1>',
    content: [mockBlock('normal', '   ')],
    items: ['All times AEDT · TBC']
  },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole('heading', { level: 1 });

    // No paragraph at all — the section never mounts `TextBlock` for an empty lede.
    await expect(canvasElement.querySelector('p')).toBeNull();
    // `0` is the un-split default (`flex: 0 1 auto`); `.row_split` would make it `1`.
    await expect(getComputedStyle(heading).flexGrow).toBe('0');
    // The meta still renders — emptying the lede must not take the rest of the aside with it.
    await expect(within(canvas.getByRole('list')).getAllByRole('listitem')).toHaveLength(1);
  }
};

/**
 * One meta item long enough to be its own line, at the narrow end.
 *
 * A flex item's automatic minimum is its `min-content` width, and the inherited
 * `overflow-wrap: break-word` does **not** reduce `min-content` — so before `.metaItem` carried
 * `min-width: 0`, a single unbroken run pushed the row past the viewport: measured 167px of
 * horizontal scroll at 320px with the root font size doubled, a WCAG 1.4.10 / 1.4.4 failure. The
 * string below is the shape that produces it — a pasted reference with nothing to break on.
 */
export const LongMetaItem: Story = {
  args: {
    title: '<h1>Stay</h1>',
    items: ['Accommodationbookingreferencenumberpleasequoteonarrival']
  },
  decorators: [atWidth('23.4375rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [item] = within(canvas.getByRole('list')).getAllByRole('listitem');
    const row = canvas.getByRole('heading', { level: 1 }).parentElement as HTMLElement;

    // Wraps inside the column rather than widening it. A half-pixel of slack for sub-pixel layout.
    await expect(item.getBoundingClientRect().width).toBeLessThanOrEqual(row.getBoundingClientRect().width + 0.5);
    // And it is still laid out, i.e. wrapped rather than collapsed to nothing.
    await expect(item.getBoundingClientRect().height).toBeGreaterThan(0);
  }
};
