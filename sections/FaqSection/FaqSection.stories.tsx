import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import formatOrdinal from '@/helpers/formatOrdinal';
import stripTitleTags from '@/helpers/stripTitleTags';
import type { IFaqSection } from '@/tools/sanity/schema/sections/faqSection';
import { mockBlock } from '@/tools/storybook/mockBlockContent';
import mockButton from '@/tools/storybook/mockButton';
import mockImage from '@/tools/storybook/mockImage';
import { mockExternalLink } from '@/tools/storybook/mockLink';
import sectionFixture from '@/tools/storybook/sectionFixture';

import FaqSection from '.';

import styles from './styles.module.scss';

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
 * An answer containing a link, which is the content shape that makes a collapsed panel dangerous.
 *
 * Hand-built rather than taken from `mockBlockContent`, because that helper emits `markDefs: []` and
 * a link mark needs a `markDef` to resolve against. No answer in the dataset happens to carry one
 * today, which is exactly why `AccordionItem` shipped with focusable content inside an `aria-hidden`
 * subtree and nothing caught it — `DesignReference`'s `play` asserts against it now.
 */
const ANSWER_WITH_LINK: SanityTextBlock[] = [
  {
    _key: 'faq-answer-link',
    _type: 'block',
    style: 'normal',
    markDefs: [
      {
        _key: 'travel',
        _type: 'link',
        linkType: 'external',
        externalLink: 'https://example.com/travel'
      }
    ],
    children: [
      { _key: 'a', _type: 'span', text: 'There is room for everyone on site — see the ', marks: [] },
      { _key: 'b', _type: 'span', text: 'travel notes', marks: ['travel'] },
      { _key: 'c', _type: 'span', text: ' for the approach.', marks: [] }
    ]
  }
];

/**
 * The `/faq` comp as a design-faithful mock — the copy, the six questions and their order are node
 * 16:610's.
 *
 * **Every story that reads copy, counts questions or measures geometry uses this, not the fixture**
 * — and that split is the point. `Default` proves the accordion stays single-open by opening the
 * *second* question, and `Mobile` finds the title by its `h2`; both were written against this mock
 * and both broke the first time `yarn storybook:fixtures` pulled the real FAQ, which has one question
 * and an `h1`. `PublishedContent` is the one story on the fixture, and asserts only what it can derive
 * from it.
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
    { question: 'Is there parking?', answer: ANSWER_WITH_LINK },
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
 * Real Sanity data, falling back to the mock only if the dataset loses it — the fixture exactly as
 * published, with nothing from `MOCK` merged in.
 *
 * This used to be a field-by-field merge: the fixture spread over the mock, then `??` on `tagline`,
 * `addMap`, `map`, `addButton` and `buttonEyebrow`, because a GROQ projection returns a *shaped
 * object with null leaves* and a plain spread lets a `null` overwrite the mock's value. Those guards
 * did hold — `addButton` arrived as `null` and the footer stayed on screen, though `??` would have
 * let an unticked `false` straight through — but each story then rendered a hybrid nobody had
 * published, and the merge could not reach the two fields that actually changed. `faqItems` was
 * taken whole and `title` came through the spread, so when the dataset went from four lorem-ipsum
 * questions under an `h2` to one real question under an `h1`, `Default` lost the second row its
 * single-open check clicks and `Mobile` lost the `h2` it looks for.
 *
 * The split replaces the merge. Stories about the design render `MOCK`, which sets every field;
 * `PublishedContent` renders this, nulls and all, and asserts only what it can read out of it. Today
 * that is one question with a note, an `h1` title, and `tagline`, `addMap` and `addButton` unset.
 */
const data = sectionFixture<IFaqSection>('faqSection') ?? MOCK;

/** The questions the `MOCK` stories assert against. Non-null, because `MOCK` always has six. */
const items = MOCK.faqItems ?? [];

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

/**
 * **The section rendered against whatever is in the dataset today** — the fixture exactly as
 * published, at the canvas's own width.
 *
 * Every assertion is read out of `data`: one numbered trigger per published question, each a working
 * disclosure named by its own question; the title at whichever level the editor stored; each
 * published note drawn; and the optional furniture present exactly when the data asks for it. That
 * last part is what this story adds beyond "it renders". `/faq` leaves `tagline`, `addMap` and
 * `addButton` unset, so today it walks the *absent* branch of all three guards — the half no `MOCK`
 * story reaches, because `MOCK` sets every field.
 *
 * The complement to `Default`, which pins the comp's six questions to prove the accordion stays
 * single-open. That is a claim about two items, and one published question cannot make it.
 */
