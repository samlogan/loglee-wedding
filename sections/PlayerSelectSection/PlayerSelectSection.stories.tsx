import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type {
  IPlayerSelectSection,
  IPlayerSelectSectionPlayer
} from '@/tools/sanity/schema/sections/playerSelectSection';
import mockImage from '@/tools/storybook/mockImage';
import mockSectionFields from '@/tools/storybook/mockSectionFields';
import sectionFixture from '@/tools/storybook/sectionFixture';

import PlayerSelectSection from '.';
import { isSelectablePlayer, playerPath } from './players';

const FIGMA = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=';

/**
 * The home page's character select.
 *
 * `parameters.design` points at the **panel** (node 1:79) rather than at the home frame, so
 * `/review-design` compares against the thing this section renders. The hero above it and the closing
 * CTA below it are separate sections.
 *
 * ## What renders in the arches here
 *
 * Headless Chromium rasterises WebGL in software, so every story on the default `modelMode` resolves
 * to the viewer's fallback — and these players have no fallback image, exactly like the published
 * ones, so the arch shows the hatched placeholder. That is also what the comp draws. On a developer's
 * GPU the same stories load the two GLBs from `public/` and show the characters.
 *
 * Only `Loaded` forces a live canvas. Canvas stories are the slowest in the suite, and everything
 * else here — layout, links, names, focus, the degraded players — is provable without one.
 *
 * ## A viewport, not a width wrapper, for the sized stories
 *
 * The other section stories pin a `rem` wrapper, because the layout they test is a container query and
 * a wrapper is the faithful way to reach one. This one is not: the columns share the panel's width,
 * but the gap between them and the padding around them are `fluid()` pairs, which interpolate on
 * **`vw`**. A 390px wrapper in the runner's 1200px window gets desktop gaps inside a phone-sized panel
 * — measured, a 320px wrapper left each card 60px wide and overflowed it — which is a layout no
 * device can produce. `globals.viewport` resizes the runner's actual window (`@storybook/addon-vitest`
 * reads it), so the phone stories get a phone's gaps.
 *
 * `comp390` is the mobile comp's own frame width; `desktop` (1280) and `mobile1` (320) are Storybook's.
 */
const meta = {
  title: 'Sections/Player Select',
  component: PlayerSelectSection,
  tags: ['autodocs'],
  parameters: {
    design: { type: 'figma', url: `${FIGMA}1-79` },
    viewport: {
      options: {
        comp390: { name: 'Mobile comp (390)', styles: { height: '844px', width: '390px' }, type: 'mobile' }
      }
    }
  }
} satisfies Meta<typeof PlayerSelectSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Render the story in a real window of this size — see the note on `meta`. */
const atViewport = (value: 'comp390' | 'desktop' | 'mobile1') => ({ viewport: { isRotated: false, value } });

/**
 * The two players, shaped **exactly** as `queries.groq.ts` projects them — there are no player
 * documents in the committed fixtures, so these stand in for the join.
 *
 * The GLBs are the real ones in `public/`, served by Storybook's `staticDirs`. The clip names are
 * real too, read out of each file, and set the way the published players set them: Sam idles on
 * `Walking` and hovers `Excited_Walk_M`, Lauren idles on `Casual_Walk` and hovers `Boom_Dance`.
 *
 * No fallback image on either, matching the dataset.
 */
const SAM: IPlayerSelectSectionPlayer = {
  _id: 'player-sam',
  clips: { hover: 'Excited_Walk_M', idle: 'Walking' },
  fallbackImage: null,
  model: { asset: { url: '/sam.glb' } },
  name: 'Sam',
  slug: { current: 'sam' }
};

const LAUREN: IPlayerSelectSectionPlayer = {
  _id: 'player-lauren',
  clips: { hover: 'Boom_Dance', idle: 'Casual_Walk' },
  fallbackImage: null,
  model: { asset: { url: '/lauren.glb' } },
  name: 'Lauren',
  slug: { current: 'lauren' }
};

/**
 * The comp's copy, verbatim from node 1:79, in the case an editor should store it — the CSS supplies
 * the capitals, so the uppercasing under test is the section's rather than the mock's shift key.
 *
 * **Every story that asserts the comp's copy, count or geometry uses this**, not the fixture.
 */
const MOCK: IPlayerSelectSection = {
  caption: '3D canvas (react three fiber) · idle loop',
  players: [SAM, LAUREN],
  prompt: 'Select player'
};

