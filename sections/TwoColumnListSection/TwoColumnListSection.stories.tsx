import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import hasBlockContent from '@/helpers/hasBlockContent';
import stripTitleTags from '@/helpers/stripTitleTags';
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
 * Planner's dress-code band as a design-faithful mock — what `listData` below resolves to whenever
 * the fixture is not a `list` instance. Today that is always, though not because the dataset is
 * empty: both variants are published (`/weekend`'s dress code is the `list`, `/stay`'s rooms band the
 * `richText`), and the generator kept the richer `richText` one — the exact case the variant gate
 * below exists for.
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
const LIST_MOCK: ITwoColumnListSection = {
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

/*
 * **Variant-gated**, and this is the first section in the repo that needs to be.
 *
 * `sectionFixture` is keyed by `_type` alone, and `generate-fixtures.ts` keeps the *richest*
 * instance of each type (`sections.filter(…).toSorted((a, b) => size(b) - size(a))[0]`). This
 * section is the first whose one `_type` has two mutually exclusive shapes — and the `richText`
 * instance carries two joined `blockContent` arrays where the `list` one carries four short strings,
 * so it will almost certainly serialise larger. A bare `sectionFixture(…) ?? LIST_MOCK` would
 * therefore hand `listData` a `richText` fixture the moment both bands are published: `hasList`
 * false, no `<ol>`, and `canvas.getByRole('list')` throwing in eight play functions. Overriding
 * `items` in those stories would not save them, because `variant` would still say `richText`.
 *
 * Checking the variant makes the fallback correct in every combination — a `list` fixture is used, a
 * `richText` fixture is declined, and a missing one falls through to the mock as before.
 *
 * The cost is the generator's, not this file's: one fixture per `_type` means only one of the two
 * bands can ever be fixture-backed. If a second variant-bearing section lands, that is the trigger
 * to key fixtures by shape rather than by type.
 */
const fixture = sectionFixture<ITwoColumnListSection>('twoColumnListSection');
const listData: ITwoColumnListSection = fixture?.variant === 'list' ? fixture : LIST_MOCK;

/** Stay's accommodation sentence (node 1:673), without a figure — each guest's price is on their RSVP. */
const CONTRIBUTION_COPY =
  'We’ve booked and paid for the rooms upfront so no one has to worry about logistics. If you’re able to, we’d be grateful for a contribution towards your room. We’ll share the details with your RSVP, and if that’s tricky for any reason, just let us know.';

/**
 * Stay's band (node 1:669) — neither eyebrow, which is the AC's "the Stay instance has neither".
 *
 * `contribution` is joined in by the projection from `weddingSettings`, not authored on the section,
 * so the mock stands in for the singleton rather than for a section field.
 *
 * Mock and **not** fixture-backed, unlike `listData` above: the stories below assert on the words,
 * and against the couple's live copy they would be asserting whatever sentence is published this week.
 */
const richTextData: ITwoColumnListSection = {
  variant: 'richText',
  title: '<h2>The rooms are sorted.</h2>',
  contribution: { copy: [mockBlock('normal', CONTRIBUTION_COPY)] }
};

/** The section element itself — the full-bleed band, which carries the band's theme and paints it. */
const sectionOf = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('[data-name="TwoColumnListSection"]') as HTMLElement;

/** The band's content box inside the page container — the container-query host. */
const panelOf = (canvasElement: HTMLElement) =>
  sectionOf(canvasElement).querySelector('[class*="panel"]') as HTMLElement;

/** The drawn pair, as `getComputedStyle` resolves them. */
const PINE_600 = 'rgb(30, 70, 50)';
const STONE_50 = 'rgb(243, 241, 234)';

/**
 * The band is the *inverse* of the theme chosen for the section, painted edge to edge.
 *
 * Derived from the chosen theme rather than pinned to `dark`: `tools/storybook/sectionStory` feeds the
 * toolbar's theme into `sectionFields` for every `Sections/*` story, so a hardcoded `'dark'` would go
 * red the moment a reader flipped the toolbar. The two drawn fills are still pinned, so a hardcoded
 * colour past the theme fails it. The panel inside paints nothing of its own — the fill is the band's.
 */
const expectInvertedBand = async (canvasElement: HTMLElement, chosenTheme: unknown) => {
  const section = sectionOf(canvasElement);
  const onDarkPage = chosenTheme === 'dark';

  await expect(section.dataset.theme).toBe(onDarkPage ? 'light' : 'dark');
  await expect(getComputedStyle(section).backgroundColor).toBe(onDarkPage ? STONE_50 : PINE_600);
  await expect(getComputedStyle(panelOf(canvasElement)).backgroundColor).toBe('rgba(0, 0, 0, 0)');
};

/** The two-column flex row inside the panel. */
const rowOf = (canvasElement: HTMLElement) => panelOf(canvasElement).firstElementChild as HTMLElement;

/** The visible ordinals, in DOM order — the `aria-hidden` span at the head of each row. */
const ordinalsOf = (canvas: ReturnType<typeof within>) =>
  within(canvas.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.firstElementChild?.textContent);

/**
 * The section at the canvas's own width — how it behaves on a real page.
 *
 * Every assertion here is derived from `listData` rather than written out, because `listData` is
 * fixture-backed and the fixtures self-heal: `story-fixture-checker` regenerates and stages them
 * during `/commit`, so a literal `'Cocktail, but comfortable'` would go red the first time this band
 * is published with different copy — a red test reporting nothing but that an editor wrote a
 * sentence. What this story is *for* is the structure around the copy: an `<h2>`, a real list with
 * one item per filled row, the theme inversion, and the two mutes. Those hold whatever the words
 * are, and they are what breaks if the section does.
 */
export const Default: Story = {
  args: listData,
  play: async ({ canvasElement, globals }) => {
    const canvas = within(canvasElement);

    // AC: the statement is an `<h2>`, forced rather than taken from the editor's tag selector.
    await expect(canvas.getByRole('heading', { level: 2 })).toHaveTextContent(
      stripTitleTags(listData.title).text.trim()
    );

    // AC: the list is a repeater, and `role="list"` is on the element for WebKit's benefit — this
    // asserts the semantics it buys. Counted off the filtered array, which is what the section
    // renders from.
    await expect(within(canvas.getByRole('list')).getAllByRole('listitem')).toHaveLength(
      (listData.items ?? []).filter((item) => Boolean(item?.trim())).length
    );

    /*
     * AC: the dark treatment comes from the theme rather than from hardcoded values. On the light
     * page this story renders by default that is a `--pine-600` (#1e4632) band; `OnDarkPage` below asserts the same helper with the pair the other way round.
     */
    await expectInvertedBand(canvasElement, globals.theme ?? 'light');

    /*
     * The two micro-labels are drawn *quieter than the copy beside them*, and this pins that
     * ordering rather than the two literal colours.
     *
     * Figma says it with `opacity` on a wrapper frame rather than with a fill — `opacity-80` on all
     * four eyebrow containers, `opacity-70` on all seven ordinal containers — which is exactly the
     * kind of thing that is invisible if you read only the text node, and this section shipped both
     * at full strength because of it. Asserted as the resolved alpha so the intent survives a
     * re-point of `--fg-default`: statement at full ink, eyebrow below it, ordinal below that.
     */
    const alphaOf = (element: Element) => {
      /*
       * The fourth number, whichever form the engine serialises the mix as — `color(srgb r g b / a)`
       * and `rgba(r, g, b, a)` both yield four, and an opaque `rgb(r, g, b)` yields three. Matching
       * on the slash alone would silently read 1 for the `rgba()` form and pass this assertion with
       * the mute deleted.
       */
      const parts = getComputedStyle(element).color.match(/[\d.]+/g) ?? [];

      return parts.length === 4 ? Number(parts[3]) : 1;
    };

    const statementAlpha = alphaOf(canvas.getByRole('heading', { level: 2 }));
    const eyebrowAlpha = alphaOf(canvasElement.querySelectorAll('p')[0]);
    const ordinalAlpha = alphaOf(within(canvas.getByRole('list')).getAllByRole('listitem')[0].children[0]);

    await expect(statementAlpha).toBe(1);
    await expect(eyebrowAlpha).toBeCloseTo(0.8, 2);
    await expect(ordinalAlpha).toBeCloseTo(0.7, 2);
  }
};

/**
 * The section set to dark, so the band flips to light — the inversion, pinned.
 *
 * A story-level `globals.theme` rather than `args.sectionFields`, and the difference matters: this
 * is the *same* path the toolbar drives, so it exercises `tools/storybook/sectionStory`'s injection
 * rather than stepping around it — and `ITwoColumnListSection` does not declare `sectionFields`, so
 * passing one through `args` would not type. It exists because the Studio's Light/Dark radio is a
 * real control an editor can reach, and until the projection started returning `themeOptions` nobody
 * had noticed it did nothing — an inversion only a human flipping a toolbar ever exercises is an
 * inversion that will break unnoticed.
 *
 * The same `expectInvertedBand` as `Default`, which is the point: one assertion, both directions.
 */
export const OnDarkPage: Story = {
  args: listData,
  decorators: [atWidth('80rem')],
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    await expectInvertedBand(canvasElement, 'dark');
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

    /*
     * The only paragraph left is the statement body — no stray uppercase mono lines. Derived from
     * the data rather than pinned at 1, because `listData` is fixture-backed and a published band
     * with no body copy would legitimately leave none.
     */
    await expect(canvasElement.querySelectorAll('p')).toHaveLength(hasBlockContent(listData.content) ? 1 : 0);
    // …and no label heading either, which is the other element an eyebrow can be.
    await expect(canvas.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
    await expect(within(canvas.getByRole('list')).getAllByRole('listitem')).toHaveLength(
      (listData.items ?? []).filter((item) => Boolean(item?.trim())).length
    );
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
 * A list an editor has left duplicate rows in.
 *
 * `items` carries `Rule.unique()`, but a Sanity validation rule is **publish-time** and Presentation
 * renders drafts — so this state is reachable in exactly the environment an editor is looking at.
 * With `key={item}` it handed React two identical keys: a console error and undefined
 * reconciliation. The keys are now disambiguated by occurrence, which leaves the unique case
 * unchanged and makes this one merely repetitive.
 *
 * Asserted through the numbering, because that is what a dropped or merged row shows up as: four
 * rows in, four ordinals out, contiguous.
 */
export const DuplicateItems: Story = {
  args: {
    ...listData,
    items: [
      'Swimmers — pool, hot tub, river',
      'A hat for Saturday afternoon',
      'Swimmers — pool, hot tub, river',
      'A hat for Saturday afternoon'
    ]
  },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const items = within(canvas.getByRole('list')).getAllByRole('listitem');

    await expect(items).toHaveLength(4);
    await expect(ordinalsOf(canvas)).toEqual(['01', '02', '03', '04']);
    // Both copies of each line are rendered, in the order they were authored.
    await expect(items[0]).toHaveTextContent('Swimmers — pool, hot tub, river');
    await expect(items[2]).toHaveTextContent('Swimmers — pool, hot tub, river');
  }
};

/**
 * A section whose statement is empty but whose aside is not — the mirror of `WithoutList`.
 *
 * Both columns are optional here, which is what makes this section different from
 * `HeaderDisplaySection` and `ScheduleSection`, where only the aside can be absent. The split
 * modifier is therefore gated on *both*, not on the aside alone: gated on one, an empty
 * `.statement` still took `flex: 1 1 0` and gave away half the panel to nothing.
 *
 * `'<h2></h2>'` rather than `undefined`, because that is the shape the failure actually arrives in:
 * `TitleInput` stores markup, so an emptied field is a non-empty string and `title.trim()` reported
 * it as filled. This is the case `stripTitleTags(title).text.trim()` exists to catch.
 */
export const WithoutStatement: Story = {
  args: { ...listData, content: undefined, eyebrow: undefined, title: '<h2></h2>' },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = rowOf(canvasElement);

    // No heading, and no empty column standing in for one.
    await expect(canvas.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    await expect(row.children).toHaveLength(1);
    await expect(getComputedStyle(row.children[0]).flexGrow).toBe('0');
    // The aside is what survived.
    await expect(within(canvas.getByRole('list')).getAllByRole('listitem').length).toBeGreaterThan(0);
  }
};

/**
 * The `richText` variant *with* a right-column eyebrow.
 *
 * The schema offers `asideEyebrow` on both variants — "Optional, and shown on both variants" — and
 * nothing covered it on this one, so the eyebrow-over-a-paragraph pairing was advertised and
 * untested. Stay draws neither eyebrow, but the control exists, and a section built from the schema
 * rather than from the comp can reach this.
 *
 * It is also the case where the eyebrow's element matters most: over a list the `<h3>` labels four
 * items, and over a paragraph it labels prose that has no list role to lean on.
 */
export const RichTextWithAsideEyebrow: Story = {
  args: { ...richTextData, asideEyebrow: 'The rooms' },
  decorators: [atWidth('80rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-669` } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label = canvas.getByRole('heading', { level: 3 });
    const paragraph = canvasElement.querySelector('[data-theme] p') as HTMLElement;

    // The label is a heading, so it reaches the accessibility tree and heading navigation — and it
    // sits under the statement's h2 rather than beside it.
    await expect(label).toHaveTextContent('The rooms');
    await expect(canvas.getByRole('heading', { level: 2 })).toBeInTheDocument();
    /*
     * Visually it is still the mono micro-label rather than heading type, which is the half of this
     * change that could have regressed. `.eyebrow` is in `@layer defaults` and the global
     * `h1…h6 { @include heading-font(); }` is in `@layer global`, which `defaults` beats — so the
     * element changed and the appearance did not. Asserted against the statement's own family so it
     * fails if either end moves, rather than against a font name the config could rename.
     */
    const statement = canvas.getByRole('heading', { level: 2 });

    await expect(getComputedStyle(label).textTransform).toBe('uppercase');
    await expect(getComputedStyle(label).fontFamily).not.toBe(getComputedStyle(statement).fontFamily);
    await expect(getComputedStyle(label).fontFamily).toContain('mono');
    // It labels the copy *beneath* it — same column, drawn above — and the copy still renders.
    await expect(label.parentElement?.contains(paragraph)).toBe(true);
    await expect(label.getBoundingClientRect().bottom).toBeLessThanOrEqual(paragraph.getBoundingClientRect().top);
    await expect(paragraph).toHaveTextContent('a contribution towards your room');
  }
};

/**
 * The `richText` variant — Stay's band as drawn (node 1:669): the accommodation wording from Wedding
 * Settings → Contribution, and no list.
 */
export const RichText: Story = {
  args: richTextData,
  decorators: [atWidth('80rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-669` } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const paragraph = canvasElement.querySelector('[data-theme] p') as HTMLElement;

    await expect(paragraph).toHaveTextContent('a contribution towards your room');
    // No list on this variant — one section, two right-hand treatments.
    await expect(canvas.queryByRole('list')).not.toBeInTheDocument();
  }
};

/** The `richText` variant on a phone (node 1:737): the copy wraps inside the measure. */
export const RichTextMobile: Story = {
  args: richTextData,
  decorators: [atWidth('23.4375rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-737` } },
  play: async ({ canvasElement }) => {
    const paragraph = canvasElement.querySelector('[data-theme] p') as HTMLElement;
    const panel = panelOf(canvasElement).getBoundingClientRect();
    const box = paragraph.getBoundingClientRect();

    await expect(paragraph).toHaveTextContent('a contribution towards your room');
    await expect(box.right).toBeLessThanOrEqual(panel.right + 0.5);
  }
};

/**
 * A `richText` section whose `weddingSettings` copy is blank.
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
    const canvas = within(canvasElement);

    /*
     * The statement column renders the heading alone — no paragraph at all, empty or otherwise.
     * Zero and not one: `eyebrow` is overridden away here, and `asideEyebrow` is an `<h3>` (it
     * labels the list beneath it), so a `<p>` in this panel could only be the body under test.
     */
    await expect(canvasElement.querySelectorAll('[data-theme] p')).toHaveLength(0);
    // The section is otherwise intact, so the assertion above is about the body and not about a
    // panel that failed to render.
    await expect(canvas.getByRole('heading', { level: 2 })).toBeInTheDocument();
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
