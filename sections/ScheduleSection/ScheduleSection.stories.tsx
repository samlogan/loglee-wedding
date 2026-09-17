import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type {
  IScheduleSection,
  IScheduleSectionDay,
  IScheduleSectionEvent
} from '@/tools/sanity/schema/sections/scheduleSection';
import { mockBlock } from '@/tools/storybook/mockBlockContent';
import sectionFixture from '@/tools/storybook/sectionFixture';

import ScheduleSection from '.';

const FIGMA = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=';

/**
 * The three-day weekend schedule — a band per day, each pairing a summary column with time-stamped
 * event rows.
 *
 * `parameters.design` points at **node 1:312, the Day 01 band**, rather than at the whole page frame
 * the ticket links. The design has no wrapper frame around the three days — they are siblings at
 * page level — so the band is the largest node that is *only* this section, and it is the unit the
 * section repeats. Stories mirroring a different band override it.
 */
const meta = {
  title: 'Sections/Schedule',
  component: ScheduleSection,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}1-312` }
  }
} satisfies Meta<typeof ScheduleSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A fixed width, so both container queries resolve the same way whatever the test canvas is.
 *
 * `rem` and not `px`, matching `HeaderDisplaySection.stories`: the switches are `60rem` and `32rem`,
 * so a `px` wrapper makes the assertions below depend on the reader's root font size — `Desktop`
 * would quietly flip to the stacked branch at a ~24px root and assert the wrong layout while still
 * passing its name. The design's px frame is stated at each call site.
 */
const atWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ width }}>
      <Story />
    </div>
  );

/**
 * The description is the only event field that needs a shape rather than a string, so this wraps
 * just that and leaves every other value readable against the comp.
 */
const scheduleEvent = (
  event: Omit<IScheduleSectionEvent, 'description'> & { description?: string }
): IScheduleSectionEvent => ({
  ...event,
  description: event.description ? [mockBlock('normal', event.description)] : undefined
});

/**
 * Planner's three bands verbatim — nodes 1:312, 1:348 and 1:392.
 *
 * The one deliberate departure from the comp is **case**: Figma types "DAY 01", "FRI" and
 * "RECEPTION" in capitals, and this passes "Day 01", "Fri" and "Reception" so the uppercasing under
 * test is the section's CSS rather than the mock's shift key. It renders identically, and it is the
 * shape an editor should store — the schema says so, because short literal all-caps runs are what
 * screen readers most often spell out letter by letter.
 *
 * The times keep the comp's mix on purpose: "from 2pm" beside "7pm" and "6:30pm" is the evidence
 * that settled `time` as one free-text string rather than a start/end pair.
 */
const DAYS: IScheduleSectionDay[] = [
  {
    _key: 'fri',
    eyebrow: 'Day 01',
    title: '<h2>Fri</h2>',
    date: '12 February 2027',
    content: [mockBlock('normal', 'Arrive whenever suits. Check in, find your room, find the pool.')],
    events: [
      scheduleEvent({
        _key: 'fri-arrivals',
        time: 'from 2pm',
        title: 'Arrivals & check in',
        description: 'Drop your bags, settle in, wander the gardens.',
        location: 'Reception'
      }),
      scheduleEvent({
        _key: 'fri-dinner',
        time: '7pm',
        title: 'Arrival dinner',
        description: 'A long, relaxed dinner for everyone who made it down on Friday.',
        location: 'Lulu’s'
      })
    ]
  },
  {
    _key: 'sat',
    eyebrow: 'Day 02',
    title: '<h2>Sat</h2>',
    date: '13 February 2027',
    content: [mockBlock('normal', 'The wedding. Trees, river, firepits, dancefloor.')],
    events: [
      scheduleEvent({
        _key: 'sat-ceremony',
        time: '4pm',
        title: 'Ceremony',
        description: 'An outdoor ceremony space among the trees beside the river.',
        location: 'Tree Cathedral'
      }),
      scheduleEvent({
        _key: 'sat-cocktails',
        time: '5pm',
        title: 'Cocktail hour',
        description: 'Drinks around the firepits, yard games on the lawn.',
        location: 'Firepits'
      }),
      scheduleEvent({
        _key: 'sat-reception',
        time: '6:30pm',
        title: 'Reception',
        description: 'Dinner, speeches and dancing until late.',
        location: 'Wedding Hall'
      })
    ]
  },
  {
    _key: 'sun',
    eyebrow: 'Day 03',
    title: '<h2>Sun</h2>',
    date: '14 February 2027',
    content: [mockBlock('normal', 'Slow start. Coffee, eggs, goodbyes.')],
    events: [
      scheduleEvent({
        _key: 'sun-breakfast',
        time: '9am',
        title: 'Recovery breakfast',
        description: 'Everyone together one last time.',
        location: 'Lulu’s'
      }),
      scheduleEvent({
        _key: 'sun-checkout',
        time: '11am',
        title: 'Check out',
        description: 'No rush — the pool is open until you leave.',
        location: 'Reception'
      })
    ]
  }
];

/**
 * Real Sanity data when there is any, design-faithful mock otherwise — and today it is always the
 * mock: the dataset has no content documents yet, so `sectionFixture` returns `undefined`.
 */
const data = sectionFixture<IScheduleSection>('scheduleSection') ?? { days: DAYS };

/** Walk from a heading to the boxes the layout assertions are about, without naming a hashed class. */
const dayInnerOf = (heading: HTMLElement) => heading.closest('li')?.firstElementChild?.firstElementChild as HTMLElement;

/** The four children of an event row, in source order: time, location, title, description. */
const partsOf = (row: HTMLElement) => [...row.children] as HTMLElement[];

const textOf = (elements: HTMLElement[]) => elements.map((element) => element.textContent?.trim());

const rowFor = (canvas: ReturnType<typeof within>, name: string) =>
  canvas.getByRole('heading', { level: 3, name }).closest('li') as HTMLElement;

/**
 * The distance between the lowest thing painted in a row and the row's own bottom edge — i.e. the
 * row's bottom padding, and nothing else.
 *
 * Measured against the *lowest* child rather than the last one in source order, because they are
 * not the same element: the children are baseline-aligned, and the location chip's border box hangs
 * roughly 9px below the title it shares a line with.
 */
const tailOf = (row: HTMLElement) =>
  row.getBoundingClientRect().bottom -
  Math.max(...[...row.children].map((part) => part.getBoundingClientRect().bottom));

/** The section at the canvas's own width — how it behaves on a real page. */
export const Default: Story = {
  args: data,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // AC: days are a repeater. Each band's heading is forced to `h2` under the page's `h1`.
    await expect(canvas.getAllByRole('heading', { level: 2 })).toHaveLength(3);
    // AC: events are a repeater too — 2 + 3 + 2 across the three days.
    await expect(canvas.getAllByRole('heading', { level: 3 })).toHaveLength(7);

    /*
     * One list of days plus one list of events per day. `role="list"` is on the elements for
     * WebKit's benefit — the global reset removes the marker, and WebKit then drops the role — so
     * this asserts the semantics that buys rather than the attribute.
     */
    await expect(canvas.getAllByRole('list')).toHaveLength(4);
  }
};

/**
 * Desktop: the band splits into a summary column beside its events, and the event row becomes
 * `[time] [title / description] [location]`.
 *
 * 80rem is 1280px, the design's desktop frame. Pinned as a wrapper rather than left to the canvas so
 * both container queries resolve here the way they do in the component-test runner — the switches
 * are on the section's own boxes, and a narrower canvas would otherwise assert the stacked layout
 * while claiming to be desktop.
 *
 * The DOM-order assertion is the point of this story as much as the geometry: it is byte-identical
 * to the one in `Mobile`, which is what makes the reflow a **reorder** rather than two markups.
 *
 * Note what this story does *not* reproduce: `fluid()` interpolates on `vw`, so type and spacing are
 * still the canvas's rather than a 1280px window's. Layout is exact; the 88px day heading is not.
 */
export const Desktop: Story = {
  args: data,
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [dayHeading] = canvas.getAllByRole('heading', { level: 2 });
    const dayInner = dayInnerOf(dayHeading);

    await expect(getComputedStyle(dayInner).flexDirection).toBe('row');

    // The narrow summary column beside the wider event column — the design's 400px against 760px.
    const [summary, events] = [...dayInner.children] as HTMLElement[];
    await expect(events.getBoundingClientRect().width).toBeGreaterThan(summary.getBoundingClientRect().width);

    const row = rowFor(canvas, 'Arrivals & check in');
    const [time, location, title, description] = partsOf(row);

    // Identical to `Mobile`. One DOM, two layouts.
    await expect(textOf([time, location, title, description])).toEqual([
      '[from 2pm]',
      'Reception',
      'Arrivals & check in',
      'Drop your bags, settle in, wander the gardens.'
    ]);

    const rowRect = row.getBoundingClientRect();
    const timeRect = time.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const locationRect = location.getBoundingClientRect();
    const descriptionRect = description.getBoundingClientRect();

    // Three columns across one line: time in the left gutter, title beside it, chip flush right.
    await expect(timeRect.left).toBeCloseTo(rowRect.left, 0);
    await expect(titleRect.left).toBeGreaterThan(timeRect.right);
    await expect(locationRect.left).toBeGreaterThan(titleRect.right);
    await expect(locationRect.right).toBeCloseTo(rowRect.right, 0);
    // "One line" — the title's box overlaps the time's vertically rather than sitting under it.
    await expect(titleRect.top).toBeLessThan(timeRect.bottom);

    // The description sits under the *title*, not under the gutter — the second column, row two.
    await expect(descriptionRect.top).toBeGreaterThanOrEqual(titleRect.bottom - 0.5);
    await expect(descriptionRect.left).toBeCloseTo(titleRect.left, 0);
  }
};

/**
 * Mobile: the band's split collapses to one column, and the event row reorders.
 *
 * 23.4375rem is 375px, the narrow anchor of the fluid scale and close to the design's 390px frame. A
 * width and not a viewport, deliberately — the reflow is a container query, so a story that reached
 * this branch by shrinking the window would pass just as well against the viewport media query this
 * is not.
 *
 * The discriminating assertion for the AC's "genuine reorder, not a column collapse" is that the
 * time and the location **share a line**. Stacking the three desktop columns would put the location
 * on a line of its own; here it is lifted up beside the time, and the title and description follow
 * beneath the pair.
 */
export const Mobile: Story = {
  args: data,
  decorators: [atWidth('23.4375rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-469` } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [dayHeading] = canvas.getAllByRole('heading', { level: 2 });
    const dayInner = dayInnerOf(dayHeading);

    await expect(getComputedStyle(dayInner).flexDirection).toBe('column');

    // The summary is above its events, both at the full content width.
    const [summary, events] = [...dayInner.children] as HTMLElement[];
    await expect(events.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      summary.getBoundingClientRect().bottom - 0.5
    );
    await expect(events.getBoundingClientRect().width).toBeCloseTo(summary.getBoundingClientRect().width, 0);

    const row = rowFor(canvas, 'Arrivals & check in');
    const [time, location, title, description] = partsOf(row);

    // Identical to `Desktop`. One DOM, two layouts.
    await expect(textOf([time, location, title, description])).toEqual([
      '[from 2pm]',
      'Reception',
      'Arrivals & check in',
      'Drop your bags, settle in, wander the gardens.'
    ]);

    const rowRect = row.getBoundingClientRect();
    const timeRect = time.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const locationRect = location.getBoundingClientRect();
    const descriptionRect = description.getBoundingClientRect();

    // The meta row: time left, chip flush right, the two overlapping vertically i.e. on one line.
    await expect(timeRect.left).toBeCloseTo(rowRect.left, 0);
    await expect(locationRect.right).toBeCloseTo(rowRect.right, 0);
    await expect(locationRect.left).toBeGreaterThan(timeRect.right);
    await expect(timeRect.top).toBeLessThan(locationRect.bottom);
    await expect(locationRect.top).toBeLessThan(timeRect.bottom);

    // Then the title, full width beneath both — not in a column beside them.
    await expect(titleRect.top).toBeGreaterThanOrEqual(Math.max(timeRect.bottom, locationRect.bottom) - 0.5);
    await expect(titleRect.left).toBeCloseTo(rowRect.left, 0);
    await expect(titleRect.width).toBeCloseTo(rowRect.width, 0);

    // Then the description.
    await expect(descriptionRect.top).toBeGreaterThanOrEqual(titleRect.bottom - 0.5);
    await expect(descriptionRect.width).toBeCloseTo(rowRect.width, 0);
  }
};

