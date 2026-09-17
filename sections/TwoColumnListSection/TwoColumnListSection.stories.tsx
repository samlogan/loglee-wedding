import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { AMOUNT_PLACEHOLDER } from '@/helpers/amountToken';
import type { ITwoColumnListSection } from '@/tools/sanity/schema/sections/twoColumnListSection';
import { mockBlock } from '@/tools/storybook/mockBlockContent';
import sectionFixture from '@/tools/storybook/sectionFixture';

import TwoColumnListSection from '.';

const FIGMA = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=';

/**
 * The dark two-column panel — a statement beside either a numbered list or the contribution copy.
 *
 * `parameters.design` points at the **band nodes** rather than at the two page frames the ticket
 * links, so `/review-design` compares against the thing this section renders. `1-426` is Planner's
 * dress-code band, which matches `Default`; the `richText` stories override it to Stay's `1-669`.
 */
const meta = {
  title: 'Sections/Two Column List',
  component: TwoColumnListSection,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}1-426` }
  }
} satisfies Meta<typeof TwoColumnListSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A fixed width, so the container query resolves the same way whatever the test canvas is.
 *
 * `rem` and not `px`, matching `HeaderDisplaySection.stories` and `ScheduleSection.stories`: the
 * switch is `48rem`, so a `px` wrapper makes the assertions below depend on the reader's root font
 * size — `Desktop` would quietly flip to the stacked branch at a large root and assert the wrong
 * layout while still passing its name. The design's px frame is stated at each call site.
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
 * The copy, the four items and their lengths are Planner's (node 1:426). Two deliberate departures.
 * **Case**: Figma types "DRESS CODE" and "WHAT TO BRING" in capitals, and this passes sentence case
 * so the uppercasing under test is the section's CSS rather than the mock's shift key — which is
 * also the shape the schema tells an editor to store, because short literal all-caps runs are what
 * screen readers most often spell out letter by letter. **Brackets**: every text node in that band
 * is wrapped in square brackets, including a list item that reads "[Placeholder]" — the designer
 * marking the whole band as copy-TBC rather than a type treatment, unlike `ScheduleSection`'s event
 * times where the brackets really are drawn furniture. The sentences are kept; the brackets are not.
 */
const listData = sectionFixture<ITwoColumnListSection>('twoColumnListSection') ?? {
  variant: 'list' as const,
  eyebrow: 'Dress code',
  title: '<h2>Cocktail, but comfortable</h2>',
  content: [
    mockBlock(
      'normal',
      'Grass underfoot at the ceremony, so think about heels. February is warm; evenings by the river cool down.'
    )
  ],
  asideEyebrow: 'What to bring',
  items: [
    'Swimmers — pool, hot tub, river',
    'Something warm for Saturday night',
    'Flat shoes for the Tree Cathedral',
    'A hat for Saturday afternoon'
  ]
};

/** Stay's contribution sentence (node 1:673), reassembled from the three text nodes Figma splits it across. */
const CONTRIBUTION_WITH_AMOUNT = `We’ve booked and paid for the rooms upfront so no one has to worry about logistics. If you’re able to, we’d be grateful for a contribution of ${AMOUNT_PLACEHOLDER} per room, per night. We’ll share the details with your RSVP, and if that’s tricky for any reason, just let us know.`;

/** The same sentence with the figure taken out — what `showAmount: false` publishes. */
const CONTRIBUTION_WITHOUT_AMOUNT =
  'We’ve booked and paid for the rooms upfront so no one has to worry about logistics. If you’re able to, we’d be grateful for a contribution towards your room. We’ll share the details with your RSVP, and if that’s tricky for any reason, just let us know.';

/**
 * Stay's band (node 1:669) — neither eyebrow, which is the AC's "the Stay instance has neither".
 *
 * `contribution` is joined in by the projection from `weddingSettings`, not authored on the section,
 * so the mock stands in for the singleton rather than for a section field.
 */
const richTextData: ITwoColumnListSection = {
  variant: 'richText',
  title: '<h2>The rooms are sorted.</h2>',
  contribution: {
    showAmount: true,
    amountPerNight: 120,
    copyWithAmount: [mockBlock('normal', CONTRIBUTION_WITH_AMOUNT)],
    copyWithoutAmount: [mockBlock('normal', CONTRIBUTION_WITHOUT_AMOUNT)]
  }
};

/** The inset panel — the element that carries `data-theme` and paints the dark fill. */
const panelOf = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[data-name="TwoColumnListSection"] [data-theme]') as HTMLElement;

/** The two-column flex row inside the panel. */
const rowOf = (canvasElement: HTMLElement) => panelOf(canvasElement).firstElementChild as HTMLElement;

/** The visible ordinals, in DOM order — the `aria-hidden` span at the head of each row. */
const ordinalsOf = (canvas: ReturnType<typeof within>) =>
  within(canvas.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.firstElementChild?.textContent);

/** The section at the canvas's own width — how it behaves on a real page. */
export const Default: Story = {
  args: listData,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // AC: the statement is an `<h2>`, forced rather than taken from the editor's tag selector.
    await expect(canvas.getByRole('heading', { level: 2 })).toHaveTextContent('Cocktail, but comfortable');

    // AC: the list is a repeater, and `role="list"` is on the element for WebKit's benefit — this
    // asserts the semantics it buys.
    await expect(within(canvas.getByRole('list')).getAllByRole('listitem')).toHaveLength(4);

    /*
     * AC: the dark treatment comes from the theme. The panel carries `data-theme="dark"` while the
     * section around it stays light — asserted as the *resolved* background rather than the
     * attribute, so this fails if `--bg-default` is ever hardcoded past the theme. `--pine-600` is
     * #1e4632, the drawn fill; the section is `--stone-50`, #f3f1ea.
     */
    const panel = panelOf(canvasElement);
    const section = canvasElement.querySelector('[data-name="TwoColumnListSection"]') as HTMLElement;

    await expect(panel.dataset.theme).toBe('dark');
    await expect(getComputedStyle(panel).backgroundColor).toBe('rgb(30, 70, 50)');
    await expect(getComputedStyle(section).backgroundColor).toBe('rgb(243, 241, 234)');
  }
};

/**
 * Desktop: statement and list side by side, an even split.
 *
 * 80rem is 1280px, the design's desktop frame. Pinned as a wrapper rather than left to the canvas so
 * the container query resolves the same way in the component-test runner as it does here — the
 * switch is on the panel's own inline size, and a test canvas narrower than the switch would
 * otherwise assert the stacked layout while claiming to be desktop.
 *
 * Note what this does *not* reproduce: `fluid()` interpolates on `vw`, so type and spacing are still
 * the canvas's rather than a 1280px window's. Layout is exact; the 44px statement is not.
 */
export const Desktop: Story = {
  args: listData,
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const row = rowOf(canvasElement);
    const [statement, aside] = [...row.children] as HTMLElement[];

    await expect(getComputedStyle(row).flexDirection).toBe('row');
    // Figma gives both columns `flex-[1_0_0]` (1:427, 1:434) — an even split, not a fixed column.
    await expect(aside.getBoundingClientRect().width).toBeCloseTo(statement.getBoundingClientRect().width, 0);
    // Top-aligned: both columns start at the panel's content top on the desktop frames.
    await expect(aside.getBoundingClientRect().top).toBeCloseTo(statement.getBoundingClientRect().top, 0);
  }
};

/**
 * Mobile: the columns stack — the AC in one assertion.
 *
 * 23.4375rem is 375px, the narrow anchor of the fluid scale and close to the design's 390px frame
 * (node 1:566). A width and not a viewport, deliberately: the reflow is a container query, so a
 * story that reached this branch by shrinking the window would pass just as well against the
 * viewport media query this is not, and that gets a narrow section in a wide window backwards.
 */
export const Mobile: Story = {
  args: listData,
  decorators: [atWidth('23.4375rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-566` } },
  play: async ({ canvasElement }) => {
    const row = rowOf(canvasElement);
    const [statement, aside] = [...row.children] as HTMLElement[];

    await expect(getComputedStyle(row).flexDirection).toBe('column');
    // Stacked, not merely narrow: the aside starts below the statement and shares its left edge.
    await expect(aside.getBoundingClientRect().top).toBeGreaterThan(statement.getBoundingClientRect().bottom - 1);
    await expect(aside.getBoundingClientRect().left).toBeCloseTo(statement.getBoundingClientRect().left, 0);
  }
};