/**
 * Real Sanity data when a published page carries this section, the mock until then.
 *
 * Today there is no fixture: the home page is MAM-1900's, and it is not built yet. The moment it is
 * published, `yarn storybook:fixtures` writes one and `PublishedContent` switches to it with no edit.
 */
const data = sectionFixture<IPlayerSelectSection>('playerSelectSection') ?? MOCK;

/**
 * The section's props plus `sectionFields`, which the projection returns and `getSectionSpacingProps`
 * reads but `IPlayerSelectSection` does not declare — the shape `MediaCardGridSection.stories` uses.
 */
type PlayerSelectArgs = IPlayerSelectSection & { sectionFields?: ReturnType<typeof mockSectionFields> };

/** `MOCK` as the home page places it: both remove-spacing toggles on. See `SpacingRemoved`. */
const FLUSH: PlayerSelectArgs = {
  ...MOCK,
  sectionFields: mockSectionFields({ removeBottomSpacing: true, removeTopSpacing: true })
};

/** The cards, in document order. */
const cardsOf = (canvasElement: HTMLElement) => within(canvasElement).getAllByRole('link');

/** The viewer root inside a card — found through its state attribute, as the viewer's stories do. */
const viewerOf = (card: HTMLElement) => card.querySelector('[data-model-render]') as HTMLElement;

/**
 * The arch — the viewer's stage — found **two ways**, and required to agree.
 *
 * The section's CSS reaches the stage as the viewer root's only `div` child. A lookup that made the same
 * assumption could not catch the change that breaks it: wrap the stage in a new `div` and the CSS and
 * the lookup would land on the same wrong element, measure it, and pass while the arch a reader sees kept
 * the player page's inset and shape.
 *
 * So the stage is also found independently, as the parent of whatever the viewer is showing: the
 * `role="img"` placeholder or canvas holder, or the frame around the fallback `<img>`. Each fills the
 * stage (`inset: 0`) in every state these stories reach. If the two answers differ, the override no
 * longer reaches the arch, and that is the failure — named, before any geometry is measured.
 */
const archOf = (card: HTMLElement) => {
  const viewer = viewerOf(card);
  const arch = viewer.querySelector(':scope > div:only-of-type');
  const shown = viewer.querySelector('[role="img"]') ?? viewer.querySelector('img')?.parentElement;

  if (!arch || shown?.parentElement !== arch) {
    throw new Error("`.arch .viewer > div:only-of-type` no longer selects ModelViewer's stage");
  }
  return arch as HTMLElement;
};

const panelOf = (canvasElement: HTMLElement) => canvasElement.querySelector('ul')?.parentElement as HTMLElement;

/**
 * The arch's drawn geometry, as the stylesheet derives it: a line through the desktop arch (230 ×
 * 418) and the mobile one (130 × 242). Asserted from the rendered box, so a change to the viewer's DOM
 * that silently drops the section's re-point fails here rather than shipping the player page's arch.
 */
const expectArchGeometry = async (card: HTMLElement) => {
  const { width, height } = archOf(card).getBoundingClientRect();

  await expect(width).toBeGreaterThan(0);
  await expect(height).toBeCloseTo(1.76 * width + 13.2, 0);
  // The arch fills its card's content box: no frame of its own, no inset.
  const { paddingLeft, paddingRight } = getComputedStyle(card);
  const content = card.getBoundingClientRect().width - parseFloat(paddingLeft) - parseFloat(paddingRight);
  await expect(width).toBeCloseTo(content, 0);
};

/** Side by side: one row, left to right, no overlap. The criterion the mobile comp exists for. */
const expectSideBySide = async (cards: HTMLElement[]) => {
  const boxes = cards.map((card) => card.getBoundingClientRect());

  await expect(boxes.length).toBeGreaterThan(1);
  for (const [index, box] of boxes.slice(1).entries()) {
    const previous = boxes[index];
    await expect(box.top).toBeCloseTo(previous.top, 0);
    await expect(box.left).toBeGreaterThanOrEqual(previous.right);
  }
};

/** The last card, typed — `Array.prototype.at` is `T | undefined` even on a list known to be full. */
const lastOf = (cards: HTMLElement[]) => cards.at(-1) as HTMLElement;

/**
 * **The section against whatever the dataset holds today**, at the canvas's own width.
 *
 * Every expectation is read out of `data` and filtered the way the component filters, so this is the
 * story that survives an editor adding a third player or renaming one. `Default` pins the comp.
 */
