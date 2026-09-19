import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { CSSProperties, ReactNode } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import Text from '@/components/Text';
import { mockBlock } from '@/tools/storybook/mockBlockContent';
import mockImage from '@/tools/storybook/mockImage';

import MediaCard from '.';
import type { MediaCardProps } from '.';

import styles from './styles.module.scss';

/**
 * `Surfaces`, not `Content` and not `Foundations`.
 *
 * The group test is "presents or discloses other content", and that is the whole of this component:
 * it takes a photograph, a name, a paragraph and a slot, and frames them. It renders CMS copy, but so
 * would any container — `Content/` is for the components that *are* the copy (`Text`, `TextBlock`,
 * `TextTitle`). And it is not a `Foundation`: it has an anatomy the design draws and three children
 * it composes, rather than one primitive it draws itself.
 *
 * **The prefix is checked.** `yarn audit:groups` hard-blocks `/commit` and `/pr` on it.
 */
const meta = {
  title: 'Surfaces/Media Card',
  component: MediaCard,
  tags: ['autodocs'],
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=16-134'
    }
  },
  decorators: [
    /*
     * A column on the page surface the design draws these on, capped at the room card's drawn
     * desktop track (386.66px, node 1:631) unless a story asks for more.
     *
     * The card is deliberately width-agnostic — it owns no grid — so every story has to supply one,
     * and the grid stories below need the whole canvas. The wrapper carries no `data-theme`: the
     * toolbar drives the page and each card's own `theme` prop drives the card, which is exactly the
     * relationship this component exists to make possible.
     */
    (Story, context) => (
      <div
        style={{
          backgroundColor: 'var(--bg-default)',
          maxWidth: (context.parameters.storyWidth as string | undefined) ?? '387px',
          padding: 'var(--spacing-lg)'
        }}
      >
        <Story />
      </div>
    )
  ]
} satisfies Meta<typeof MediaCard>;

export default meta;

type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Design-faithful mock data — the copy, captions and item counts the comp draws.
// ---------------------------------------------------------------------------

/** One Portable Text paragraph, which is the shape every description in the design is. */
const paragraph = (text: string) => [mockBlock('normal', text)];

/**
 * MAM-1907's footer idiom: short items joined with a middot **by the renderer**, so the CMS never
 * accumulates inconsistent punctuation. One node in the slot.
 */
const joined = (items: string[]): ReactNode => (
  <Text text={items.join(' · ')} textTransform="uppercase" variant="mono" />
);

/**
 * MAM-1909's footer idiom: separate inline items, gapped by the card's own `--media-card-footer-gap`.
 * Several nodes in the same slot — and no separator prop anywhere, which is the point of a slot.
 */
const inline = (items: string[]): ReactNode =>
  items.map((item) => <Text key={item} text={item} textTransform="uppercase" variant="mono" />);

const KING_ROOM: MediaCardProps = {
  caption: 'king-room.jpg',
  description: paragraph('One king bed, ensuite, furnished balcony with pool view.'),
  footer: joined(['Extra beds at a charge', 'Cot free']),
  image: mockImage({
    altText: 'A king room at the Lodge',
    height: 750,
    kind: 'photo',
    seed: 'media-card-king',
    width: 1200
  }),
  label: '2 max',
  title: '<h3>King Room</h3>'
};

const TWIN_DOUBLE: MediaCardProps = {
  caption: 'twin-double.jpg',
  description: paragraph(
    'Two double beds, ensuite, balcony with pool view. Suits a family with two kids or a group of four.'
  ),
  footer: joined(['Pool view', 'Balcony']),
  image: mockImage({ altText: 'A twin double room', height: 750, kind: 'photo', seed: 'media-card-twin', width: 1200 }),
  label: '4 max',
  title: '<h3>Twin Double</h3>'
};

/** The third room, and the one that makes the row uneven — its description runs to a third line. */
const FAMILY_ROOM: MediaCardProps = {
  caption: 'family-room.jpg',
  description: paragraph(
    'Two separate rooms with an ensuite and spa bath. A king bed in one, two singles plus a lounge in the other.'
  ),
  footer: joined(['No direct pool access or view']),
  image: mockImage({ altText: 'A family room', height: 750, kind: 'photo', seed: 'media-card-family', width: 1200 }),
  label: '2 rooms',
  title: '<h3>Family Room</h3>'
};

