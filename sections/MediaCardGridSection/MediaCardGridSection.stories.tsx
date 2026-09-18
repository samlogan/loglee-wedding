import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor, within } from 'storybook/test';

import type {
  IMediaCardGridSection,
  IMediaCardGridSectionCard
} from '@/tools/sanity/schema/sections/mediaCardGridSection';
import { mockBlock } from '@/tools/storybook/mockBlockContent';
import mockImage from '@/tools/storybook/mockImage';
import mockSectionFields from '@/tools/storybook/mockSectionFields';
import sectionFixture from '@/tools/storybook/sectionFixture';

import MediaCardGridSection from '.';

import cardStyles from '@/components/MediaCard/styles.module.scss';

const FIGMA = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=';

/**
 * The feature-venue grid on `/the-lodge` — two `components/MediaCard`s side by side, one light and
 * bordered, one dark and filled.
 *
 * `parameters.design` points at **node 16:134**, the region that is only this section, rather than at
 * the page frame the ticket links. The aerial block above it and the facilities grid below it are
 * separate sections.
 *
 * ## The comp has no heading, and that is not an omission
 *
 * `tagline` / `title` / `content` are optional and blank in `Default`, because the drawn region draws
 * no heading row: the "BETWEEN EVENTS / FREE FOR ALL GUESTS" band at node `16:163` sits *below* these
 * cards and belongs to the facilities grid. A design review against `16:134` should find no heading.
 * `WithHeading` exercises the fields so they are still covered.
 */
