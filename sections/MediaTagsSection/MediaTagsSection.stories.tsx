import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { IMediaTagsSection } from '@/tools/sanity/schema/sections/mediaTagsSection';
import mockImage from '@/tools/storybook/mockImage';
import sectionFixture from '@/tools/storybook/sectionFixture';

import MediaTagsSection from '.';

const FIGMA = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=';

/**
 * The aerial site-orientation block on `/the-lodge` — one wide photograph, a caption chip in the top
 * corner and a row of place-name pills in the bottom one.
 *
 * `parameters.design` points at the **block node** (`16-257`) rather than at the page frame the
 * ticket links, so `/review-design` compares against the thing this section renders rather than
 * against a 2200px page containing four other sections. `Mobile` overrides it to `16-403`.
 */
const meta = {
  title: 'Sections/Media Tags',
  component: MediaTagsSection,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}16-257` }
  }
} satisfies Meta<typeof MediaTagsSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A fixed width, so the container query resolves the same way whatever the test canvas is.
 *
 * **`px` here, where the other section stories use `rem`**, and the difference follows the switch
 * rather than disagreeing with the house style. `HeaderDisplaySection`, `ScheduleSection` and
 * `PlayerCard` all key their switch in `rem`, so a `rem` wrapper keeps story and switch moving
 * together. This section's switch is `640px` — deliberately, because crossing it *removes* content
 * and a `rem` threshold made that happen on a text-size change alone (WCAG 1.4.4; the stylesheet
 * sets it out in full). Against a `px` switch it is a `rem` wrapper that introduces the root-size
 * dependency: at a 32px root `atMobile` would resolve to 750px and flip `Mobile` into the desktop
 * branch while still passing under its own name.
 */
const atWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ width }}>
      <Story />
    </div>
  );

/*
 * The three widths this file tests at, named once. Retyping the literal at every story made the
 * desktop width a seven-site edit where a partial one is invisible.
 *
 * Named constants rather than a decorator on `meta`: Storybook *adds* a story's decorators to the
 * meta's rather than replacing them, so the two overrides would nest inside a third wrapper.
 *
 * `atWrapping` is the subtle one, because the switch is measured on the `Container`'s **content
 * box** and `Container` takes `--container-gutter` off each side (fluid 20→40px). 768px of wrapper
 * therefore queries ~688px — clear of the 640px switch — where 736px would query ~656px and leave
 * 16px of headroom that a gutter-token change would eat. Still far below the ~1152px nine pills need
 * on one line, which is the other half of what that story has to hold true.
 */
const atDesktop = atWidth('1280px'); // comfortably above the switch
const atMobile = atWidth('375px'); // the narrow anchor every fluid() token starts from
const atWrapping = atWidth('768px'); // above the switch, below one line of nine pills

/**
 * The Lodge aerial as a design-faithful mock, which is what the loader falls back to for as long as
 * the dataset has no published instance of this section — today, always.
 *
 * Three departures from the literal Figma text, each deliberate:
 *
 * **The caption copy is the comp's own** ("IMAGE · lodge-aerial.jpg · pines + river + pool"), even
 * though it reads as a design annotation rather than as editorial copy. It is the one string the
 * frame states, and it is also the awkward case the field has to survive — mixed case with a file
 * name in it, which is why neither the schema nor the call site uppercases the caption.
 *
 * It is kept here for **design comparison and is not a model for published copy**: spoken aloud the
 * leading "IMAGE" duplicates the role a screen reader already announces for the adjacent `<img>`,
 * and ".jpg" is spelled out character by character. The `caption` field's own description steers
 * editors away from both; this mock exists to be measured against node 16:259.
 *
 * **The pills are sentence case.** Figma types them in capitals; the schema tells an editor to store
 * them in sentence case and the component uppercases in CSS, so passing capitals here would test the
 * mock's shift key instead of the section's `textTransform`. It is also what a screen reader wants:
 * short literal all-caps runs are the ones most often spelled out letter by letter.
 *
 * **The image comes from the fixture pool**, ranked toward the drawn 2.31:1 by the advisory
 * `width`/`height`. A fabricated image object always falls back to the grey placeholder —
 * `useNextSanityImage` needs a real asset reference — so this is the only way a story exercises the
 * same resolution path as production.
 */
const data = sectionFixture<IMediaTagsSection>('mediaTagsSection') ?? {
  /*
   * `altText` is passed rather than left to `mockImage`'s "Placeholder image" default, matching
   * `ModelDuet` and `ModelViewer`. It is the only thing that can carry the relationship between the
   * photograph and the pills, so the story should show the next reader what good alt looks like for
   * this block — and the a11y addon and the story-as-test sweep should see real copy rather than the
   * word "Placeholder".
   */
  image: mockImage({
    seed: 'mediaTags-aerial',
    width: 1200,
    height: 520,
    kind: 'photo',
    altText:
      'Aerial view of the lodge grounds — the tree cathedral in the pines, the wedding hall, and the pool below the terrace.'
  }),
  caption: 'IMAGE · lodge-aerial.jpg · pines + river + pool',
  tags: ['Tree Cathedral', 'Wedding Hall', 'Pool']
};

/**
 * Unconstrained, deliberately — this is the only story with no `atWidth` wrapper.
 *
 * The section is full-width page furniture, so `Default` should take the canvas and reflow with it:
 * that is what the docs preview shows, and what a reviewer narrowing the window is testing. Pinning
 * it to a width made the section wider than a 414px viewport and produced horizontal scroll that
 * looked like a section bug and was a story bug.
 *
 * `Desktop` and `Mobile` below pin a width instead, because the switch is a *container* query and a
 * fixed width is the only way to resolve it deterministically wherever the test canvas happens to be.
 */
export const Default: Story = {
  args: data
};

/**
 * The desktop frame (node 16:257, 1200×520 inside a 1282px page).
 *
 * 1280px of wrapper puts the container — page minus the two `--container-gutter`s — at ~1200px,
 * which is both the drawn frame width and comfortably above the 640px switch.
 */
export const Desktop: Story = {
  args: data,
  decorators: [atDesktop],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvasElement.querySelector('figure') as HTMLElement;
    const { width, height } = frame.getBoundingClientRect();

    // The wide ratio, to within a sub-pixel of layout slack. 1200 / 520 = 2.3077.
    await expect(width / height).toBeCloseTo(1200 / 520, 2);
    // All three pills are drawn, and drawn as a list rather than as loose text.
    await expect(within(canvas.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
    // Visible, i.e. the container query resolved the wide branch rather than leaving the default.
    await expect(getComputedStyle(canvas.getByRole('list')).clipPath).toBe('none');

    /*
     * The two mono registers the frame draws, pinned because they are one inherited custom property
     * apart and a change to either is invisible in review.
     *
     * The pills are tracked at the role's 0.1em, which is the drawn `tracking-[1.1px]` on 11px type
     * (nodes 16:262/264/266). The caption is **untracked**, because node 16:259 carries no tracking
     * at all and the copy is a file name. Losing the `--mono-letter-spacing: normal` re-point costs
     * 50px of chip width at this caption length.
     *
     * Asserted as a **ratio of the resolved font size** rather than as a literal `1.1px`, because
     * `--body-2xs` is `fluid(10px, 11px)` and reaches 11px only at a 1440px *viewport* — which the
     * `atWidth` wrapper does not control. Pinning the px literal made this story pass or fail on the
     * width of the test canvas: it read 1.07748px at the runner's default and 1.1px in a maximised
     * browser, which is a flake rather than a check.
     */
    const [firstItem] = within(canvas.getByRole('list')).getAllByRole('listitem');
    const pill = firstItem.firstElementChild as HTMLElement;
    const chip = canvasElement.querySelector('figcaption > span') as HTMLElement;
    const pillStyle = getComputedStyle(pill);

    await expect(Number.parseFloat(pillStyle.letterSpacing) / Number.parseFloat(pillStyle.fontSize)).toBeCloseTo(
      0.1,
      3
    );
    await expect(getComputedStyle(chip).letterSpacing).toBe('normal');

    /*
     * The photograph fills the frame. Both ratio assertions above read the `<figure>`, whose height
     * comes from `aspect-ratio` rather than from its content — so they would pass unchanged if the
     * image collapsed to nothing inside it. This is the only line that would notice.
     */
    const img = canvasElement.querySelector('img') as HTMLImageElement;

    await expect(img.getBoundingClientRect().height).toBeCloseTo(height, 0);

    /*
     * And both overlays paint *over* it — the assertion this file was missing when the caption
     * shipped invisible.
     *
     * `toBeVisible()` reads `display`/`visibility`/`opacity` and knows nothing about occlusion, so
     * it passed while the photograph covered the chip completely. `elementFromPoint` is the only
     * check that sees it. The image wrapper is `position: relative`, the frame is not a stacking
     * context, and all three children were `z-index: auto` — so paint order was tree order and the
     * chip, being first, lost.
     */
    for (const overlay of [chip, pill]) {
      const box = overlay.getBoundingClientRect();
      const topmost = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);

      await expect(topmost).toBe(overlay);
    }
  }
};

/**
 * The mobile frame (node 16:403, 350×200 inside a 392px page) — caption only.
 *
 * 375px of wrapper is the narrow anchor every `fluid()` token in the project interpolates from.
 *
 * The two things this asserts are the two the ticket got backwards and the two that are easy to
 * regress. **The block is proportionally *taller* here, not shorter** — 1.75:1 against the desktop's
 * 2.31:1 — which is what the frames draw whatever the ticket text says. And the pills are *clipped*,
 * not removed: still one list of three items in the accessibility tree, occupying no picture. See
 * the note on the `<ul>` in `index.tsx` for why that is the choice rather than `display: none`.
 */
export const Mobile: Story = {
  args: data,
  decorators: [atMobile],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}16-403` }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvasElement.querySelector('figure') as HTMLElement;
    const { width, height } = frame.getBoundingClientRect();

    // 350 / 200 = 1.75, and taller relative to its width than the desktop frame's 2.31.
    await expect(width / height).toBeCloseTo(350 / 200, 2);
    await expect(width / height).toBeLessThan(1200 / 520);

    const list = canvas.getByRole('list');
    // Still in the accessibility tree, with every pill still in it.
    await expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    /*
     * Sentence case, and the mismatch is worth knowing rather than worth normalising: `textContent`
     * is the *stored* string, because `text-transform` is paint and never rewrites the DOM. What a
     * screen reader announces is the **rendered** text — Chromium computes an accessible name from
     * it — so these are read out in capitals while this assertion sees the CMS value. Asserting the
     * stored form is the right half to pin: it is what the editor typed and what must survive the
     * clip.
     */
    await expect(list).toHaveTextContent('Tree Cathedral');
    // And clipped out of the picture. `inset(50%)` is a zero-area region.
    await expect(getComputedStyle(list).clipPath).not.toBe('none');
  }
};