export const PublishedContent: Story = {
  args: data,
  play: async ({ canvasElement }) => {
    // The component's own test, not a copy of it — so the two cannot drift. `IncompleteDrafts` pins
    // what that test does against fixed inputs.
    const expected = (data.players ?? []).filter(isSelectablePlayer);

    // Not vacuous: an empty list means the dataset lost its players, which is worth failing on.
    await expect(expected.length).toBeGreaterThan(0);

    const cards = cardsOf(canvasElement);
    await expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual(
      expected.map((player) => `Play as ${player.name.trim()}`)
    );
    await expect(cards.map((card) => card.getAttribute('href'))).toEqual(
      expected.map((player) => `/${playerPath(player.slug.current)}/`)
    );
  }
};

/**
 * The drawn panel at the canvas's own width — on `MOCK`, so the literals stay literals.
 *
 * The accessibility contract is asserted here because it is the one that holds at every width:
 * two real links, each with one name, reachable without the canvas — and **no image with a name
 * anywhere in the panel**, which is the proof that the viewer's `alt` is not read a second time.
 */
export const Default: Story = {
  args: MOCK,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The prompt is the panel's heading, so the list after it has a label to be found by.
    await expect(canvas.getByRole('heading', { level: 2 })).toHaveTextContent('Select player');
    // The caption is on screen but decorative — it describes the canvases, which are hidden too.
    const caption = canvas.getByText('3D canvas (react three fiber) · idle loop');
    await expect(caption).toBeVisible();
    await expect(caption).toHaveAttribute('aria-hidden', 'true');

    // A list of two, in the players' order.
    await expect(within(canvas.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);

    // Each card one link, one name, one destination.
    await expect(canvas.getByRole('link', { name: 'Play as Sam' })).toHaveAttribute('href', '/sam/');
    await expect(canvas.getByRole('link', { name: 'Play as Lauren' })).toHaveAttribute('href', '/lauren/');

    // The viewer names whatever is in its arch; inside a link that is already named, that is the
    // name read twice. `getAllByRole` skips `aria-hidden` subtrees, so there must be none left.
    await expect(canvas.queryAllByRole('img')).toHaveLength(0);

    // The positions come from the order — there is no field for them.
    const cards = cardsOf(canvasElement);
    await expect(cards[0]).toHaveTextContent('P1');
    await expect(cards[1]).toHaveTextContent('P2');
  }
};

/**
 * The arch's width on a desktop: `--player-select-arch-max` in the stylesheet.
 *
 * The comp draws 230 × 418 (node 1:85). The client asked for the characters at least 360px wide, so
 * the cap moved, and the arch's other measurements follow the stylesheet's own lines through the two
 * comps rather than any drawn number: height `1.76W + 13.2`, foot radius `8%W + 5.6`, hatch bar
 * `2%W + 5.4`. At the comp's 230 those give back its 418, 24 and 10.
 */
const DESKTOP_ARCH = 360;

/**
 * Desktop: two cards centred, each arch at its 360px cap.
 *
 * A 1280px window, the design's desktop frame. At that width a card has more room than it needs, so
 * the arch sits at its cap, which is what makes the numbers assertable here. The gap between the cards
 * is `fluid()`'s value at 1280 rather than the comp's 120, which the scale reaches at its 1440 anchor.
 */
export const Desktop: Story = {
  args: MOCK,
  globals: atViewport('desktop'),
  play: async ({ canvasElement }) => {
    const cards = cardsOf(canvasElement);
    const panel = panelOf(canvasElement).getBoundingClientRect();

    await expectSideBySide(cards);

    for (const card of cards) {
      const arch = archOf(card).getBoundingClientRect();
      await expect(arch.width).toBeCloseTo(DESKTOP_ARCH, 0);
      await expect(arch.height).toBeCloseTo(1.76 * DESKTOP_ARCH + 13.2, 0);
      // The foot radius. The player page draws it at 28px; this comp's line gives 24 at 230.
      await expect(parseFloat(getComputedStyle(archOf(card)).borderBottomLeftRadius)).toBeCloseTo(
        0.08 * DESKTOP_ARCH + 5.6,
        1
      );

      /*
       * The hatch the placeholder actually draws: the section's own bar (10px on the comp's 230px arch,
       * 1:85), where the viewer's default would be narrower. `--viewer-hatch-step` is a local of the
       * viewer's rather than a hook, so this is what fails if it is renamed. The hatch is drawn on the placeholder's `::before`, the layer that
       * slides while the model loads. Read from the gradient's resolved stops, `0 bar bar 2×bar`.
       */
      const bar = 0.02 * DESKTOP_ARCH + 5.4;
      const hatch = getComputedStyle(
        viewerOf(card).querySelector('[role="img"]') as HTMLElement,
        '::before'
      ).backgroundImage;
      const stops = [...hatch.matchAll(/([\d.]+)px/g)].map(([, px]) => Math.round(parseFloat(px)));
      await expect(stops).toEqual([0, bar, bar, 2 * bar].map(Math.round));
    }

    // Centred as a pair: the space either side of them is the same.
    const left = cards[0].getBoundingClientRect().left - panel.left;
    const right = panel.right - lastOf(cards).getBoundingClientRect().right;
    await expect(left).toBeCloseTo(right, 0);
  }
};