/**
 * The ordinals come from the array position, not from the copy — the AC, asserted rather than
 * implied.
 *
 * The items are deliberately written with numbers *in the wrong order* inside them. A section that
 * read an authored number, or that let an editor type "01" into the field, would render 03/01/02;
 * `formatOrdinal(index)` renders 01/02/03 whatever the text says.
 *
 * Also pins the accessibility half of the decision: the ordinal is a real span carrying
 * `aria-hidden`, because the `<ol role="list">` already announces the position and a
 * `content: counter(…)` pseudo-element would say it a second time with no way to suppress it.
 */
export const Numbering: Story = {
  args: {
    ...listData,
    items: ['Third on the list', 'First on the list', 'Second on the list']
  },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(ordinalsOf(canvas)).toEqual(['01', '02', '03']);

    /*
     * The ordinal is visible and hidden from assistive tech at once: the eye reads "01", the screen
     * reader takes the position from `<ol role="list">`'s own `posinset` instead, and does not hear
     * it twice.
     *
     * Asserted on the attribute rather than with `toHaveAccessibleName`, which was the first attempt
     * and is a dead end here: `listitem` is not a name-from-content role, so an `<li>`'s accessible
     * name is empty whatever its children say, and the assertion would have failed identically with
     * the `aria-hidden` removed. The attribute is the thing that does the work.
     */
    const [first] = within(canvas.getByRole('list')).getAllByRole('listitem');
    const [ordinal, text] = [...first.children] as HTMLElement[];

    await expect(ordinal).toHaveAttribute('aria-hidden', 'true');
    await expect(ordinal).toHaveTextContent('01');
    await expect(text).toHaveTextContent('Third on the list');
    await expect(text).not.toHaveAttribute('aria-hidden');
  }
};