/**
 * WCAG 1.4.4: doubling the text size must not delete the place names.
 *
 * The switch that clips the pill row is a **container** query, and Chromium resolves `rem` inside
 * one against the live root font size — so while the threshold was `40rem` the row vanished at a
 * 24px root on a 1024px container and at 32px on a 1280px one. The viewport never changed; only the
 * text size did, and content disappeared. That is the failure 1.4.4 names, and it is one character
 * away at all times: `640px` → `40rem` reintroduces it with nothing else to notice.
 *
 * 32px is 200% of the 16px default, the ratio 1.4.4 specifies. The root is restored in a `finally`
 * because the browser-mode runner shares a document across the stories in this file, so a leaked
 * font size would silently re-measure every story after this one.
 *
 * **The wrapper is `px` here, and it is the one story where that is correct** — every other story
 * would be `rem` if it tracked the reader's root size. This story *varies* the root, so a `rem`
 * wrapper would scale with it (80rem becoming 2560px at a 32px root) and stay above the threshold
 * on either spelling, passing whatever the switch says. 1080px of wrapper is ~1000px of container:
 * above the 640px threshold, and below the 1280px that `40rem` would resolve to at this root. That
 * is exactly the band where the two spellings disagree, which is the only band that tests anything.
 */
export const AtDoubleTextSize: Story = {
  args: data,
  decorators: [atWidth('1080px')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { documentElement } = document;
    const original = documentElement.style.fontSize;

    documentElement.style.fontSize = '32px';

    try {
      const list = canvas.getByRole('list');

      await expect(within(list).getAllByRole('listitem')).toHaveLength(3);
      // Still painted, not merely present. This is the assertion that was failing before the switch
      // was decoupled from the root size.
      await expect(getComputedStyle(list).clipPath).toBe('none');
    } finally {
      documentElement.style.fontSize = original;
    }
  }
};

