import type { Meta, StoryObj } from '@storybook/nextjs-vite';
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

/** A fixed width, so the container query resolves the same way whatever the test canvas is. */
const atWidth =
  (width: string) =>
  // eslint-disable-next-line typescript-eslint/no-explicit-any -- Storybook's decorator story arg
  (Story: any) => (
    <div style={{ width }}>
      <Story />
    </div>
  );

/**
 * Real Sanity data when there is any, design-faithful mock otherwise — and today it is always the
 * mock: the dataset has no content documents yet, so `sectionFixture` returns `undefined`.
 *
 * The copy, the item counts and the four-item meta row are Stay's (node 1:615) verbatim. The one
 * deliberate departure is the heading's case: Figma types "STAY" in capitals, and this passes "Stay"
 * so the section's own `text-transform: uppercase` is the thing under test rather than the mock's
 * shift key. It renders identically to the comp.
 */
const data = sectionFixture<IHeaderDisplaySection>('headerDisplaySection') ?? {
  title: '<h1>Stay</h1>',
  content: [
    mockBlock(
      'normal',
      'We’ve booked the whole Lodge so everyone can stay together: 39 rooms across 9 acres of gardens, pine trees and river frontage.'
    )
  ],
  items: ['39 ROOMS', '9 ACRES', '2 NIGHTS', '1 RIVER']
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
 * 1280px is the design's desktop frame. Pinned as a wrapper rather than left to the canvas so the
 * container query resolves the same way in the component-test runner as it does here — the switch is
 * on the section's own inline size, and a test canvas narrower than 960px would otherwise assert the
 * stacked layout while claiming to be desktop.
 *
 * Note what this story does *not* reproduce: `fluid()` interpolates on `vw`, so type and spacing are
 * still the canvas's rather than a 1280px window's. Layout is exact; the 132px heading is not.
 */
export const Desktop: Story = {
  args: data,
  decorators: [atWidth('1280px')],
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
 * 375px is the narrow anchor of the fluid scale and close to the design's 390px mobile frame. A
 * width and not a viewport, deliberately — the reflow is a container query, so a story that reached
 * this branch by shrinking the window would pass just as well against the viewport media query this
 * is not, and that rule gets a narrow section in a wide window backwards.
 */
export const Mobile: Story = {
  args: data,
  decorators: [atWidth('375px')],
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
    items: ['3 DAYS · 3 NIGHTS OPTIONAL', 'ALL TIMES AEDT · TBC']
  },
  decorators: [atWidth('1280px')],
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
  decorators: [atWidth('1280px')],
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
  decorators: [atWidth('1280px')],
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
      '39 ROOMS',
      '9 ACRES',
      '2 NIGHTS',
      '1 RIVER',
      'MAP · LEVEL 01',
      '9 LOCATIONS',
      'ALL UNLOCKED',
      '3 DAYS · 3 NIGHTS OPTIONAL',
      'ALL TIMES AEDT · TBC',
      'CHECK IN FROM 2PM'
    ]
  },
  decorators: [atWidth('1280px')],
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