/**
 * The family room with its copy run on past the comp's two sentences.
 *
 * The drawn version is three lines in the drawn 387px track and two in a slightly wider one, which
 * makes "is this card taller than that one?" a function of the viewport — no use as the input to an
 * alignment test. This is unambiguously taller at every width a three-up row can produce, so the
 * assertion in `BottomAlignedFooters` cannot pass by coincidence.
 */
const FAMILY_ROOM_TALL: MediaCardProps = {
  ...FAMILY_ROOM,
  description: paragraph(
    'Two separate rooms with an ensuite and a spa bath. A king bed in one, two singles plus a lounge in the other, and a door between them that actually closes. The quietest corner of the Lodge, at the far end of the garden wing.'
  )
};

const LULUS: MediaCardProps = {
  caption: 'IMAGE · lulus-interior.jpg · ceiling murals',
  description: paragraph(
    "The onsite restaurant, full of original art, ceiling murals and antique furniture. Friday's arrival dinner and Sunday's recovery breakfast both happen here."
  ),
  footer: inline(['Lunch 12pm–3pm', 'Dinner 5pm–10pm']),
  image: mockImage({
    altText: "Lulu's dining room",
    height: 600,
    kind: 'photo',
    seed: 'media-card-lulus',
    width: 1200
  }),
  label: 'Restaurant',
  title: "<h3>Lulu's</h3>"
};

const FINS_BAR: MediaCardProps = {
  caption: 'IMAGE · fins-bar.jpg · dark, low light',
  description: paragraph(
    'A dark, moody cocktail bar just off Lulu\'s. Where the player cards\' "favourite drink" stats were researched.'
  ),
  footer: inline(['Open 12pm – late']),
  image: mockImage({ altText: "Fin's Bar", height: 600, kind: 'photo', seed: 'media-card-fins', width: 1200 }),
  label: 'Cocktails',
  theme: 'dark',
  title: "<h3>Fin's Bar</h3>"
};

/**
 * The three hooks the venue page moves, exactly as a consuming section sets them.
 *
 * Applied here to an ancestor rather than to a class on the card, which works for the same reason a
 * class on the card works: the stylesheet reads every hook as `var(--hook, var(--hook-default))` and
 * never declares the un-suffixed name itself, so there is no specificity tie to lose.
 */
const VENUE_HOOKS = {
  '--media-card-media-height': '300px',
  '--media-card-padding': '24px',
  '--media-card-title-size': '40px'
} as CSSProperties;

// ---------------------------------------------------------------------------
// Measurement helpers
// ---------------------------------------------------------------------------

/**
 * The card roots, by their own hashed module class rather than by a substring match on `class`.
 * Importing the stylesheet is what makes that exact — the story and the component resolve the same
 * module, so `styles.card` is the same generated name in dev, in a static build and under Vitest.
 */
const cardsIn = (canvasElement: HTMLElement) => [...canvasElement.querySelectorAll<HTMLElement>(`.${styles.card}`)];

const bodyOf = (card: HTMLElement) => card.querySelector<HTMLElement>(`.${styles.body}`) as HTMLElement;

const mediaOf = (card: HTMLElement) => card.querySelector<HTMLElement>(`.${styles.media}`) as HTMLElement;

const footerOf = (card: HTMLElement) => card.querySelector<HTMLElement>(`.${styles.footer}`) as HTMLElement;

const titleOf = (card: HTMLElement) => card.querySelector<HTMLElement>(`.${styles.title}`) as HTMLElement;

const labelOf = (card: HTMLElement) => card.querySelector<HTMLElement>(`.${styles.label}`) as HTMLElement;

const topOf = (element: Element) => element.getBoundingClientRect().top;
const heightOf = (element: Element) => element.getBoundingClientRect().height;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * The room card at its defaults — three of the five instances the design draws.
 *
 * No `theme`, so the card inherits the page's. That is the right default and the one a single-theme
 * grid (`/stay`) wants.
 */