/**
 * Mobile: still side by side — the criterion — and filling the panel between them.
 *
 * A 390px window, the design's mobile frame (node 1:124). Nothing may scroll sideways, and each arch
 * is the line's height for its width.
 */
export const Mobile: Story = {
  args: MOCK,
  globals: atViewport('comp390'),
  parameters: { design: { type: 'figma', url: `${FIGMA}1-124` } },
  play: async ({ canvasElement }) => {
    const cards = cardsOf(canvasElement);
    const panel = panelOf(canvasElement);

    await expectSideBySide(cards);
    for (const card of cards) {
      await expectArchGeometry(card);
    }

    // Both inside the frame, and the frame not scrolling to hold them.
    await expect(lastOf(cards).getBoundingClientRect().right).toBeLessThanOrEqual(panel.getBoundingClientRect().right);
    await expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth);
  }
};

/**
 * The narrowest phone class, with a name long enough to have to wrap.
 *
 * A 320px window — below the fluid scale's floor, where every token holds its minimum and the arch is
 * all that gives. The name chip drops under the position rather than widening its column.
 */
export const Narrowest: Story = {
  args: {
    ...MOCK,
    players: [SAM, { ...LAUREN, _id: 'player-long', name: 'Lauren-Alexandra' }]
  },
  globals: atViewport('mobile1'),
  parameters: { design: { type: 'figma', url: `${FIGMA}1-124` } },
  play: async ({ canvasElement }) => {
    const cards = cardsOf(canvasElement);
    const panel = panelOf(canvasElement);

    await expectSideBySide(cards);
    await expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth);
    for (const card of cards) {
      await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
    }
  }
};

/**
 * Tab reaches each card in order, and the focused card draws the design system's ring.
 *
 * `.button:focus-visible` owns the ring — the card is a `Link`, and the section restates none of it —
 * so this is the proof that overriding the link's layout did not take its focus state with it. The ring
 * is compared with the `--button-focus-ring-*` tokens rather than with literals, so retuning the ring
 * system-wide does not fail a section that did nothing wrong.
 */
export const KeyboardFocus: Story = {
  args: MOCK,
  play: async ({ canvasElement }) => {
    const cards = cardsOf(canvasElement);
    const tokens = getComputedStyle(document.documentElement);

    await userEvent.tab();
    await expect(cards[0]).toHaveFocus();

    const ring = getComputedStyle(cards[0]);
    await expect(ring.outlineStyle).toBe('solid');
    await expect(ring.outlineWidth).toBe(tokens.getPropertyValue('--button-focus-ring-width').trim());
    // Clear of the box, and following its rounded corners rather than squaring them off.
    await expect(ring.outlineOffset).toBe(tokens.getPropertyValue('--button-focus-ring-offset').trim());
    await expect(parseFloat(ring.borderTopLeftRadius)).toBeGreaterThan(0);

    await userEvent.tab();
    await expect(cards[1]).toHaveFocus();
  }
};

/**
 * A player with no GLB, one with no clips, one with no fallback image — each still a working card.
 *
 * Three at once, which also shows a third player adding a column rather than a row. Forced to the
 * fallback branch, so the story says the same thing on every machine and so the viewer's **image**
 * branch is reached: the no-clips player has a fallback image and shows it, while the other two — no
 * GLB, no fallback — show the placeholder. That picture is a real `<img alt>` inside a link that is
 * already named, which is exactly where the name would be read twice; the story checks it is not.
 */