export const PublishedContent: Story = {
  args: data,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rows = triggers(canvasElement);
    const published = data.faqItems ?? [];

    /*
     * Not vacuous. `data` is the fixture when there is one and `MOCK` when there is not, so there is
     * always a question to render — zero here means the dataset lost its content, which is worth
     * failing on rather than passing silently.
     */
    await expect(published.length).toBeGreaterThan(0);

    // One trigger per question: numbered from its array position, named by its own question, closed.
    await expect(rows).toHaveLength(published.length);
    for (const [index, row] of rows.entries()) {
      await expect(row).toHaveTextContent(formatOrdinal(index));
      await expect(row).toHaveAccessibleName(published[index].question);
      await expect(row).toHaveAttribute('aria-expanded', 'false');
    }

    // A working disclosure whatever the count: the first row opens, and closes again.
    await userEvent.click(rows[0]);
    await expect(rows[0]).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(rows[0]);
    await expect(rows[0]).toHaveAttribute('aria-expanded', 'false');

    /*
     * The title at the level the editor stored. Unlike `HeaderDisplaySection` and `ScheduleSection`,
     * this section passes the tag through rather than forcing one — and on `/faq` it is the only
     * section on the page, standing in for the header the sibling pages have, so the published `h1`
     * is the right level there. `Mobile`'s `h2` is the mock's choice, not the section's.
     */
    const title = stripTitleTags(data.title);
    await expect(
      canvas.getByRole('heading', { level: Number(title.as?.replace('h', '')), name: title.text })
    ).toBeVisible();

    // Each published note is drawn — inside its collapsed panel, which is `inert` but still mounted.
    for (const note of published.map((item) => item.note?.trim()).filter(Boolean)) {
      await expect(canvas.getAllByText(note as string).length).toBeGreaterThan(0);
    }

    /*
     * The optional furniture renders exactly when the data asks for it, tested with the component's
     * own three conditions. Today each is the absent branch; a `MOCK` story would only ever see the
     * present one.
     */
    await expect(Boolean(canvasElement.querySelector(`.${styles.tagline}`))).toBe(Boolean(data.tagline?.trim()));
    await expect(Boolean(canvasElement.querySelector(`.${styles.mapCard}`))).toBe(Boolean(data.addMap && data.map));
    await expect(Boolean(canvasElement.querySelector(`.${styles.footer}`))).toBe(
      Boolean(data.addButton && data.button?.label)
    );
  }
};

/**
 * The comp's six questions at the canvas's own width — on `MOCK`, because the single-open check below
 * needs a second question to open, and the published FAQ has one.
 */