export const Default: Story = {
  args: KING_ROOM,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [card] = cardsIn(canvasElement);
    const heading = canvas.getByRole('heading', { level: 3 });

    // A plain container, not a control. Neither of these cards is a link.
    await expect(card.tagName).toBe('DIV');
    await expect(canvasElement.querySelectorAll('a, button, [tabindex]')).toHaveLength(0);
    // The heading level comes from the stored markup; the stored string stays sentence case.
    await expect(heading.textContent).toBe('King Room');

    await waitFor(async () => {
      const shell = getComputedStyle(card);
      await expect(shell.borderRadius).toBe('8px');
      await expect(shell.borderTopWidth).toBe('1px');
      await expect(shell.overflow).toBe('hidden');
      await expect(shell.display).toBe('flex');
      await expect(shell.flexDirection).toBe('column');

      // The display face at an off-scale size — Archivo, 900, nowhere near `--display-md`'s 56→132.
      const title = getComputedStyle(heading);
      /*
       * **The regression test for the bug this component shipped with.**
       *
       * `.card` had no `color`, so the title inherited a *resolved* colour from an ancestor — in
       * Storybook the UA default, i.e. literally `rgb(0, 0, 0)`, and on a real page whatever
       * `components/Section` had already resolved for the section's own theme. Both are wrong the
       * moment the card carries a `theme` of its own, and the second is wrong quietly.
       *
       * Asserted on the default (un-themed) story as well as on both themed ones, because this is
       * the case where the bug is *least* visible: near-black on off-white looks fine until you
       * notice it is not the token.
       */
      await expect(title.color).toBe('rgb(19, 20, 18)'); // stone/900 — `--fg-default` on light
      const titleSize = Number.parseFloat(title.fontSize);
      await expect(title.fontWeight).toBe('900');
      await expect(title.fontFamily).toContain('Archivo');
      await expect(titleSize).toBeGreaterThanOrEqual(26);
      await expect(titleSize).toBeLessThanOrEqual(30);

      /*
       * Leading 0.95 and tracking -0.03em — drawn identically on every instance (28.5/30 and -0.9px
       * on the rooms, 38/40 and -1.2px on the venues), and neither is the display tier's own 0.84 /
       * -0.045em.
       *
       * Asserted rather than trusted because `.title` sets both as **plain declarations**, which is
       * only safe while `Text` gets no `size`: the tier's own leading and tracking live in
       * `.variant_display.size_lg` / `.size_md`, which are two classes and would outrank them.
       * Adding a `size` prop to the title is therefore a silent regression, and this is what catches
       * it.
       */
      await expect(Number.parseFloat(title.lineHeight) / titleSize).toBeCloseTo(0.95, 2);
      await expect(Number.parseFloat(title.letterSpacing) / titleSize).toBeCloseTo(-0.03, 3);

      /*
       * The band is a fixed height and the chip is inset into it — the two numbers that put every
       * body in a row at the same `y` regardless of the photograph's own ratio.
       */
      const band = mediaOf(card).getBoundingClientRect();
      await expect(band.height).toBeGreaterThanOrEqual(180);
      await expect(band.height).toBeLessThanOrEqual(244);
      await expect(band.top).toBeCloseTo(card.getBoundingClientRect().top + 1, 0);

      // Drawn 12px at desktop on both pages (nodes 1:632, 16:136), from the band's bottom-left.
      const chip = canvas.getByText('king-room.jpg').getBoundingClientRect();
      await expect(band.bottom - chip.bottom).toBeGreaterThanOrEqual(9.5);
      await expect(band.bottom - chip.bottom).toBeLessThanOrEqual(12.5);
      await expect(chip.left - band.left).toBeCloseTo(band.bottom - chip.bottom, 0);

      /*
       * **Regular, not the mono role's Medium.** The footnote inherits its weight from the footer
       * frame, so a section passing a bare `<Text variant="mono">` gets the drawn weight for free —
       * which is the whole contract of the slot, and the one part of it a call site would get wrong
       * by doing nothing. Every drawn footnote is JetBrains Mono Regular (`1:643`, `16:147`).
       */
      const footnote = getComputedStyle(canvas.getByText('Extra beds at a charge · Cot free'));
      await expect(footnote.fontWeight).toBe('400');
      await expect(footnote.fontFamily).toContain('JetBrains Mono');
      // `--body-xs` is fluid(11px, 12px), and the leading is the body's 1.5 rather than mono's 1.3.
      const footSize = Number.parseFloat(footnote.fontSize);
      await expect(footSize).toBeGreaterThanOrEqual(11);
      await expect(footSize).toBeLessThanOrEqual(12);
      await expect(Number.parseFloat(footnote.lineHeight) / footSize).toBeCloseTo(1.5, 2);
    });
  }
};