/**
 * Items an editor tabbed through and left blank.
 *
 * An array of plain strings keeps them, and a blank row would draw an ordinal against nothing. They
 * are filtered *before* the numbering rather than after, so the sequence stays contiguous — filtering
 * afterwards would leave a visible gap at 02 where the empty row used to be.
 */
export const BlankItemsRemoved: Story = {
  args: {
    ...listData,
    items: ['Swimmers — pool, hot tub, river', '   ', 'Flat shoes for the Tree Cathedral', '']
  },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(within(canvas.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);
    await expect(ordinalsOf(canvas)).toEqual(['01', '02']);
  }
};

/**
 * An unbounded repeater — the AC. Twelve items, so the numbering crosses from one digit to two.
 *
 * The schema sets no `max()`, so this is a real state rather than a stress test. The assertion that
 * matters is the last one: `min-width: 2ch` on the ordinal keeps every item's text on the same left
 * edge, which is what stops "10" indenting its row further than "09".
 */
export const LongList: Story = {
  args: {
    ...listData,
    items: [
      'Swimmers — pool, hot tub, river',
      'Something warm for Saturday night',
      'Flat shoes for the Tree Cathedral',
      'A hat for Saturday afternoon',
      'Sunscreen',
      'Insect repellent',
      'A book for the hammock',
      'Walking shoes for the river track',
      'A towel you do not mind losing',
      'Cash for the Sunday raffle',
      'Your own pillow, if you are particular',
      'Something to dance in'
    ]
  },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const items = within(canvas.getByRole('list')).getAllByRole('listitem');

    await expect(items).toHaveLength(12);
    await expect(ordinalsOf(canvas)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']);

    // Every item's text starts on the same left edge, across the one-to-two digit boundary.
    const textLefts = items.map((item) =>
      Math.round((item.lastElementChild as HTMLElement).getBoundingClientRect().left)
    );
    await expect(new Set(textLefts).size).toBe(1);
  }
};