export const Default: Story = {
  args: MOCK,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rows = triggers(canvasElement);

    await expect(rows.length).toBe(items.length);

    /*
     * AC: the tagline renders. It is the field this section has always had and never read — the
     * component destructured five props and `tagline` was not one of them.
     */
    await expect(canvas.getByText(MOCK.tagline as string, { selector: 'p' })).toBeVisible();

    /*
     * AC: items are numbered from array position. Asserted against `formatOrdinal(index)` with the
     * raw index — passing `index + 1` is the documented trap that silently starts the list at 02, so
     * the test states the contract rather than a literal list of strings.
     */
    for (const [index, row] of rows.entries()) {
      await expect(row).toHaveTextContent(formatOrdinal(index));
    }

    /*
     * Each trigger is wrapped in an `<h3>` — the APG accordion pattern — so a screen-reader user can
     * navigate a long FAQ by heading. The heading is *around* the button, not inside it: inside, the
     * HTML-AAM mapping flattens it to a text alternative and the role is discarded.
     */
    await expect(canvas.getAllByRole('heading', { level: 3 })).toHaveLength(items.length);
    await expect(rows[0].parentElement?.tagName).toBe('H3');

    // Never a submit button — an accordion inside a form would otherwise submit it on open.
    await expect(rows[0]).toHaveAttribute('type', 'button');

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
    await expect(rows[0]).toHaveAccessibleName(items[0].question);
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
  args: MOCK,
  decorators: [atWidth('1200px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /*
     * Read off `MOCK`, the args this story renders, so the copy it looks for is the copy it drew. It
     * cannot be `data`: `/faq` has `addMap` unset, so the published FAQ has no map card to measure.
     */
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
 * **The map bar's two mono runs, measured** — the pair of overrides that had to fight
 * `components/Button` for their own values, and had no test.
 *
 * The bar holds an address and an "open in maps" link, drawn at the same 11px in the same Bold
 * register at the same 0.1em (nodes 16:648, 16:650). Only one of them is a control, and that is
 * where all the difficulty is: `Button`'s `.mono` sets a label's tracking from the button ladder's
 * 0.08em, and `.variant_bare` sets the *quiet* Medium register — both correct for a "← BACK" and
 * both wrong here.
 *
 * `.variant_bare` used to declare the consumer's own property names, so the section's re-point tied
 * with it on specificity and the winner came down to CSS-module emission order — a value that is
 * right in Next and could flip in Storybook, or on the next bundler reshuffle, with nothing to
 * notice it by. `Button`'s mono axis now splits each hook into a consumer name it never declares and
 * a `-default` it does, which is the idiom `Tag` and `MediaCard` already use, so the two lines in
 * `.mapLink` win unconditionally.
 *
 * Asserted rather than argued, because "the right value by accident of import order" and "the right
 * value" look identical in a screenshot — and because the whole point of the change is that the
 * result no longer depends on something a test can only observe indirectly.
 */
export const MapBarTypography: Story = {
  args: MOCK,
  decorators: [atWidth('1200px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const address = canvas.getByText(MOCK.map?.address as string);
    const link = canvas.getByRole('link', { name: MOCK.map?.link?.label as string });

    await waitFor(async () => {
      for (const run of [address, link]) {
        const style = getComputedStyle(run);

        await expect(style.fontFamily).toContain('JetBrains Mono');
        // Bold on both — the address via `Text`'s `weight`, the link via `--button-mono-weight`.
        await expect(style.fontWeight).toBe('700');

        /*
         * 0.1em — the *quiet* register's tracking at the loud weight, which is what the comp draws
         * (1.1px on 11px) and neither component's default. `--body-2xs` is fluid(10px, 11px), so the
         * expected tracking is a tenth of whatever the size resolved to at this width.
         */
        const size = Number.parseFloat(style.fontSize);
        await expect(size).toBeGreaterThanOrEqual(10);
        await expect(size).toBeLessThanOrEqual(11);
        await expect(Number.parseFloat(style.letterSpacing)).toBeCloseTo(size * 0.1, 1);
      }
    });

    // The card's only accent, and the other half of the `a.mapLink` element selector: the link must
    // not resolve to the same ink as the address beside it.
    await expect(getComputedStyle(link).color).not.toBe(getComputedStyle(address).color);
  }
};

/**
 * Desktop: the rail beside the accordion, at the design's own 1200px content box (node 16:610 is a
 * 1280px frame with 40px gutters).
 */
export const Desktop: Story = {
  args: MOCK,
  decorators: [atWidth('1200px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvasElement.querySelector(`.${styles.contentContainer}`) as HTMLElement;

    await expect(getComputedStyle(row).flexDirection).toBe('row');

    // AC: the eyebrow is paired with the button here, and dropped when the columns stack.
    await expect(canvas.getByText(MOCK.buttonEyebrow as string)).toBeVisible();

    // A shrink-to-fit pill rather than a full-width bar (node 16:717).
    const link = canvas.getByRole('link', { name: MOCK.button?.label });
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
  args: MOCK,
  decorators: [atWidth('390px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /*
     * Resolved through the CSS module rather than by walking `[data-name] > div > div`. The old
     * selector encoded Section -> Container -> contentContainer, so one extra wrapper in `Section`
     * would have failed three stories on a null dereference rather than on the thing they test.
     */
    const row = canvasElement.querySelector(`.${styles.contentContainer}`) as HTMLElement;

    await expect(getComputedStyle(row).flexDirection).toBe('column');

    /*
     * Reading order, asserted with `compareDocumentPosition` — the tree order a screen reader and the
     * tab sequence both follow. `DOCUMENT_POSITION_FOLLOWING` (4) means the argument comes *after*
     * the node it is compared against.
     */
    // `h2` because `MOCK` stores one. The section passes the stored tag through, so the published
    // FAQ's `h1` is checked where the level is read from the data — `PublishedContent`.
    const title = canvas.getByRole('heading', { level: 2 });
    const map = canvas.getByText(MOCK.map?.badge as string);
    const firstQuestion = triggers(canvasElement)[0];
    const button = canvas.getByRole('link', { name: MOCK.button?.label });

    for (const [before, after] of [
      [title, map],
      [map, firstQuestion],
      [firstQuestion, button]
    ]) {
      // eslint-disable-next-line no-bitwise -- DOCUMENT_POSITION_* is a bit mask by specification
      await expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    // AC: the eyebrow is dropped, and the button spans the column (node 16:797).
    await expect(canvas.getByText(MOCK.buttonEyebrow as string)).not.toBeVisible();
    await expect(button.getBoundingClientRect().width).toBeCloseTo(row.getBoundingClientRect().width, 0);
  }
};

/**
 * The comp's own content, verbatim, at the design's 1200px — the story `/review-design` compares
 * against.
 *
 * Most stories here render `MOCK` now; this is the one that opens an answer and waits for the chip
 * beneath it to become visible. It is also where the **content blocker this ticket flags is
 * visible**: the first answer's travel copy is bracketed placeholder text and the shuttle chip reads
 * "TBC". Both are left exactly as the designer typed them rather than invented around — a reviewer
 * should see the gap, not a plausible sentence covering it.
 */
export const DesignReference: Story = {
  args: MOCK,
  decorators: [atWidth('1200px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rows = triggers(canvasElement);

    /*
     * Nothing inside a collapsed panel is reachable.
     *
     * A panel is hidden by `max-height: 0` and `overflow: hidden`, which removes it from the tab
     * order not at all — so before `inert` landed, an answer containing a link put a focusable
     * anchor at zero height inside an `aria-hidden` subtree. Asserted by trying to focus it rather
     * than by reading the attribute: the attribute is the mechanism, this is the outcome.
     *
     * On `MOCK`, because the guard is only worth anything if there is actually a link to catch —
     * `ANSWER_WITH_LINK` is in `MOCK`, and the one published answer has no `markDefs` at all, so
     * `PublishedContent` could not host it. The length assertion is what stops it quietly passing on
     * an empty list.
     */
    const collapsedLinks = [...canvasElement.querySelectorAll<HTMLAnchorElement>('[inert] a[href]')];
    await expect(collapsedLinks.length).toBeGreaterThan(0);
    for (const link of collapsedLinks) {
      link.focus();
      await expect(canvasElement.ownerDocument.activeElement).not.toBe(link);
    }

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
      await expect(canvas.getByText((MOCK.faqItems ?? [])[0].note as string)).toBeVisible();
    });
  }
};

/**
 * The dark theme, which the design does not draw and an editor can nevertheless choose.
 *
 * Worth a story of its own because of one token. Four runs in this section paint `--fg-accent` — the
 * two eyebrows, every ordinal and the outline note chip — and `--fg-accent` is `--pine-600` on light
 * but `--signal-100` on dark, the plum tint `_variables.scss` reserves for interactive states. So a dark
 * FAQ puts the interactive colour on four things that are not interactive.
 *
 * Left as it is rather than papered over, because the fix is a design decision (the `components/Tag`
 * precedent is a split token declared per `[data-theme]`, not a descendant selector) and the section
 * is drawn on light on the only page that uses it. The story exists so the question is visible and
 * so the theme at least renders and is asserted to be legible.
 */
export const OnDarkPage: Story = {
  args: MOCK,
  globals: { theme: 'dark' },
  decorators: [atWidth('1200px')],
  play: async ({ canvasElement }) => {
    const section = canvasElement.querySelector('[data-name="FaqSection"]') as HTMLElement;

    await expect(section.dataset.theme).toBe('dark');
    // The surface really did flip — pine-600 under off-white, not the light pair.
    await expect(getComputedStyle(section).backgroundColor).toBe('rgb(30, 70, 50)');

    /*
     * The map bar is the ink chip and inverts with the page, so on dark it is the *off-white* one.
     * Asserted because it is the one surface in this section that is painted from the button tokens
     * rather than from `--bg-default`, and an inversion that only half happens is invisible until
     * somebody reads the label.
     */
    const bar = canvasElement.querySelector('div[class*="mapBar"]') as HTMLElement;
    await expect(getComputedStyle(bar).backgroundColor).toBe('rgb(243, 241, 234)');
    await expect(getComputedStyle(bar).color).toBe('rgb(30, 70, 50)');
  }
};

/**
 * The live-map branch of the map card — a pinned location, drawn through `components/Map` in its
 * compact variant, and preferred over the image when both are set.
 *
 * The link is left without a destination, so it falls back to the pin in Google Maps.
 */
export const LiveMap: Story = {
  args: {
    ...MOCK,
    addMap: true,
    map: {
      ...MOCK.map,
      location: { lat: -34.6563, lng: 150.7449, zoom: 12 },
      link: mockButton('Open in maps', { linkType: 'external' })
    }
  },
  decorators: [atWidth('1200px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('region', { name: `Map of ${MOCK.map?.address}` })).toBeTruthy();
    // The image is the fallback, not a second layer under the map.
    await expect(canvasElement.querySelector('img')).toBeNull();
    await expect(canvas.getByRole('link', { name: /Open in maps/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=-34.6563,150.7449'
    );
    // The badge and the bar still paint over it.
    await expect(canvas.getByText(MOCK.map?.badge as string)).toBeVisible();
  }
};

/** No map card — the rail is the header and the intro copy alone. */
export const WithoutMap: Story = {
  args: { ...MOCK, addMap: false },
  decorators: [atWidth('1200px')]
};

/** No header and no closing button: the accordion carries the section on its own. */
export const WithoutHeader: Story = {
  args: { ...MOCK, tagline: undefined, title: undefined, addButton: false },
  decorators: [atWidth('1200px')]
};