/**
 * The label is **unboxed** — bare `--fg-accent` type, not a chip.
 *
 * Worth an assertion rather than a comment: the caption a few pixels above it *is* a `Tag`, and
 * making the pair match is exactly the scope creep this card has to resist. Only what the design
 * draws a box around gets a box.
 */
export const UnboxedLabel: Story = {
  args: KING_ROOM,
  play: async ({ canvasElement }) => {
    const label = within(canvasElement).getByText('2 max');

    await waitFor(async () => {
      const style = getComputedStyle(label);
      await expect(style.borderTopWidth).toBe('0px');
      await expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      await expect(style.textTransform).toBe('uppercase');
      await expect(style.fontFamily).toContain('JetBrains Mono');
      // pine/600 — `--fg-accent` on the light theme.
      await expect(style.color).toBe('rgb(30, 70, 50)');
    });
    // Sentence case in the DOM, capitals from CSS — the accessible name is the stored string.
    await expect(label.textContent).toBe('2 max');
  }
};

/**
 * Pinned light, whatever the page is — `Lulu's`, on a dark page, with the venue hooks applied.
 *
 * The attribute lands on the card root, so the whole `[data-theme]` block re-points beneath one
 * element: the fill, the stroke, the hairline strength, the body ink and the caption chip.
 */
export const LightTheme: Story = {
  args: { ...LULUS, theme: 'light' },
  parameters: { storyWidth: '600px' },
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ backgroundColor: 'var(--bg-default)', padding: 'var(--spacing-lg)' }}>
        <div style={VENUE_HOOKS}>
          <Story />
        </div>
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const [card] = cardsIn(canvasElement);

    await expect(card.dataset.theme).toBe('light');
    await waitFor(async () => {
      const style = getComputedStyle(card);
      // stone/50 under a stone/900 stroke, on a page that is pine/600.
      await expect(style.backgroundColor).toBe('rgb(243, 241, 234)');
      await expect(style.borderTopColor).toBe('rgb(19, 20, 18)');

      /*
       * Every ink on the card, against the *card's* theme rather than the page's. The card is light
       * on a dark page, so each of these is the opposite of what it would inherit — which is the
       * whole point of the prop, and what was broken.
       */
      const canvas = within(canvasElement);
      // Title: stone/900. Read back as `rgb(0, 0, 0)` before the fix.
      await expect(getComputedStyle(canvas.getByText("Lulu's")).color).toBe('rgb(19, 20, 18)');
      // Description: stone/900, declared by `TextBlock` and therefore re-resolved where it is set.
      await expect(getComputedStyle(canvas.getByText(/The onsite restaurant/)).color).toBe('rgb(19, 20, 18)');
      // Label and footnote: pine/600, `--fg-accent` on light.
      await expect(getComputedStyle(canvas.getByText('Restaurant')).color).toBe('rgb(30, 70, 50)');
      await expect(getComputedStyle(canvas.getByText('Lunch 12pm–3pm')).color).toBe('rgb(30, 70, 50)');
      /*
       * The hairline is `--stroke-divider` (stone/300), not `--stroke-cards` (stone/900, the card's
       * own outline). The draft mixed the outline token down to 15% instead, which landed near this
       * colour by a route that stopped tracking the token.
       */
      await expect(getComputedStyle(footerOf(card)).borderTopColor).toBe('rgb(220, 217, 207)');
    });
  }
};

/**
 * Pinned dark — `Fin's Bar`, on a page that is otherwise light. This is the acceptance criterion
 * MAM-1909 is built around ("theme is per card, not per section"), and it costs one prop.
 *
 * The caption chip takes `Tag`'s `bordered` treatment here and not on the light card, because the
 * design draws that hairline only on node 16:152 — a dark chip on a dark photograph, where the fill
 * alone does not separate the two.
 */
