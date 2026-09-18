import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import formatOrdinal from '@/helpers/formatOrdinal';
import type { IFaqSection } from '@/tools/sanity/schema/sections/faqSection';
import { mockBlock } from '@/tools/storybook/mockBlockContent';
import mockButton from '@/tools/storybook/mockButton';
import mockImage from '@/tools/storybook/mockImage';
import { mockExternalLink } from '@/tools/storybook/mockLink';
import sectionFixture from '@/tools/storybook/sectionFixture';

import FaqSection from '.';

const FIGMA = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=';

const meta = {
  title: 'Sections/FAQ',
  component: FaqSection,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}16-610` }
  }
} satisfies Meta<typeof FaqSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A fixed width, because the layout switch is a **container** query on the section's own content box
 * — see the head of `styles.module.scss`. A story that reached the stacked branch by shrinking the
 * window would prove nothing a component test can reproduce, and would get a narrow section in a
 * wide window backwards.
 *
 * `px` and not `rem`, matching the switch itself. The three sibling sections use `rem` wrappers
 * against `rem` switches; this one hides content across its switch, so the threshold is in `px` for
 * WCAG 1.4.4 and the wrapper has to speak the same unit or the stories stop testing the real one.
 */
const atWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ width }}>
      <Story />
    </div>
  );

/**
 * The `/faq` comp as a design-faithful mock — the copy, the six questions and their order are node
 * 16:610's.
 *
 * Two deliberate departures from what Figma types. **Case**: the eyebrows, the address and the two
 * chips are drawn in capitals and passed here in sentence case, so the uppercasing under test is the
 * section's CSS rather than the mock's shift key — which is also the shape the schema tells an editor
 * to store, because a short literal all-caps run is what screen readers most often spell out letter
 * by letter. **Brackets are kept**, unlike `TwoColumnListSection`'s mock: the square brackets in the
 * first answer and in the shuttle chip are the content blocker this ticket flags — the travel copy is
 * unwritten and the shuttle is TBC — so leaving them visible is the point rather than a typo.
 */
const MOCK: IFaqSection = {
  tagline: 'Help menu',
  title: '<h2>FAQ</h2>',
  content: [
    mockBlock(
      'normal',
      "Everything we've been asked so far. Missing something? Message either of us — or ask at Fin's, someone will know."
    )
  ],
  addMap: true,
  map: {
    image: mockImage({ seed: 'faq-map', width: 880, height: 520 }),
    badge: 'MAP · Sydney → Jamberoo, 90 min',
    address: '406 Jamberoo Mountain Rd',
    link: mockButton('Open in maps', mockExternalLink('https://maps.google.com/?q=406+Jamberoo+Mountain+Rd'))
  },
  addButton: true,
  buttonEyebrow: 'Still stuck?',
  button: mockButton('Ask us on your RSVP'),
  faqItems: [
    {
      question: 'How do we get there?',
      answer: [
        mockBlock(
          'normal',
          'The Lodge is at 406 Jamberoo Mountain Rd, about 90 minutes south of Sydney via the M1 and Jamberoo Mountain Road. [Placeholder: train to Kiama + 15 min taxi is the car-free option; we are looking at a shuttle for Friday afternoon.]'
        )
      ],
      note: 'Shuttle · [Fri 2pm Central] · TBC'
    },
    {
      question: 'Is there parking?',
      answer: [mockBlock('normal', 'Yes — there is room for everyone on site, and you can leave a car overnight.')]
    },
    {
      question: 'What if it rains?',
      answer: [mockBlock('normal', 'The barn covers the ceremony and the dinner, so the day runs either way.')]
    },
    {
      question: 'Gifts?',
      answer: [mockBlock('normal', 'Your being there is the gift. If you would like to do something, see Stay.')]
    },
    {
      question: 'Can I bring a plus-one?',
      answer: [mockBlock('normal', 'Your invitation names everyone we have room for — do check it before you ask.')]
    },
    {
      question: 'What should I wear?',
      answer: [mockBlock('normal', 'Cocktail, but comfortable. Grass underfoot at the ceremony, so think about heels.')]
    }
  ]
};

/**
 * Real section data from the Sanity dataset, with the mock filling the gaps.
 *
 * The published FAQ predates this ticket, so its projection carries no `tagline`, no `map`, no
 * `buttonEyebrow` and no per-item `note` — and a GROQ projection returns a *shaped object with null
 * leaves*, so those keys can be present-and-null rather than absent. Either way `??` on each of them
 * is what keeps the story exercising the four things this ticket added; spreading the fixture over
 * the mock alone would let a null overwrite them.
 *
 * `faqItems` is taken whole from whichever source wins, because the per-item `note` cannot be merged
 * across two lists of different lengths without inventing a pairing.
 */
const fixture = sectionFixture<IFaqSection>('faqSection');

const data: IFaqSection = {
  ...MOCK,
  ...fixture,
  tagline: fixture?.tagline ?? MOCK.tagline,
  addMap: fixture?.addMap ?? MOCK.addMap,
  map: fixture?.map ?? MOCK.map,
  buttonEyebrow: fixture?.buttonEyebrow ?? MOCK.buttonEyebrow,
  faqItems: fixture?.faqItems?.length ? fixture.faqItems : MOCK.faqItems
};

/*
 * ## Every text query below uses the **stored** string, not the rendered one
 *
 * The eyebrows, the address and the two chips are stored in sentence case and capitalised by
 * `text-transform`, which does not change `textContent` — so `getByText('HELP MENU')` finds nothing
 * while the page plainly shows it. That asymmetry is the point rather than an inconvenience: it is
 * the same reason the schema tells editors to store sentence case, because Chromium names an element
 * from its rendered text and a screen reader spells a stored all-caps run out letter by letter.
 */

/** Every accordion trigger, in document order. The footer's button is an `<a>`, so it is not here. */
const triggers = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLButtonElement>('button[aria-expanded]')
];

export const Default: Story = {
  args: data,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rows = triggers(canvasElement);

    await expect(rows.length).toBe(data.faqItems.length);

    /*
     * AC: the tagline renders. It is the field this section has always had and never read — the
     * component destructured five props and `tagline` was not one of them.
     */
    await expect(canvas.getByText(data.tagline as string, { selector: 'p' })).toBeVisible();

    /*
     * AC: items are numbered from array position. Asserted against `formatOrdinal(index)` with the
     * raw index — passing `index + 1` is the documented trap that silently starts the list at 02, so
     * the test states the contract rather than a literal list of strings.
     */
    for (const [index, row] of rows.entries()) {
      await expect(row).toHaveTextContent(formatOrdinal(index));
    }

    /*
     * AC: `aria-expanded` and `aria-controls` survive. Every trigger points at a panel that exists,
     * and starts collapsed.
     */
    for (const row of rows) {
      await expect(row).toHaveAttribute('aria-expanded', 'false');
      const panelId = row.getAttribute('aria-controls');
      await expect(panelId).toBeTruthy();
      /*
       * An attribute selector rather than `getElementById`, and not only because the linter prefers
       * it: `useId()` produces ids containing `«»`, which are not valid in a bare `#id` selector and
       * would need `CSS.escape`. Quoting the value sidesteps the escaping entirely.
       */
      await expect(canvasElement.querySelector(`[id="${panelId}"]`)).toBeTruthy();
    }

    /*
     * AC: the accordion stays single-open. Opening the second item closes the first — the behaviour
     * `components/Accordion` owns, asserted here because this ticket rebuilt what is *inside* the
     * trigger and a restructure would have broken it silently.
     */
    await userEvent.click(rows[0]);
    await expect(rows[0]).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(rows[1]);
    await expect(rows[1]).toHaveAttribute('aria-expanded', 'true');
    await expect(rows[0]).toHaveAttribute('aria-expanded', 'false');

    // …and clicking the open one closes it, leaving nothing open.
    await userEvent.click(rows[1]);
    await expect(rows.every((row) => row.getAttribute('aria-expanded') === 'false')).toBe(true);

    /*
     * AC: the toggle glyph is a plus that becomes a minus. Read off the trigger's text rather than a
     * class, because the glyph is what a reader sees. U+2212, not a hyphen.
     */
    await expect(rows[0].textContent).toContain('+');
    await userEvent.click(rows[0]);
    await expect(rows[0].textContent).toContain('−');
    await userEvent.click(rows[0]);

    /*
     * The trigger's accessible name is the question, not "Open accordion item". `AccordionItem` used
     * to force that string onto every trigger with `aria-label`, which overrides content outright —
     * six identically named buttons in a screen reader's element list.
     */
    await expect(rows[0]).toHaveAccessibleName(data.faqItems[0].question);
  }
};