export const MissingAssets: Story = {
  args: {
    ...MOCK,
    modelMode: 'fallback',
    players: [
      { ...SAM, _id: 'no-glb', model: null, name: 'No model', slug: { current: 'no-model' } },
      {
        ...LAUREN,
        _id: 'no-clips',
        clips: null,
        // Portrait, because the arch is — `mockImage` ranks its pool by how close the shape is.
        fallbackImage: mockImage({ altText: 'Lauren', height: 418, seed: 'player-select-lauren', width: 230 }),
        name: 'No clips',
        slug: { current: 'no-clips' }
      },
      { ...SAM, _id: 'no-fallback', fallbackImage: null, name: 'No fallback', slug: { current: 'no-fallback' } }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cards = cardsOf(canvasElement);

    await expect(cards).toHaveLength(3);
    for (const name of ['No model', 'No clips', 'No fallback']) {
      await expect(canvas.getByRole('link', { name: `Play as ${name}` })).toBeVisible();
    }
    await expect(cards.map((card) => card.getAttribute('href'))).toEqual(['/no-model/', '/no-clips/', '/no-fallback/']);

    // The branch each arch took: nothing to load, a picture to show, nothing to show.
    await expect(cards.map((card) => viewerOf(card).dataset.modelRender)).toEqual([
      'placeholder',
      'image',
      'placeholder'
    ]);
    // And the picture's `alt` is not a second name inside the link.
    await expect(canvas.queryAllByRole('img')).toHaveLength(0);

    // Every arch full size and the same size — no card collapses or grows for want of a file.
    const first = archOf(cards[0]).getBoundingClientRect();
    for (const card of cards) {
      await expect(archOf(card).getBoundingClientRect().height).toBeCloseTo(first.height, 0);
      await expectArchGeometry(card);
    }
  }
};

/**
 * What the drafts perspective can return: a player with no name yet, one with no slug yet, one whose
 * slug is only a slash — and one whose slug was typed with slashes round it.
 *
 * The first three are not drawn: one would be a link announced as "Play as", the other two links to
 * nowhere (`//` is a protocol-relative URL, not the home page). The survivors keep contiguous
 * positions. The name is whitespace rather than empty, because that is the case a naive
 * `Boolean(name)` gets wrong; the typed `/lauren/` still reaches `/lauren/` rather than `//lauren//`.
 */
export const IncompleteDrafts: Story = {
  args: {
    ...MOCK,
    players: [
      SAM,
      { ...SAM, _id: 'draft-unnamed', name: '   ', slug: { current: 'unnamed' } },
      { ...LAUREN, _id: 'draft-no-slug', slug: null },
      { ...LAUREN, _id: 'draft-slash-slug', slug: { current: '/' } },
      { ...LAUREN, slug: { current: '/lauren/' } }
    ]
  },
  play: async ({ canvasElement }) => {
    const cards = cardsOf(canvasElement);

    await expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual(['Play as Sam', 'Play as Lauren']);
    await expect(cards.map((card) => card.getAttribute('href'))).toEqual(['/sam/', '/lauren/']);
    await expect(cards[1]).toHaveTextContent('P2');
  }
};

/** No players at all: nothing renders, rather than "Select player" over an empty panel. */
export const NoPlayers: Story = {
  args: { ...MOCK, players: [] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('section')).toBeNull();
  }
};

/**
 * No caption: the prompt stays where the comp puts it instead of riding up against the frame.
 *
 * The first grid row keeps one caption line's height when it is empty. Asserted as the row's own
 * height, because the prompt's position is only the consequence.
 */
export const WithoutCaption: Story = {
  args: { ...MOCK, caption: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const prompt = canvas.getByRole('heading', { level: 2 });
    const header = prompt.parentElement as HTMLElement;
    const [captionRow] = getComputedStyle(header).gridTemplateRows.split(' ');

    await expect(parseFloat(captionRow)).toBeGreaterThan(0);
    await expect(prompt.getBoundingClientRect().top).toBeGreaterThan(
      header.getBoundingClientRect().top + parseFloat(captionRow)
    );
  }
};

/**
 * The home page's composition: both remove-spacing toggles on, and the panel flush with the section.
 *
 * The gap the comps draw above the panel (36px at 1280, 23px at 390) is the Hero section's bottom
 * padding, and the CTA below carries its own — so on `/` this section is placed with its spacing
 * removed and must add no offset of its own. Asserted as edges meeting rather than as a padding
 * value, because a margin on the panel would pass a padding check and still leave the gap.
 */