const meta = {
  title: 'Sections/Media Card Grid',
  component: MediaCardGridSection,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}16-134` }
  }
} satisfies Meta<typeof MediaCardGridSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A fixed width, so the grid's container query resolves the same way whatever the test canvas is.
 *
 * `rem` and not `px`, matching the other section stories: the switch is `45rem`, so a `px` wrapper
 * would make every assertion below depend on the reader's root font size — `Mobile` would quietly
 * flip to the two-column branch at a small root and assert the wrong layout while still passing its
 * name. The design's px frame is stated at each call site.
 *
 * A width and not a viewport, deliberately. The reflow is a container query, so a story that reached
 * the stacked branch by shrinking the window would pass just as well against the viewport media
 * query this is not — and that gets a narrow section in a wide window backwards.
 */
const atWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ width }}>
      <Story />
    </div>
  );

const paragraph = (text: string) => [mockBlock('normal', text)];

/**
 * Lulu's and Fin's Bar verbatim from nodes `16:135` and `16:150`.
 *
 * The one deliberate departure from the comp is **case**: Figma types "LULU'S", "RESTAURANT" and
 * "LUNCH 12PM–3PM" in capitals, and these pass sentence case so the uppercasing under test is the
 * section's own CSS rather than the mock's shift key. It renders identically, and it is the shape an
 * editor should store — the schema says so, because short literal all-caps runs are what screen
 * readers most often spell out letter by letter.
 *
 * The hours keep the comp's asymmetry on purpose: two items on the left card and one on the right.
 * That pair is the evidence that settled `hours` as a repeatable list of free-text strings rather
 * than an open/close pair — "12pm – late" has no closing time to store.
 */
const LULUS: IMediaCardGridSectionCard = {
  _key: 'lulus',
  caption: 'IMAGE · lulus-interior.jpg · ceiling murals',
  content: paragraph(
    "The onsite restaurant, full of original art, ceiling murals and antique furniture. Friday's arrival dinner and Sunday's recovery breakfast both happen here."
  ),
  hours: ['Lunch 12pm–3pm', 'Dinner 5pm–10pm'],
  image: mockImage({ altText: "Lulu's dining room", height: 600, kind: 'photo', seed: 'venue-lulus', width: 1200 }),
  label: 'Restaurant',
  theme: 'light',
  title: "<h3>Lulu's</h3>"
};

const FINS_BAR: IMediaCardGridSectionCard = {
  _key: 'fins',
  caption: 'IMAGE · fins-bar.jpg · dark, low light',
  content: paragraph(
    'A dark, moody cocktail bar just off Lulu\'s. Where the player cards\' "favourite drink" stats were researched.'
  ),
  hours: ['Open 12pm – late'],
  image: mockImage({ altText: "Fin's Bar", height: 600, kind: 'photo', seed: 'venue-fins', width: 1200 }),
  label: 'Cocktails',
  theme: 'dark',
  title: "<h3>Fin's Bar</h3>"
};

/*
 * Real Sanity data when present, the comp otherwise.
 *
 * Nothing is published for this type yet, so `sectionFixture` returns `undefined` and every story
 * below runs against the mock — which is why the mock is the comp rather than lorem ipsum, and why
 * the first `/review-design` is a true comparison. Once a `mediaCardGridSection` exists in the
 * dataset, `yarn storybook:fixtures` writes the fixture and the loader swaps it in with no story
 * edit: the generator reuses the app's own `sectionsProjection`, so there is no per-section query to
 * maintain.
 *
 * `removeBottomSpacing` reproduces the page composition rather than pinning a preference. Node
 * `16:134`'s bottom edge is flush with the cards because the "BETWEEN EVENTS" heading below owns
 * that gap with 48px of its own top padding; the toggle is how an editor authors that, and the
 * section keeps a symmetric `xs` so every other placement of it composes normally. See the note at
 * `spacing` in the component.
 */
const data = sectionFixture<IMediaCardGridSection>('mediaCardGridSection') ?? {
  cards: [LULUS, FINS_BAR],
  sectionFields: mockSectionFields({ removeBottomSpacing: true })
};

// ---------------------------------------------------------------------------
// Measurement helpers
// ---------------------------------------------------------------------------

/*
 * The card roots, by the component's own hashed module class rather than by a substring match on
 * `class`. Importing the stylesheet is what makes that exact — the story and the component resolve
 * the same module, so `cardStyles.card` is the same generated name in dev, in a static build and
 * under Vitest.
 */
const cardsIn = (canvasElement: HTMLElement) => [...canvasElement.querySelectorAll<HTMLElement>(`.${cardStyles.card}`)];

const captionIn = (card: HTMLElement) => card.querySelector<HTMLElement>(`.${cardStyles.caption}`) as HTMLElement;
const footerIn = (card: HTMLElement) => card.querySelector<HTMLElement>(`.${cardStyles.footer}`);
const titleIn = (card: HTMLElement) => card.querySelector<HTMLElement>(`.${cardStyles.title}`) as HTMLElement;
const labelIn = (card: HTMLElement) => card.querySelector<HTMLElement>(`.${cardStyles.label}`) as HTMLElement;

const rect = (element: Element) => element.getBoundingClientRect();

/**
 * The resolved paints a theme is supposed to move, read off the DOM rather than off the stylesheet.
 *
 * `color` is included because it is the one that broke: it inherits a *computed* value, not the
 * `var()` that produced it, so a themed surface that does not re-declare its ink keeps the previous
 * theme's. That was `MediaCard`'s shipped bug, and a per-card theme is the only place it is
 * reachable.
 */
const paintsOf = (card: HTMLElement) => {
  const card_ = getComputedStyle(card);

  return {
    background: card_.backgroundColor,
    border: card_.borderTopColor,
    caption: getComputedStyle(captionIn(card)).color,
    footer: getComputedStyle(footerIn(card) as HTMLElement).color,
    label: getComputedStyle(labelIn(card)).color,
    title: getComputedStyle(titleIn(card)).color
  };
};

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * Node `16:134` at its drawn 1280px frame — 1240px of container, two 590px cards, 20px between them.
 *
 * The play function is the AC "theme is per card, not per section" as a measurement: the two cards
 * are in the same section, under the same `sectionFields.theme`, and every paint that the theme owns
 * differs between them.
 */
export const Default: Story = {
  args: data,
  decorators: [atWidth('1280px')],
  play: async ({ canvasElement }) => {
    const [light, dark] = cardsIn(canvasElement);

    await waitFor(async () => {
      const lightPaints = paintsOf(light);
      const darkPaints = paintsOf(dark);

      // Every paint the theme owns differs. Asserted as a set rather than against literal rgb()
      // values so a token change moves the design rather than breaking the test.
      await expect(lightPaints.background).not.toBe(darkPaints.background);
      await expect(lightPaints.border).not.toBe(darkPaints.border);
      await expect(lightPaints.title).not.toBe(darkPaints.title);
      await expect(lightPaints.label).not.toBe(darkPaints.label);
      await expect(lightPaints.footer).not.toBe(darkPaints.footer);
      await expect(lightPaints.caption).not.toBe(darkPaints.caption);

      /*
       * The regression `MediaCard` shipped was a *black* title on a dark card — what inheriting a
       * computed `color` rather than the token that produced it looks like. `.not.toBe` above only
       * says the two differ; this pins the direction, by asserting the dark card's title is not the
       * ink the surrounding light section resolved. The section's own `color` is the value a card
       * that failed to re-declare would have kept.
       */
      const sectionInk = getComputedStyle(canvasElement.querySelector('section') as HTMLElement).color;
      await expect(darkPaints.title).not.toBe(sectionInk);
      await expect(lightPaints.title).toBe(sectionInk);

      // The dark card's label and hours are both the accent, and the same accent.
      await expect(darkPaints.label).toBe(darkPaints.footer);

      // Two columns, side by side and the same height — the stretch contract.
      await expect(rect(dark).left).toBeGreaterThan(rect(light).right);
      await expect(rect(light).height).toBeCloseTo(rect(dark).height, 0);
    });
  }
};

/**
 * Node `16:282` at its drawn 390px frame, stacked.
 *
 * 390px of *viewport* is 350px of container once the gutter is taken, which is below the `45rem`
 * switch either way — the wrapper is the frame width so the numbers read against the comp.
 */
export const Mobile: Story = {
  args: data,
  decorators: [atWidth('390px')],
  play: async ({ canvasElement }) => {
    const [first, second] = cardsIn(canvasElement);

    await waitFor(async () => {
      // Stacked: the second card starts below the first, and they share a left edge.
      await expect(rect(second).top).toBeGreaterThan(rect(first).bottom - 1);
      await expect(rect(second).left).toBeCloseTo(rect(first).left, 0);

      /*
       * The venue hooks are fluid, so the mobile card is measurably smaller than the desktop one
       * rather than the same card in a narrower box. Drawn 16px of body inset at 390 against 24 at
       * 1280 — the assertion is the direction, not the pixel, because the value interpolates with the
       * viewport and a fixed number here would be a second copy of the `fluid()` formula.
       */
      const padding = Number.parseFloat(
        getComputedStyle(first.querySelector(`.${cardStyles.body}`) as HTMLElement).paddingTop
      );
      await expect(padding).toBeLessThan(24);
      await expect(padding).toBeGreaterThanOrEqual(16);
    });
  }
};

/**
 * The AC "renders a card with one hours item and a card with none", isolated.
 *
 * `Default` already covers one-versus-two. This covers one-versus-none, which is the case with a
 * structural consequence: `MediaCard` counts its footer slot with `Children.toArray`, so an empty
 * array renders **no footer and no hairline** rather than a rule with a gap under it. A bare
 * `Boolean([])` is `true` and would have drawn one.
 */
export const HoursVariants: Story = {
  args: {
    ...data,
    cards: [
      { ...FINS_BAR, _key: 'one', theme: 'light' },
      { ...LULUS, _key: 'none', hours: [] }
    ]
  },
  decorators: [atWidth('1280px')],
  play: async ({ canvasElement }) => {
    const [one, none] = cardsIn(canvasElement);

    await waitFor(async () => {
      await expect(footerIn(one)).not.toBeNull();
      // No footer element at all — so no hairline either, since the rule is the footer's own border.
      await expect(footerIn(none)).toBeNull();
    });
  }
};

/**
 * The heading fields, which the comp does not draw.
 *
 * Here so `tagline` / `title` / `content` are covered by a test rather than only by the schema, and
 * so the `titleAs` demotion is exercised: with a section heading the card names render as `h3` under
 * it, and without one they keep the level the editor chose. Both branches are live — `Default` is the
 * other one.
 */
export const WithHeading: Story = {
  args: {
    ...data,
    content: paragraph('Two places to eat and drink that are yours for the whole weekend.'),
    tagline: 'Eat and drink',
    title: '<h2>The venues</h2>'
  },
  decorators: [atWidth('1280px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      const heading = canvas.getByRole('heading', { level: 2 });
      await expect(heading).toHaveTextContent('The venues');
      // The card names sit one level under the section heading rather than at the level the field
      // chose, because the page outline is a property of the page.
      await expect(canvas.getAllByRole('heading', { level: 3 })).toHaveLength(2);
      await expect(rect(heading).bottom).toBeLessThan(rect(cardsIn(canvasElement)[0]).top);
    });
  }
};

/**
 * An unbreakable string in every field that can hold one.
 *
 * `MediaCard`'s `.title` has no `min-width: 0` and the card clips (`overflow: hidden`), so without a
 * guard a run like this overflows its box and is cut mid-word — silently, with no ellipsis, no
 * scrollbar and no page scroll. The section's `overflow-wrap: anywhere` on each grid item is the
 * guard, and it inherits, so one declaration covers the name, the description, the hours and the
 * caption. This story is what stops that declaration being deleted as unused.
 *
 * The category label is the one thing it cannot reach — `MediaCard` draws it `flex: 0 0 auto`, so it
 * refuses to shrink — which is why that field is capped in the schema instead. Both are stop-gaps
 * around a shared component this ticket must not edit; the durable fix is `min-width: 0` on the
 * card's title and `flex: 0 1 auto` on its label.
 */
export const UnbreakableContent: Story = {
  args: {
    ...data,
    cards: [
      {
        ...LULUS,
        _key: 'long',
        content: paragraph(`Booking reference ${'x'.repeat(90)} applies to every sitting.`),
        hours: ['Lunch https://the-lodge.example.com/restaurant/bookings/lunch-service'],
        title: `<h3>${'Lulus'.repeat(12)}</h3>`
      },
      FINS_BAR
    ]
  },
  decorators: [atWidth('1280px')],
  play: async ({ canvasElement }) => {
    const [long] = cardsIn(canvasElement);

    await waitFor(async () => {
      /*
       * Nothing escapes the card. Measured against the card's own box rather than the viewport,
       * because `overflow: hidden` means an escape would never reach the viewport to be measured —
       * it would just be invisibly cut off, which is the failure mode being guarded.
       *
       * One pixel of slack for the border and subpixel rounding.
       */
      const card = rect(long);
      await expect(rect(titleIn(long)).right).toBeLessThanOrEqual(card.right + 1);
      await expect(rect(footerIn(long) as HTMLElement).right).toBeLessThanOrEqual(card.right + 1);
      await expect(rect(captionIn(long)).right).toBeLessThanOrEqual(card.right + 1);

      // And the long card has not widened its own grid track past its neighbour's.
      const [, neighbour] = cardsIn(canvasElement);
      await expect(rect(long).width).toBeCloseTo(rect(neighbour).width, 0);
    });
  }
};

/**
 * Four cards, to show the repeater is unbounded rather than a drawn pair.
 *
 * The AC asks for an unbounded repeater and the schema has no `max()`; this is what makes that
 * visible — a third and fourth card wrap onto a second row rather than squeezing the first.
 */
export const FourCards: Story = {
  args: {
    ...data,
    cards: [
      LULUS,
      FINS_BAR,
      { ...LULUS, _key: 'third', label: 'Poolside', title: '<h3>The pool bar</h3>' },
      { ...FINS_BAR, _key: 'fourth', hours: [], label: 'Coffee', theme: 'light', title: '<h3>The pantry</h3>' }
    ]
  },
  decorators: [atWidth('1280px')],
  play: async ({ canvasElement }) => {
    const cards = cardsIn(canvasElement);

    await waitFor(async () => {
      await expect(cards).toHaveLength(4);
      // Two rows of two: the third card starts below the first.
      await expect(rect(cards[2]).top).toBeGreaterThan(rect(cards[0]).bottom - 1);
      await expect(rect(cards[2]).left).toBeCloseTo(rect(cards[0]).left, 0);
    });
  }
};

/**
 * A heading field an editor filled in and then emptied.
 *
 * `TitleInput` stores markup, so "blank" is the string `'<h2></h2>'` — truthy, and non-empty after
 * `trim()`. Guarding on it raw renders an empty `<h2>` into the page outline, draws the heading
 * block's margin above a grid with nothing above it, and demotes every card name to `h3` under a
 * heading that is not there. All three land on the case `/the-lodge` actually ships, which is why
 * this is a story rather than a comment.
 *
 * The tagline is the trivial half of the same test: whitespace only.
 */
export const EmptyHeadingFields: Story = {
  args: { ...data, tagline: '   ', title: '<h2></h2>' },
  decorators: [atWidth('1280px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      // No heading block at all, so no empty h2 and no margin above the grid.
      await expect(canvas.queryByRole('heading', { level: 2 })).toBeNull();
      // And the card names keep the level their own field chose rather than being demoted.
      await expect(canvas.getAllByRole('heading', { level: 3 })).toHaveLength(2);

      const section = canvasElement.querySelector('section') as HTMLElement;
      const grid = section.querySelector('ul') as HTMLElement;
      const container = section.firstElementChild as HTMLElement;
      // The grid is the container's only child — nothing was rendered above it.
      await expect(container.children).toHaveLength(1);
      await expect(grid.getBoundingClientRect().top).toBeCloseTo(container.getBoundingClientRect().top, 0);
    });
  }
};