export const DarkTheme: Story = {
  args: FINS_BAR,
  parameters: { storyWidth: '600px' },
  decorators: [
    (Story) => (
      <div style={VENUE_HOOKS}>
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [card] = cardsIn(canvasElement);

    await expect(card.dataset.theme).toBe('dark');
    await waitFor(async () => {
      await expect(getComputedStyle(card).backgroundColor).toBe('rgb(30, 70, 50)');
      /*
       * **The known bug, from the side it was visible on.** The comp draws this title off-white; the
       * draft drew it `rgb(0, 0, 0)`, because `color` inherits a resolved value and nothing on the
       * card re-resolved it after `data-theme` re-pointed `--fg-default`.
       */
      await expect(getComputedStyle(canvas.getByText("Fin's Bar")).color).toBe('rgb(243, 241, 234)');
      // The description had the same defect, from the same cause.
      await expect(getComputedStyle(canvas.getByText(/A dark, moody cocktail bar/)).color).toBe('rgb(243, 241, 234)');
      // signal/100 — `--fg-accent` on dark: the light plum tint that replaced the comp's lime there.
      await expect(getComputedStyle(canvas.getByText('Cocktails')).color).toBe('rgb(242, 207, 227)');
      await expect(getComputedStyle(canvas.getByText('Open 12pm – late')).color).toBe('rgb(242, 207, 227)');
      // pine/500 — `--stroke-divider` on dark. Moves with the theme because it is a token.
      await expect(getComputedStyle(footerOf(card)).borderTopColor).toBe('rgb(51, 101, 74)');
      // The chip takes its hairline; on the light card it does not.
      const chip = getComputedStyle(canvas.getByText('IMAGE · fins-bar.jpg · dark, low light'));
      await expect(chip.borderTopWidth).toBe('1px');
    });
  }
};

/**
 * The caption chip paints **above** the photograph, asserted with `document.elementFromPoint` rather
 * than by eye.
 *
 * A screenshot cannot tell "the chip is on top" from "the chip is the same colour as the pixels
 * behind it", and the failure mode here is total: an opaque photograph over an opaque chip looks
 * exactly like a chip that never rendered. The ordering is also fragile by default — `.media` is
 * `position: relative` with `z-index: auto`, so it is not a stacking context, and two positioned
 * siblings both at `auto` resolve by *tree order*. The chip wins only because the JSX puts it second.
 * `.caption` pins `z-index: 1` so that stops being true by accident; this is what proves it.
 */
export const CaptionOverImage: Story = {
  args: KING_ROOM,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chip = canvas.getByText('king-room.jpg');

    await waitFor(async () => {
      const box = chip.getBoundingClientRect();
      await expect(box.width).toBeGreaterThan(0);

      // Hit-test the middle of the chip: the topmost painted box there must be the chip itself.
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      await expect(chip.contains(hit)).toBe(true);

      // It really is over the image, rather than clear of it in some corner of the band.
      const image = canvasElement.querySelector('img') as HTMLElement;
      const band = image.getBoundingClientRect();
      await expect(box.top).toBeGreaterThan(band.top);
      await expect(box.bottom).toBeLessThan(band.bottom);

      // And the fill is opaque, so the label's contrast is the chip's property, not the photo's.
      await expect(getComputedStyle(chip).backgroundColor).toBe('rgb(243, 241, 234)');
    });
  }
};

/**
 * No image — an explicit acceptance criterion on MAM-1907.
 *
 * The media band is dropped entirely rather than left as a fixed height of empty surface, and the
 * caption goes with it: a chip inset into nothing is worse than no chip. The body sits flush under
 * the card's own top border.
 */
export const NoImage: Story = {
  args: { ...KING_ROOM, image: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [card] = cardsIn(canvasElement);

    await expect(canvasElement.querySelectorAll('img')).toHaveLength(0);
    await expect(canvas.queryByText('king-room.jpg')).toBeNull();
    // Still a complete card: heading, copy, rule, footnote.
    await expect(canvas.getByRole('heading', { level: 3 })).toBeTruthy();

    await waitFor(async () => {
      const heading = canvas.getByRole('heading', { level: 3 });
      const inset = Number.parseFloat(getComputedStyle(bodyOf(card)).paddingTop);
      // One body inset below the card's top border, with no band in between.
      await expect(topOf(heading) - topOf(card)).toBeLessThan(inset + 8);
    });
  }
};