/**
 * No pills — a plain captioned photograph, which is the shape a second instance of this section is
 * most likely to take.
 *
 * The frame and the caption must survive alone; an empty `<ul>` must not be left behind to take a
 * flex gap in the corner.
 */
export const WithoutPills: Story = {
  args: { ...data, tags: [] },
  decorators: [atDesktop],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvasElement.querySelector('figure')).not.toBeNull();
    await expect(canvas.getByText(/lodge-aerial/)).toBeVisible();
    await expect(canvas.queryByRole('list')).toBeNull();
  }
};

/**
 * No caption — a labelled map with nothing to credit.
 *
 * `<figcaption>` must be absent rather than empty: `Tag` returns `null` for a blank label, so an
 * unguarded caption would leave a positioned but invisible element in the corner.
 */
export const WithoutCaption: Story = {
  args: { ...data, caption: undefined },
  decorators: [atDesktop],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvasElement.querySelector('figcaption')).toBeNull();
    await expect(within(canvas.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
  }
};

/**
 * Neither overlay — the photograph on its own, which is the minimum a valid document can hold
 * (`image` is the section's one required field).
 */
export const ImageOnly: Story = {
  args: { image: data.image },
  decorators: [atDesktop],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvasElement.querySelector('figure')).not.toBeNull();
    await expect(canvasElement.querySelector('figcaption')).toBeNull();
    await expect(canvas.queryByRole('list')).toBeNull();
  }
};