/**
 * Neither eyebrow — the AC, and the shape Stay is actually drawn in.
 *
 * The eyebrow is a label for the column beneath it, so an absent one renders nothing at all rather
 * than an empty `<p>` and a flex gap.
 */
export const WithoutEyebrows: Story = {
  args: { ...listData, asideEyebrow: undefined, eyebrow: undefined },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The only paragraph left is the statement body — no stray uppercase mono lines.
    await expect(canvasElement.querySelectorAll('p')).toHaveLength(1);
    await expect(within(canvas.getByRole('list')).getAllByRole('listitem')).toHaveLength(4);
  }
};

/**
 * A list variant nobody has filled in.
 *
 * Without something to split *with*, the two-column branch is gated off entirely and the statement
 * takes the whole panel — rather than giving away half of it and leaving it empty. Same decision as
 * `HeaderDisplaySection.row_split` and `ScheduleSection.dayInner_split`.
 */
export const WithoutList: Story = {
  args: { ...listData, asideEyebrow: undefined, items: [] },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = rowOf(canvasElement);

    await expect(canvas.queryByRole('list')).not.toBeInTheDocument();
    // One column, and it is not flexed to half the row.
    await expect(row.children).toHaveLength(1);
    await expect(getComputedStyle(row.children[0]).flexGrow).toBe('0');
  }
};

/**
 * The `richText` variant with a figure named — Stay's band as drawn (node 1:669).
 *
 * This is the story that pins the `{amount}` contract end to end: `weddingSettings.contribution`
 * arrives as props, `resolveAmountCopy` picks `copyWithAmount` and substitutes the figure as a
 * marked Portable Text run, and `TextBlock` renders that mark as the chip.
 *
 * The three assertions on the chip are the ticket's constraint, not decoration. It has to be
 * **inline** so the sentence wraps around it — Figma's mobile frame has the copy continuing beside
 * it on the same line and wrapping below (node 1:742) — and a block-level treatment would break that
 * layout. And it has to be *highlighted*, which is the background: `currentColor` at 15%, which on
 * this panel is the drawn stone/50-at-15% over pine/600.
 */