/**
 * No footer — the other explicit acceptance criterion. The hairline belongs to the footer, so it goes
 * too: a rule with nothing under it is the failure mode worth asserting against.
 */
export const NoFooter: Story = {
  args: { ...KING_ROOM, footer: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText('Extra beds at a charge · Cot free')).toBeNull();
    await expect(canvasElement.querySelectorAll(`.${styles.footer}`)).toHaveLength(0);
  }
};

/**
 * `footer={[]}` — the shape a section actually produces, from `items.map(…)` over an empty array.
 *
 * `Boolean([])` is `true`, so the obvious guard draws an empty rule. `Children.toArray(footer)`
 * flattens and drops the empties, which is why this renders nothing and why it gets a story.
 */
export const EmptyFooterList: Story = {
  args: { ...KING_ROOM, footer: [] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll(`.${styles.footer}`)).toHaveLength(0);
  }
};

/** A description long enough to wrap several times, on a card with nothing to align against. */
export const LongDescription: Story = { args: FAMILY_ROOM_TALL };

/**
 * **The property most likely to break silently in a consuming section**, asserted by measurement
 * rather than by screenshot.
 *
 * Three cards with two-, two- and three-line descriptions in a stretching grid row. The footnotes
 * must share a `y`. That holds because of four things, and removing any one of them breaks it
 * invisibly on the cards that are *not* the tallest: `align-items: stretch` on the row (the grid
 * default), `height: 100%` on the card, `flex: 1 1 auto` on the body and `margin-block-start: auto`
 * on the footer.
 *
 * The third assertion is what stops this being vacuous — it proves the descriptions really are
 * unequal, so equal footer tops are alignment rather than coincidence.
 *
 * `minmax(0, 1fr)` and not `1fr`: a `1fr` track keeps a `min-width: auto` floor, so one long
 * unbreakable word in a title pushes the whole row wider than its container. Copy this idiom.
 */
export const BottomAlignedFooters: Story = {
  parameters: { storyWidth: '1240px' },
  render: () => (
    <div
      style={{
        alignItems: 'stretch',
        display: 'grid',
        gap: 'var(--spacing-xl)',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
      }}
    >
      <MediaCard {...KING_ROOM} />
      <MediaCard {...TWIN_DOUBLE} />
      <MediaCard {...FAMILY_ROOM_TALL} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cards = cardsIn(canvasElement);
    /*
     * The footer **containers**, not the text runs inside them. The container is what carries the
     * hairline and `margin-block-start: auto`, so its top edge is the thing a consuming section sees
     * misaligned — and a run with a different number of lines could share a top while its rule did
     * not.
     */
    const footers = cards.map((card) => footerOf(card));
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

    await expect(cards).toHaveLength(3);
    await waitFor(async () => {
      // 1. The row stretched every card to a common height.
      await expect(heightOf(cards[1])).toBeCloseTo(heightOf(cards[0]), 0);
      await expect(heightOf(cards[2])).toBeCloseTo(heightOf(cards[0]), 0);

      // 2. Every footer — rule and all — starts on the same line, to within half a pixel …
      await expect(topOf(footers[1])).toBeCloseTo(topOf(footers[0]), 0);
      await expect(topOf(footers[2])).toBeCloseTo(topOf(footers[0]), 0);

      // … and so does the footnote type inside it.
      await expect(topOf(footnotes[1])).toBeCloseTo(topOf(footnotes[0]), 0);
      await expect(topOf(footnotes[2])).toBeCloseTo(topOf(footnotes[0]), 0);

      // 3. Not vacuous: the third description really is a line taller than the first.
      await expect(heightOf(descriptions[2])).toBeGreaterThan(heightOf(descriptions[0]));

      // 4. And the footnote is one body inset off the card's bottom edge, not floating mid-card.
      const inset = Number.parseFloat(getComputedStyle(bodyOf(cards[0])).paddingBottom);
      const gap = cards[0].getBoundingClientRect().bottom - footnotes[0].getBoundingClientRect().bottom;
      await expect(gap).toBeGreaterThan(inset - 2);
      await expect(gap).toBeLessThan(inset + 8);
    });
  }
};