/**
 * The reorder is a *placement* change, so the DOM order has to stand on its own as a reading order —
 * and on a phone it is also the visual order, which is the stronger claim this story makes.
 *
 * Both halves are asserted. The first is the source order a screen reader gets at every width:
 * `[from 2pm] → Reception → Arrivals & check in → Drop your bags…`, which reads as a calendar entry
 * (when, where, what, detail). The second sorts the same four boxes by where they are actually
 * painted — top to bottom, left to right within a line — and requires that sequence to come back
 * identical. That is what makes the narrow branch the one that needs no re-placement: it is the
 * unconditional default, and a container query cannot resolve before its container is laid out, so
 * the first paint must already be right.
 *
 * Nothing in a row is focusable, so WCAG 2.4.3 has nothing to disagree with; this is 1.3.2,
 * Meaningful Sequence.
 */
export const MobileReadingOrder: Story = {
  args: { days: [DAYS[1]] },
  decorators: [atWidth('23.4375rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-498` } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = rowFor(canvas, 'Ceremony');
    const parts = partsOf(row);

    await expect(textOf(parts)).toEqual([
      '[4pm]',
      'Tree Cathedral',
      'Ceremony',
      'An outdoor ceremony space among the trees beside the river.'
    ]);

    /*
     * Painted order. Two boxes are on the same line when they overlap vertically, in which case the
     * leftmost comes first; otherwise the higher one does.
     *
     * `toSorted` and not `sort`, and not by choice: `parts` is the source order being compared
     * against, so it must not be mutated — and oxlint's `unicorn/prefer-array-sort` is an auto-fix
     * rule, so `yarn fix` rewrites a defensive `[...parts].sort(…)` to this anyway. Same standoff
     * between the linter and the ES2017 target that `tools/helpers/stripTitleTags.ts` documents at
     * length; this runs in headless Chromium, where `toSorted` has shipped since 2023.
     */
    const painted = parts.toSorted((a, b) => {
      const first = a.getBoundingClientRect();
      const second = b.getBoundingClientRect();
      const sameLine = first.top < second.bottom && second.top < first.bottom;
      return sameLine ? first.left - second.left : first.top - second.top;
    });

    await expect(textOf(painted)).toEqual(textOf(parts));

    /*
     * The brackets are a type treatment and are kept out of the accessibility tree — real
     * `aria-hidden` spans rather than `::before` / `::after`, because generated content *is* exposed
     * by the CSSOM-AAM mapping and is announced by NVDA and JAWS. The visible text above still
     * reads `[4pm]`; what a screen reader gets is `4pm`.
     */
    const [time] = parts;
    await expect(time.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
    await expect([...time.querySelectorAll('[aria-hidden="true"]')].map((span) => span.textContent)).toEqual([
      '[',
      ']'
    ]);
  }
};

/**
 * A day with no events at all — the degenerate case the AC calls out.
 *
 * The events list is not rendered rather than rendered empty, so there is no `<ul>` for a screen
 * reader to announce as "list, 0 items" and no stray flex gap. And because the two-column branch is
 * gated on a modifier class rather than on the container query alone, the summary runs the full
 * content measure instead of hugging the design's 400px column with two thirds of the band empty.
 *
 * Paired with a populated day so the contrast is visible, and because the band rule that separates
 * them is the thing an event-less day still has to draw.
 */
export const DayWithoutEvents: Story = {
  args: {
    days: [
      DAYS[0],
      {
        _key: 'mon',
        eyebrow: 'Day 04',
        title: '<h2>Mon</h2>',
        date: '15 February 2027',
        content: [mockBlock('normal', 'Nothing planned. Stay on if you booked the extra night.')]
      }
    ]
  },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // One list of days, one list of events. The empty day contributes no list.
    await expect(canvas.getAllByRole('list')).toHaveLength(2);

    /*
     * Indexed rather than matched by name. `text-transform: uppercase` is applied to these headings,
     * and Chrome folds the transform into the accessible name while Firefox does not — so
     * `{ name: 'Mon' }` and `{ name: 'MON' }` each pass in exactly one engine.
     */
    const [, emptyDay] = canvas.getAllByRole('heading', { level: 2 });
    const dayInner = dayInnerOf(emptyDay);

    await expect(dayInner.children).toHaveLength(1);

    // Full measure, not a 400px column with dead space beside it.
    const [summary] = [...dayInner.children] as HTMLElement[];
    await expect(summary.getBoundingClientRect().width).toBeCloseTo(dayInner.getBoundingClientRect().width, 0);

    // The band still draws its rule — an event-less day is a day, not a gap.
    const band = emptyDay.closest('li') as HTMLElement;
    await expect(getComputedStyle(band).borderTopWidth).toBe('1px');
  }
};

/**
 * An event with no description, beside one that has it.
 *
 * The assertion that matters is not "the paragraph is absent" — it is that the row pays nothing for
 * the missing one. The rows are laid out on **implicit** grid rows: no `grid-template-rows` and no
 * `grid-template-areas`, so a row with three children creates two tracks and one gap rather than
 * three tracks and two. Naming the areas would have read better in the stylesheet and silently
 * added a `row-gap` under every description-less title, which is exactly the kind of 4px nobody
 * finds by eye.
 */
export const EventWithoutDescription: Story = {
  args: {
    days: [
      {
        ...DAYS[0],
        events: [
          scheduleEvent({ _key: 'bare', time: '2pm', title: 'Arrivals & check in', location: 'Reception' }),
          scheduleEvent({
            _key: 'described',
            time: '7pm',
            title: 'Arrival dinner',
            description: 'A long, relaxed dinner for everyone who made it down on Friday.',
            location: 'Lulu’s'
          })
        ]
      }
    ]
  },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const bare = rowFor(canvas, 'Arrivals & check in');
    const described = rowFor(canvas, 'Arrival dinner');

    await expect(partsOf(bare)).toHaveLength(3);
    await expect(partsOf(described)).toHaveLength(4);
    await expect(textOf(partsOf(bare))).toEqual(['[2pm]', 'Reception', 'Arrivals & check in']);

    // No phantom row: the space below the lowest painted child is the row's own bottom padding in
    // both cases. A third grid track for the missing description would add a `row-gap` here.
    await expect(tailOf(bare)).toBeCloseTo(tailOf(described), 0);
  }
};