/**
 * The map card's overlays paint above the media — the one thing in this section that cannot be
 * checked by eye.
 *
 * `components/Image` wraps its `<img>` in a `position: relative` container, so the media and the two
 * overlays are all positioned elements painting in tree order. That happens to be correct and is a
 * property of the JSX order rather than of the stylesheet, so `styles.module.scss` states a
 * `z-index` and this asserts the result with `elementFromPoint`: whatever is on top at the badge's
 * own centre must be the badge.
 */
export const MapOverlays: Story = {
  args: data,
  decorators: [atWidth('1200px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText(MOCK.map?.badge as string);
    const address = canvas.getByText(MOCK.map?.address as string);

    for (const overlay of [badge, address]) {
      const box = overlay.getBoundingClientRect();
      await expect(box.width).toBeGreaterThan(0);
      const hit = canvasElement.ownerDocument.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      await expect(overlay.contains(hit) || hit === overlay || overlay === hit?.closest('*')).toBe(true);
    }
  }
};

/**
 * Desktop: the rail beside the accordion, at the design's own 1200px content box (node 16:610 is a
 * 1280px frame with 40px gutters).
 */
export const Desktop: Story = {
  args: data,
  decorators: [atWidth('1200px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvasElement.querySelector('[data-name="FaqSection"] > div > div') as HTMLElement;

    await expect(getComputedStyle(row).flexDirection).toBe('row');

    // AC: the eyebrow is paired with the button here, and dropped when the columns stack.
    await expect(canvas.getByText(data.buttonEyebrow as string)).toBeVisible();

    // A shrink-to-fit pill rather than a full-width bar (node 16:717).
    const link = canvas.getByRole('link', { name: data.button?.label });
    await expect(link.getBoundingClientRect().width).toBeLessThan(row.getBoundingClientRect().width / 2);
  }
};

/**
 * Mobile: header → map → accordion → button, stacked.
 *
 * 390px is the design's mobile frame (node 16:719). The assertion below is **DOM order**, not
 * geometry, because that is what the AC asks for: `order` and `grid-row` would satisfy a visual
 * check and still leave the tab order and the screen-reader order in the desktop sequence.
 */
export const Mobile: Story = {
  args: data,
  decorators: [atWidth('390px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvasElement.querySelector('[data-name="FaqSection"] > div > div') as HTMLElement;

    await expect(getComputedStyle(row).flexDirection).toBe('column');

    /*
     * Reading order, asserted with `compareDocumentPosition` — the tree order a screen reader and the
     * tab sequence both follow. `DOCUMENT_POSITION_FOLLOWING` (4) means the argument comes *after*
     * the node it is compared against.
     */
    const title = canvas.getByRole('heading', { level: 2 });
    const map = canvas.getByText(MOCK.map?.badge as string);
    const firstQuestion = triggers(canvasElement)[0];
    const button = canvas.getByRole('link', { name: data.button?.label });

    for (const [before, after] of [
      [title, map],
      [map, firstQuestion],
      [firstQuestion, button]
    ]) {
      // eslint-disable-next-line no-bitwise -- DOCUMENT_POSITION_* is a bit mask by specification
      await expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    // AC: the eyebrow is dropped, and the button spans the column (node 16:797).
    await expect(canvas.getByText(data.buttonEyebrow as string)).not.toBeVisible();
    await expect(button.getBoundingClientRect().width).toBeCloseTo(row.getBoundingClientRect().width, 0);
  }
};

/**
 * The comp's own content, verbatim — the story `/review-design` compares against.
 *
 * `Default` prefers the dataset, which today holds lorem-ipsum questions and no `note`, so nothing
 * else in this file renders the chip beneath an answer. This does, and it is also where the **content
 * blocker this ticket flags is visible**: the first answer's travel copy is bracketed placeholder
 * text and the shuttle chip reads "TBC". Both are left exactly as the designer typed them rather than
 * invented around — a reviewer should see the gap, not a plausible sentence covering it.
 */
export const DesignReference: Story = {
  args: MOCK,
  decorators: [atWidth('1200px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rows = triggers(canvasElement);

    // Six questions in the comp's order, numbered 01..06.
    await expect(rows).toHaveLength(6);
    await expect(rows[5]).toHaveTextContent(formatOrdinal(5));

    /*
     * The note chip is inside the answer, so it is only *visible* once that answer is open — and
     * "open" is a `max-height` transition under `overflow: hidden`, so the element exists and has
     * zero height for the first few frames after the click. `waitFor` rather than a bare assertion,
     * which is what this caught: the chip was in the DOM 19ms after the click and measured 0×0.
     */
    await userEvent.click(rows[0]);
    await waitFor(async () => {
      await expect(canvas.getByText(MOCK.faqItems[0].note as string)).toBeVisible();
    });
  }
};

/** No map card — the rail is the header and the intro copy alone. */
export const WithoutMap: Story = {
  args: { ...data, addMap: false },
  decorators: [atWidth('1200px')]
};

/** No header and no closing button: the accordion carries the section on its own. */
export const WithoutHeader: Story = {
  args: { ...data, tagline: undefined, title: undefined, addButton: false },
  decorators: [atWidth('1200px')]
};