/**
 * Both drawn padding values side by side — 20px on the room card, 24px on the venue card — reached by
 * re-pointing one custom property rather than by a second variant.
 *
 * Doubles as the reference for how MAM-1909 configures the card: three hooks and nothing else.
 * Measured, so the mechanism is a test rather than a claim.
 */
export const PaddingHook: Story = {
  parameters: { storyWidth: '1240px' },
  render: () => (
    <div
      style={{
        alignItems: 'stretch',
        display: 'grid',
        gap: 'var(--spacing-xl)',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
      }}
    >
      <MediaCard {...KING_ROOM} />
      <div style={VENUE_HOOKS}>
        <MediaCard {...LULUS} />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [room, venue] = cardsIn(canvasElement);

    await waitFor(async () => {
      const roomInset = Number.parseFloat(getComputedStyle(bodyOf(room)).paddingTop);

      // The default pair is fluid(16px, 20px); the override is the venue card's flat 24px.
      await expect(roomInset).toBeGreaterThanOrEqual(16);
      await expect(roomInset).toBeLessThanOrEqual(20);
      await expect(getComputedStyle(bodyOf(venue)).paddingTop).toBe('24px');

      // The title hook moved with it, and the card next to it kept its default.
      await expect(getComputedStyle(canvas.getByText("Lulu's")).fontSize).toBe('40px');
      const roomTitle = Number.parseFloat(getComputedStyle(canvas.getByText('King Room')).fontSize);
      await expect(roomTitle).toBeLessThan(40);
    });
  }
};

/**
 * The venue pair as the design draws it (node 16:134) — one light card and one dark card in the same
 * row, which is the whole reason `theme` is a card prop rather than a section one.
 *
 * Note the footers: two gapped items on the left, one on the right, out of the same slot.
 */
/**
 * **The card's own clip cannot eat its own content** — a long name *and* a long label at 320px with a
 * 32px root, which is the combined 1.4.4 + 1.4.10 case and stricter than either asks for alone.
 *
 * ## What this replaces
 *
 * Both consuming sections shipped a workaround for this and neither could finish the job. Each put
 * `overflow-wrap: anywhere` on its own grid item — the same declaration, the same fifteen-line note,
 * each observing that the shared card arguably wanted it — and each then capped its `label` field in
 * its own schema, at eight characters on `/stay` and at ten on `/the-lodge`, because
 * `overflow-wrap` cannot reach a `flex: 0 0 auto` box that refuses to give up width. Two numbers,
 * one component's defect.
 *
 * The card now owns all three lines: `overflow-wrap: anywhere` on `.card`, `min-width: 0` on
 * `.title`, and `flex: 0 1 auto` with `min-width: 0` on `.label`. `SpecCardGridSection.Reflow320`
 * still measures the grid at 320px; this measures the part that lives here, so the coverage the
 * sections gave up has somewhere to be.
 *
 * ## The three things asserted, in order of how quietly they used to fail
 *
 * 1. **Nothing overflows the card.** `scrollWidth <= clientWidth` is the only honest test — the clip
 *    is `overflow: hidden`, so a clipped card looks *exactly* like a card whose content fitted.
 * 2. **The label is still inside the body's content box.** It used to be pushed past the right edge
 *    and cut: "Coffee house" rendered as "COFFEE HOUS" at 12 characters.
 * 3. **The title still wraps first.** The point of the old `flex: 0 0 auto` was that a long name
 *    should not squeeze a one- or two-word run, and `flex-basis: auto` keeps that — the label only
 *    shrinks once there is genuinely no room. A fix that made the label wrap on every card would
 *    have traded one drawn behaviour for another.
 */