export const RichTextWithAmount: Story = {
  args: richTextData,
  decorators: [atWidth('80rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-669` } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const paragraph = canvasElement.querySelector('[data-theme] p') as HTMLElement;

    // The figure is formatted and sits mid-sentence, not appended.
    await expect(paragraph).toHaveTextContent('a contribution of $120 per room, per night');
    // The placeholder never reaches the page.
    await expect(paragraph.textContent).not.toContain(AMOUNT_PLACEHOLDER);
    // No list on this variant — one section, two right-hand treatments.
    await expect(canvas.queryByRole('list')).not.toBeInTheDocument();

    const chip = [...paragraph.querySelectorAll('span')].find((span) => span.textContent === '$120') as HTMLElement;

    await expect(chip).toBeInTheDocument();
    // Inline, so the sentence wraps around it rather than breaking over it.
    await expect(getComputedStyle(chip).display).toBe('inline');
    // Highlighted: a real fill rather than the transparent default.
    await expect(getComputedStyle(chip).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  }
};

/**
 * The `richText` variant on a phone (node 1:737).
 *
 * The chip is the reason this story exists rather than being folded into `Mobile`: at this width the
 * sentence wraps, and the assertion is that it wraps *around* the chip — the chip's own box stays
 * inside the paragraph and the paragraph is taller than one line.
 */
export const RichTextMobile: Story = {
  args: richTextData,
  decorators: [atWidth('23.4375rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-737` } },
  play: async ({ canvasElement }) => {
    const paragraph = canvasElement.querySelector('[data-theme] p') as HTMLElement;
    const chip = [...paragraph.querySelectorAll('span')].find((span) => span.textContent === '$120') as HTMLElement;

    const paragraphBox = paragraph.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();

    // The copy is multi-line here, which is the condition the chip has to survive.
    await expect(paragraphBox.height).toBeGreaterThan(chipBox.height * 2);
    // The chip is a fragment of a line rather than a block: it never spans the measure, and it stays
    // inside it.
    await expect(chipBox.width).toBeLessThan(paragraphBox.width);
    await expect(chipBox.right).toBeLessThanOrEqual(paragraphBox.right + 0.5);
  }
};

/**
 * The toggle off — `showAmount: false`, which is the field's `initialValue` and so the default state
 * of a fresh document.
 *
 * The second copy field exists precisely so the sentence still reads with no figure in it. Nothing
 * is hidden with a span; a different sentence is published.
 */
export const RichTextWithoutAmount: Story = {
  args: {
    ...richTextData,
    contribution: { ...richTextData.contribution, showAmount: false }
  },
  decorators: [atWidth('80rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-669` } },
  play: async ({ canvasElement }) => {
    const paragraph = canvasElement.querySelector('[data-theme] p') as HTMLElement;

    await expect(paragraph).toHaveTextContent('a contribution towards your room');
    await expect(paragraph.textContent).not.toContain('$');
    await expect(paragraph.textContent).not.toContain(AMOUNT_PLACEHOLDER);
  }
};

/**
 * The toggle on but the figure left blank.
 *
 * The degenerate case the ticket asks about. Publishing `copyWithAmount` would put "…a contribution
 * of {amount} per room" on the page, so the amount-free sentence wins instead — the same answer as
 * the toggle being off, reached by a different route. `tools/helpers/amountToken.test.ts` pins the
 * neighbouring cases this cannot show: a negative figure, `NaN`, and the deliberate zero that a
 * truthiness test would get wrong.
 */
export const RichTextMissingAmount: Story = {
  args: {
    ...richTextData,
    contribution: { ...richTextData.contribution, amountPerNight: undefined, showAmount: true }
  },
  decorators: [atWidth('80rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-669` } },
  play: async ({ canvasElement }) => {
    const paragraph = canvasElement.querySelector('[data-theme] p') as HTMLElement;

    await expect(paragraph).toHaveTextContent('a contribution towards your room');
    await expect(paragraph.textContent).not.toContain(AMOUNT_PLACEHOLDER);
  }
};

/**
 * Copy that names the figure twice.
 *
 * Every occurrence is replaced, not just the first. Replacing only the first would leave a literal
 * "{amount}" on the published page the moment an editor repeats it, which is the one outcome of the
 * three that is visibly broken rather than merely unexpected.
 */
export const RichTextAmountTwice: Story = {
  args: {
    ...richTextData,
    contribution: {
      ...richTextData.contribution,
      copyWithAmount: [
        mockBlock(
          'normal',
          `It is ${AMOUNT_PLACEHOLDER} per room, per night — so two nights is ${AMOUNT_PLACEHOLDER} twice over, and we will share the details with your RSVP.`
        )
      ]
    }
  },
  decorators: [atWidth('80rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-669` } },
  play: async ({ canvasElement }) => {
    const paragraph = canvasElement.querySelector('[data-theme] p') as HTMLElement;
    const chips = [...paragraph.querySelectorAll('span')].filter((span) => span.textContent === '$120');

    await expect(chips).toHaveLength(2);
    await expect(paragraph.textContent).not.toContain(AMOUNT_PLACEHOLDER);
  }
};

/**
 * Copy that names no figure at all, with one set.
 *
 * The field is where an editor says *where* the figure goes, so copy that never places a placeholder
 * renders exactly as written. The alternative — appending the amount somewhere — puts a number in a
 * sentence nobody wrote it into.
 */
export const RichTextAmountNeverPlaced: Story = {
  args: {
    ...richTextData,
    contribution: {
      ...richTextData.contribution,
      copyWithAmount: [
        mockBlock(
          'normal',
          'We’ve booked and paid for the rooms upfront. If you’re able to, we’d be grateful for a contribution — we’ll share the details with your RSVP.'
        )
      ]
    }
  },
  decorators: [atWidth('80rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-669` } },
  play: async ({ canvasElement }) => {
    const paragraph = canvasElement.querySelector('[data-theme] p') as HTMLElement;

    await expect(paragraph).toHaveTextContent('we’d be grateful for a contribution');
    await expect(paragraph.textContent).not.toContain('$');
  }
};

/**
 * A `richText` section whose `weddingSettings` copy is blank in both fields.
 *
 * The contribution group is optional on the singleton, so this is the state of a site nobody has
 * filled that page in for yet. The panel renders its statement alone rather than a half-empty split.
 */
export const RichTextWithoutCopy: Story = {
  args: { contribution: null, title: '<h2>The rooms are sorted.</h2>', variant: 'richText' },
  decorators: [atWidth('80rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-669` } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = rowOf(canvasElement);

    await expect(canvas.getByRole('heading', { level: 2 })).toBeInTheDocument();
    await expect(row.children).toHaveLength(1);
  }
};

/**
 * The body an editor typed into and then emptied.
 *
 * Sanity does not unset the field — it keeps one `normal` block whose only child is `''` — so
 * `content` arrives with `length === 1` and every naive truthiness test reports a paragraph that is
 * not there. `hasBlockContent` is what catches it; the visible cost otherwise is a dead line and a
 * flex gap under the statement.
 */
export const EmptyBody: Story = {
  args: { ...listData, content: [mockBlock('normal', '   ')], eyebrow: undefined },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    // The statement column renders the heading alone — no paragraph at all, empty or otherwise.
    await expect(canvasElement.querySelectorAll('[data-theme] p')).toHaveLength(1);
  }
};

/**
 * One list item long enough to wrap, at the narrow end.
 *
 * Two things at once. The text must wrap *inside* its column rather than widening the panel — a flex
 * item's automatic minimum is its `min-content` width, and the inherited `overflow-wrap: break-word`
 * does not reduce `min-content`, so without `min-width: 0` a pasted unbreakable run pushes the panel
 * past the viewport (WCAG 1.4.10). And the wrapped lines must clear the ordinal rather than flowing
 * under it, which is the hanging indent the flex row gives for free.
 */
export const LongListItem: Story = {
  args: {
    ...listData,
    items: [
      'Something warm for Saturday night, because the river cools right down once the sun is behind the trees',
      'Accommodationbookingreferencenumberpleasequoteonarrival'
    ]
  },
  decorators: [atWidth('23.4375rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-566` } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [wrapping, unbreakable] = within(canvas.getByRole('list')).getAllByRole('listitem');
    const panel = panelOf(canvasElement);

    // Wrapped rather than widening: both rows stay inside the panel's content box.
    for (const item of [wrapping, unbreakable]) {
      await expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(panel.getBoundingClientRect().right + 0.5);
      await expect(item.getBoundingClientRect().height).toBeGreaterThan(0);
    }

    // Hanging indent: the text is genuinely multi-line, and its box starts to the right of the
    // ordinal's — so the second line cannot be flowing underneath it.
    const [ordinal, text] = [...wrapping.children] as HTMLElement[];
    await expect(text.getBoundingClientRect().height).toBeGreaterThan(ordinal.getBoundingClientRect().height * 1.5);
    await expect(text.getBoundingClientRect().left).toBeGreaterThan(ordinal.getBoundingClientRect().right - 0.5);
  }
};