/**
 * The repeater is unbounded, so the row has to wrap rather than run off the picture.
 *
 * Nine pills is the count of the facility grid on the same page, which is the realistic upper end of
 * what an editor would mark up. Extra lines must grow *upward* into the frame — the row is anchored
 * by `inset-block-end`, so a taller box extends into the picture rather than out through the
 * frame's `overflow: clip` and into the section below.
 *
 * `atWrapping` and not `atDesktop`, because at 1280px all nine fit on one line and the story asserts
 * nothing — measured 1152px of row against 1152px available. See the note on the width constants for
 * why it is 48rem rather than the narrowest width that nominally clears the switch.
 */
export const ManyPills: Story = {
  args: {
    ...data,
    tags: [
      'Tree Cathedral',
      'Wedding Hall',
      'Pool',
      'Champagne Garden',
      'The Terrace',
      'Sauna',
      'Hot Tub',
      'Games Room',
      'Tennis + Yard Games'
    ]
  },
  decorators: [atWrapping],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvasElement.querySelector('figure') as HTMLElement;
    const list = canvas.getByRole('list');
    const items = within(list).getAllByRole('listitem');

    await expect(items).toHaveLength(9);
    // Still the visible branch — this width is above the switch, so the wrap is a real one and not
    // the clipped row being measured by accident.
    await expect(getComputedStyle(list).clipPath).toBe('none');
    // Genuinely on more than one line: the last pill sits below the first.
    const [firstPill] = items;
    const lastPill = items[items.length - 1];

    await expect(lastPill.getBoundingClientRect().top).toBeGreaterThan(firstPill.getBoundingClientRect().bottom);

    const frameBox = frame.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();

    // Wrapped, not a single overflowing line. A half-pixel of slack for sub-pixel layout.
    await expect(listBox.width).toBeLessThanOrEqual(frameBox.width + 0.5);
    // And contained on the block axis too, which is what `inset-block-end` buys.
    await expect(listBox.bottom).toBeLessThanOrEqual(frameBox.bottom + 0.5);
    await expect(listBox.top).toBeGreaterThanOrEqual(frameBox.top - 0.5);
  }
};

/**
 * Blank and duplicate entries, both of which a draft can hold.
 *
 * The reasoning for both passes is on the reduce in `index.tsx`; this is the case that holds it true.
 * In short: a blank pill would draw an empty filled box over the photograph, and a duplicate would
 * hand React two identical keys in Presentation, which `Rule.unique()` cannot prevent because it is
 * publish-time and Presentation renders drafts.
 */
export const BlankAndDuplicatePills: Story = {
  args: { ...data, tags: ['Tree Cathedral', '   ', 'Pool', 'Pool', ''] },
  decorators: [atDesktop],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const items = within(canvas.getByRole('list')).getAllByRole('listitem');

    // Three survive the filter — the two blanks are gone, both "Pool"s are kept.
    await expect(items).toHaveLength(3);
    for (const item of items) {
      await expect(item.textContent?.trim()).not.toBe('');
    }
  }
};

/**
 * A missing image renders nothing at all.
 *
 * `image` is `required()` in the schema, so this is a half-built section in the Studio's
 * Presentation preview. The frame is a fixed-ratio box with a radius and `overflow: clip`, so
 * drawing it empty would publish a blank rounded rectangle with two chips floating in it.
 */
export const WithoutImage: Story = {
  args: { caption: 'IMAGE · lodge-aerial.jpg', tags: ['Pool'] },
  decorators: [atDesktop],
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('figure')).toBeNull();
    await expect(canvasElement.querySelector('section')).toBeNull();
  }
};