export const LongLabelAndTitle: Story = {
  args: {
    ...KING_ROOM,
    label: 'Coffee house',
    title: '<h3>The Old Coach House Garden Suite</h3>'
  },
  parameters: { storyWidth: '320px' },
  play: async ({ canvasElement, step }) => {
    const root = document.documentElement;
    const previous = root.style.fontSize;

    const expectNothingClipped = async () => {
      await waitFor(async () => {
        const [card] = cardsIn(canvasElement);
        const body = bodyOf(card);
        const label = labelOf(card);

        // 1 — the card clips with `overflow: hidden`, so this is the only way to see it at all.
        await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
        await expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);

        // 2 — the label's right edge inside the body's content edge, which is what used to fail.
        const bodyRight = body.getBoundingClientRect().right - Number.parseFloat(getComputedStyle(body).paddingRight);
        await expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(bodyRight + 1);
      });
    };

    await step('Nothing is clipped at 320px', expectNothingClipped);

    try {
      root.style.fontSize = '32px';
      await step('Nothing is clipped at 320px with a 32px root', expectNothingClipped);
    } finally {
      root.style.fontSize = previous;
    }

    await step('The title still wraps before the label does', async () => {
      const [card] = cardsIn(canvasElement);
      // The name is four words and the label two; if the shrink order had inverted, the title would
      // be the single-line item and the label the wrapped one.
      await expect(heightOf(titleOf(card))).toBeGreaterThan(heightOf(labelOf(card)));
    });

    // Sentence case in the DOM whatever the CSS draws — the accessible name is the stored string.
    await expect(within(canvasElement).getByText('Coffee house')).toBeVisible();
  }
};

export const PerCardTheme: Story = {
  parameters: { storyWidth: '1240px' },
  render: () => (
    <div
      style={{
        ...VENUE_HOOKS,
        alignItems: 'stretch',
        display: 'grid',
        gap: 'var(--spacing-md)',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
      }}
    >
      <MediaCard {...LULUS} theme="light" />
      <MediaCard {...FINS_BAR} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [light, dark] = cardsIn(canvasElement);

    await waitFor(async () => {
      await expect(getComputedStyle(light).backgroundColor).toBe('rgb(243, 241, 234)');
      await expect(getComputedStyle(dark).backgroundColor).toBe('rgb(30, 70, 50)');

      // Two hours items on the left card, gapped rather than joined.
      const lunch = canvas.getByText('Lunch 12pm–3pm');
      const dinner = canvas.getByText('Dinner 5pm–10pm');
      await expect(topOf(lunch)).toBeCloseTo(topOf(dinner), 0);
      await expect(dinner.getBoundingClientRect().left).toBeGreaterThan(lunch.getBoundingClientRect().right);
    });
  }
};

/**
 * A linked card: the title is the one link, named for the card, and its click area is stretched
 * over the whole card — a click on the photograph lands on it too.
 */
export const Linked: Story = {
  args: { ...KING_ROOM, link: { externalLink: 'https://thelodgejamberoo.com.au/', linkType: 'external' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const links = canvas.getAllByRole('link');

    // One link, not one per piece of text.
    await expect(links).toHaveLength(1);
    await expect(links[0]).toHaveAccessibleName(/king room/i);
    await expect(links[0]).toHaveAttribute('href', 'https://thelodgejamberoo.com.au/');

    // The stretched layer covers the card: the photograph's centre hits the link.
    const card = canvasElement.querySelector('[class*="card"]') as HTMLElement;
    const media = card.querySelector('img') as HTMLElement;
    const box = media.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    await expect(hit).toBe(links[0]);

    // Keyboard focus rings the card, not just the title.
    await userEvent.tab();
    await expect(links[0]).toHaveFocus();
    await expect(getComputedStyle(card).outlineStyle).toBe('solid');
  }
};

/** A link that resolves nowhere leaves the card as it was — no link at all. */
export const LinkWithoutDestination: Story = {
  args: { ...KING_ROOM, link: { linkType: 'external' } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('link')).toBeNull();
  }
};

/**
 * `titleAs` overrides the heading level stored in the title's markup — the section decides where the
 * card sits in the page's outline, not the editor's tag choice.
 */
export const TitleAsH2: Story = {
  args: { ...LULUS, titleAs: 'h2' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { level: 2 })).toBeInTheDocument();
  }
};

export const TitleAsH3: Story = {
  args: { ...LULUS, titleAs: 'h3' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { level: 3 })).toBeInTheDocument();
  }
};

/** A span: a card title that should not be a heading at all. */
export const TitleAsSpan: Story = {
  args: { ...LULUS, titleAs: 'span' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('heading')).toBeNull();
  }
};