/**
 * More events than the design ever draws in one day.
 *
 * The repeater is unbounded, and the thing that has to survive that is the **fixed-width left
 * gutter**: every row is its own grid, so a content-sized time column would give each row a
 * different gutter and the times would stagger down the page. This asserts they do not — one shared
 * left edge for every time, and one for every title.
 */
export const LongEventList: Story = {
  args: {
    days: [
      {
        ...DAYS[1],
        events: [
          ...(DAYS[1].events ?? []),
          scheduleEvent({ _key: 'long-1', time: '8pm', title: 'Speeches', location: 'Wedding Hall' }),
          scheduleEvent({
            _key: 'long-2',
            time: '9pm',
            title: 'Cake and first dance',
            description: 'Then the floor is everyone’s.',
            location: 'Wedding Hall'
          }),
          scheduleEvent({ _key: 'long-3', time: '10:30pm', title: 'Late supper', location: 'Lulu’s' }),
          scheduleEvent({ _key: 'long-4', time: 'from 11pm', title: 'Firepits reopen', location: 'Firepits' }),
          scheduleEvent({
            _key: 'long-5',
            time: 'midnight',
            title: 'Last drinks',
            description: 'The bar closes; the firepits do not.',
            location: 'Wedding Hall'
          }),
          scheduleEvent({ _key: 'long-6', time: '1am', title: 'Carriages', location: 'Reception' })
        ]
      }
    ]
  },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const titles = canvas.getAllByRole('heading', { level: 3 });

    await expect(titles).toHaveLength(9);

    const rows = titles.map((title) => title.closest('li') as HTMLElement);
    const timeLefts = new Set(rows.map((row) => Math.round(partsOf(row)[0].getBoundingClientRect().left)));
    const titleLefts = new Set(titles.map((title) => Math.round(title.getBoundingClientRect().left)));

    await expect(timeLefts.size).toBe(1);
    await expect(titleLefts.size).toBe(1);

    // And every row is laid out — a truncating rule would leave some at zero height.
    for (const row of rows) {
      await expect(row.getBoundingClientRect().height).toBeGreaterThan(0);
    }
  }
};