export const SpacingRemoved: Story = {
  args: FLUSH,
  play: async ({ canvasElement }) => {
    const section = (canvasElement.querySelector('section') as HTMLElement).getBoundingClientRect();
    const panel = panelOf(canvasElement).getBoundingClientRect();

    await expect(panel.top).toBeCloseTo(section.top, 0);
    await expect(panel.bottom).toBeCloseTo(section.bottom, 0);
  }
};

/**
 * The dark theme, through the same path the toolbar and the Studio's radio take.
 *
 * Every paint in the stylesheet is a `[data-theme]` token, so a token that fails to resolve drops its
 * whole declaration rather than falling back to something wrong: a dashed stroke that reports `none`
 * and a panel that matches the page are the same symptom. Both checked, and the chip against the panel.
 */
export const DarkTheme: Story = {
  args: MOCK,
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    const section = canvasElement.querySelector('section') as HTMLElement;
    const panel = panelOf(canvasElement);
    const chip = within(cardsOf(canvasElement)[0]).getByText('Sam');

    await expect(section.dataset.theme).toBe('dark');
    await waitFor(async () => {
      await expect(getComputedStyle(panel).borderTopStyle).toBe('dashed');
      await expect(getComputedStyle(panel).backgroundColor).not.toBe(getComputedStyle(section).backgroundColor);
      await expect(getComputedStyle(chip).backgroundColor).not.toBe(getComputedStyle(panel).backgroundColor);
    });
  }
};

/**
 * The one live canvas: the character arrives without moving anything, and hover plays the hover clip
 * once and returns to idle.
 *
 * `modelMode: 'animated'` because this browser rasterises in software and `auto` correctly refuses it
 * (see the note on `modelMode`). Lauren has no GLB here, so only one 4MB character is decoded on the
 * CPU — the slow part of any canvas story — and her card doubles as the placeholder beside a loaded one.
 *
 * The hover clip is `Running` rather than `Excited_Walk_M` purely for its length: 0.71s against 11s,
 * the same substitution `ModelViewer.stories.tsx` makes, and the same code path.
 */
export const Loaded: Story = {
  args: {
    ...MOCK,
    modelMode: 'animated',
    players: [
      { ...SAM, clips: { hover: 'Running', idle: 'Excited_Walk_M' } },
      { ...LAUREN, model: null }
    ]
  },
  play: async ({ canvasElement }) => {
    await document.fonts.ready;

    const [sam, lauren] = cardsOf(canvasElement);
    const viewer = viewerOf(sam);
    const boxes = () =>
      [sam, lauren].flatMap((card) => [
        archOf(card).getBoundingClientRect().toJSON(),
        (card.lastElementChild as HTMLElement).getBoundingClientRect().top
      ]);

    // Measured before the character exists: the arch is already its final size.
    const before = boxes();
    await expect(viewer.dataset.modelRender).toBe('canvas');
    await expect(viewer.dataset.modelLoaded).toBe('false');

    await waitFor(
      async () => {
        await expect(viewer.dataset.modelLoaded).toBe('true');
        await expect(viewer.dataset.modelClip).toBe('Excited_Walk_M');
      },
      { timeout: 25_000 }
    );

    // Nothing shifted when it arrived: both arches, both label rows, to the pixel.
    await expect(boxes()).toEqual(before);
    await expect(viewerOf(lauren).dataset.modelRender).toBe('placeholder');
    // The live canvas's `role="img"` holder is the likeliest place for a second name to leak; it must not.
    await expect(within(canvasElement).queryAllByRole('img')).toHaveLength(0);

    await userEvent.hover(archOf(sam));
    await waitFor(async () => expect(viewer.dataset.modelClip).toBe('Running'), { timeout: 5000 });
    // And back to idle, unprompted, once the one-shot ends.
    await waitFor(async () => expect(viewer.dataset.modelClip).toBe('Excited_Walk_M'), { timeout: 10_000 });
  }
};

/**
 * Each player's Select Player Label replaces its position beside the name; a player without one keeps
 * `P2`.
 */
export const CustomLabels: Story = {
  args: { ...MOCK, players: [{ ...SAM, selectLabel: 'Groom' }, LAUREN] },
  play: async ({ canvasElement }) => {
    const cards = cardsOf(canvasElement);

    await expect(cards[0]).toHaveTextContent(/Groom/i);
    await expect(cards[0]).not.toHaveTextContent('P1');
    await expect(cards[1]).toHaveTextContent('P2');
  }
};
