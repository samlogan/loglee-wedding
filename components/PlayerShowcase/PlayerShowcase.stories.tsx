import { stegaEncodeSourceMap } from '@sanity/client/stega';
import type { ContentSourceMap } from '@sanity/client/stega';
import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { IPlayerStat } from '@/tools/sanity/schema/documents/player';

import PlayerShowcase from '.';
import type { PlayerShowcasePlayer, PlayerShowcaseRosterEntry } from '.';

import styles from './styles.module.scss';

const FIGMA = 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=';

/**
 * Pins the component to a width so its container query resolves the same way in the component-test
 * runner as it does here. The switch is on the width of the showcase's own containers, so a canvas
 * left to the runner's default could assert the wrong layout while claiming to be desktop.
 */
const atWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ width }}>
      <Story />
    </div>
  );

/**
 * The comp's own card, verbatim — bracketed placeholders included, since that is what the design
 * draws. Stories asserting the design's copy and counts render this, never live data.
 */
const DESIGN_STATS: IPlayerStat[] = [
  { _key: 'home', _type: 'playerTextStat', fullWidth: false, label: 'Home town', value: '[Home town]' },
  { _key: 'move', _type: 'playerTextStat', fullWidth: false, label: 'Special move', value: '[Special move]' },
  { _key: 'weak', _type: 'playerTextStat', fullWidth: false, label: 'Weakness', value: '[Weakness]' },
  { _key: 'drink', _type: 'playerTextStat', fullWidth: false, label: "Favourite drink at Fin's", value: '[Drink]' },
  {
    _key: 'met',
    _type: 'playerTextStat',
    fullWidth: true,
    label: 'How we met',
    value: '[Two or three lines on how Sam and Lauren met — placeholder.]'
  },
  { _key: 'dance', _type: 'playerMeterStat', label: 'Dance', score: 8 },
  { _key: 'bbq', _type: 'playerMeterStat', label: 'BBQ', score: 9 },
  { _key: 'nav', _type: 'playerMeterStat', label: 'Navigation', score: 3 }
];

const ROSTER: PlayerShowcaseRosterEntry[] = [
  { name: 'Sam', slug: 'sam' },
  { name: 'Lauren', slug: 'lauren' }
];

/** The clip names as they actually appear inside each GLB — see `components/ModelViewer`. */
const SAM: PlayerShowcasePlayer = {
  clips: { feature: 'Gangnam_Groove', hover: 'Agree_Gesture', idle: 'restpose' },
  eyebrow: 'P1 · Groom',
  level: 'Lvl 33',
  model: { originalFilename: 'sam.glb', url: '/sam.glb' },
  name: 'Sam',
  slug: 'sam',
  stats: DESIGN_STATS
};

const LAUREN: PlayerShowcasePlayer = {
  clips: { feature: 'Crystal_Beads', idle: 'restpose' },
  model: { originalFilename: 'lauren.glb', url: '/lauren.glb' },
  name: 'Lauren',
  slug: 'lauren',
  stats: DESIGN_STATS
};

/**
 * The live state today. Both published player documents carry a name, a model and clips, and
 * nothing else — no eyebrow, no level, no stats, no fallback image. That content has not been
 * written yet, so this is what `/sam` actually renders until it is.
 */
const SAM_AS_PUBLISHED: PlayerShowcasePlayer = {
  clips: SAM.clips,
  model: SAM.model,
  name: 'Sam',
  slug: 'sam',
  stats: []
};

/**
 * A player as the page receives it in draft mode, through the client's own stega encoder rather than
 * a hand-rolled payload. The source map is the minimum `stegaEncodeSourceMap` needs: one document,
 * and each string field mapped back to itself, which is the shape `sanityFetch` gets from the API.
 */
const inDraftMode = (player: PlayerShowcasePlayer): PlayerShowcasePlayer => {
  const paths = ["$['name']", "$['eyebrow']", "$['level']", "$['clips']['feature']", "$['clips']['idle']"];
  const sourceMap: ContentSourceMap = {
    documents: [{ _id: `player-${player.slug}`, _type: 'player' }],
    mappings: Object.fromEntries(
      paths.map((path, index) => [path, { source: { document: 0, path: index, type: 'documentValue' }, type: 'value' }])
    ),
    paths
  };

  return stegaEncodeSourceMap(player, sourceMap, { enabled: true, studioUrl: '/studio' });
};

const stageIn = (el: HTMLElement) => el.querySelector<HTMLElement>(`.${styles.stage}`);

/**
 * True when `later` comes after `earlier` in tree order — the order a screen reader and the Tab key
 * follow, as opposed to painted position, which a CSS reorder can change without moving either.
 */
const follows = (earlier: Node, later: Node) =>
  // eslint-disable-next-line no-bitwise -- DOCUMENT_POSITION_* is a bit mask by specification
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);

/**
 * A label reduced to its words, lowercased — punctuation and symbols such as the switch control's
 * arrow dropped — which is what a speech-input user says and what WCAG 2.5.3 compares.
 */
const words = (label: string | null) =>
  (label ?? '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');

/** The accessible name holds the visible words, in their visible order (WCAG 2.5.3). */
const expectLabelInName = async (control: HTMLElement) => {
  await expect(words(control.getAttribute('aria-label'))).toContain(words(control.textContent));
};

const trackCount = (el: HTMLElement) =>
  getComputedStyle(el)
    .gridTemplateColumns.split(' ')
    .filter((track) => track && track !== 'none').length;

const meta = {
  args: { player: SAM, roster: ROSTER },
  component: PlayerShowcase,
  parameters: {
    design: { type: 'figma', url: `${FIGMA}1-153` },
    layout: 'fullscreen'
  },
  tags: ['autodocs'],
  title: 'Surfaces/Player Showcase'
} satisfies Meta<typeof PlayerShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The showcase at the canvas's own width. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // AC: the name is the page h1, and the eyebrow is a sibling rather than swallowed into it.
    const heading = canvas.getByRole('heading', { level: 1 });
    await expect(heading).toHaveTextContent(/^Sam$/);
    await expect(heading).not.toHaveTextContent(/Groom/);
    await expect(canvas.getByText('P1 · Groom')).toBeInTheDocument();
  }
};

/**
 * Desktop, at the comp's 1280px frame: two columns, and the switch control in the bar.
 *
 * `getAllByRole` excludes `display: none`, so a count of one is the claim that exactly one switch
 * control is in the accessibility tree — the bar's — while the bottom copy is present in the DOM
 * and taken out of both the tree and the tab order.
 */
export const Desktop: Story = {
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const stage = stageIn(canvasElement) as HTMLElement;

    await expect(trackCount(stage)).toBe(2);

    // Painted, not just counted: the model's column is the left one, and the name sits above the
    // card to its right. Two tracks alone would pass with the areas swapped.
    const heading = canvas.getByRole('heading', { level: 1 }).getBoundingClientRect();
    const model = (canvasElement.querySelector(`.${styles.model}`) as HTMLElement).getBoundingClientRect();
    const card = (canvasElement.querySelector(`.${styles.card}`) as HTMLElement).getBoundingClientRect();
    await expect(model.right).toBeLessThanOrEqual(heading.left);
    await expect(heading.bottom).toBeLessThanOrEqual(card.top);

    const switches = canvas.getAllByRole('link', { name: 'Switch player, Lauren' });
    await expect(switches).toHaveLength(1);
    await expect(canvas.getByRole('navigation', { name: 'Player' })).toContainElement(switches[0]);
    await expectLabelInName(switches[0]);

    await expect(canvas.getByText('Player 01 / 02')).toBeVisible();
    await expect(canvas.getByText('P 01 / 02')).not.toBeVisible();

    // The bar's rule runs edge to edge, as the comp and the site header both draw it, while its
    // controls sit inside the gutter — so the nav is wider than the row it holds.
    const bar = canvas.getByRole('navigation', { name: 'Player' });
    const row = bar.querySelector<HTMLElement>(`.${styles.barRow}`) as HTMLElement;
    await expect(bar.getBoundingClientRect().width).toBeGreaterThan(row.getBoundingClientRect().width);
  }
};

/**
 * Mobile, at the comp's 375px frame: one column, the switch at the foot, and the interleave.
 *
 * The order is asserted twice, because each check alone can pass while the other is wrong: with
 * `compareDocumentPosition`, which is tree order — the order a screen reader and the Tab key follow
 * — and with geometry, which is the order a sighted reader gets. A CSS reorder moves only the second.
 */
export const Mobile: Story = {
  decorators: [atWidth('23.4375rem')],
  parameters: { design: { type: 'figma', url: `${FIGMA}1-232` } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const stage = stageIn(canvasElement) as HTMLElement;

    await expect(trackCount(stage)).toBe(1);

    // AC: mobile order is name → model → card.
    const heading = canvas.getByRole('heading', { level: 1 });
    const model = canvasElement.querySelector(`.${styles.model}`) as HTMLElement;
    const card = canvasElement.querySelector(`.${styles.card}`) as HTMLElement;
    await expect(follows(heading, model)).toBe(true);
    await expect(follows(model, card)).toBe(true);

    // And painted in that order too — tree order alone would not catch a stray CSS `order:`.
    await expect(heading.getBoundingClientRect().bottom).toBeLessThanOrEqual(model.getBoundingClientRect().top);
    await expect(model.getBoundingClientRect().bottom).toBeLessThanOrEqual(card.getBoundingClientRect().top);

    // One switch control in the tree, and it is the bottom copy rather than the bar's.
    const switches = canvas.getAllByRole('link', { name: 'Switch player, Lauren' });
    await expect(switches).toHaveLength(1);
    await expect(canvas.getByRole('navigation', { name: 'Player' })).not.toContainElement(switches[0]);
    await expectLabelInName(switches[0]);

    await expect(canvas.getByText('P 01 / 02')).toBeVisible();
    await expect(canvas.getByText('Player 01 / 02')).not.toBeVisible();

    // The foot copy is the comp's tall full-width action (52px drawn), not the bar's compact `sm`
    // box, which alone would stand about 33px — under the 44px a thumb wants at the foot of a page.
    await expect(switches[0].getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  }
};

/**
 * The second player: the pager counts to her, the switch points back, and the file-name chip names
 * her own GLB. The comp prints `sam-dance.glb` on both players' layouts; read from the asset, this
 * page cannot show Sam's file.
 */
export const SecondPlayer: Story = {
  args: { player: LAUREN },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent(/^Lauren$/);
    await expect(canvas.getByText('Player 02 / 02')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Switch player, Sam' })).toHaveAttribute('href', '/sam/');
    await expect(canvasElement).toHaveTextContent(/lauren\.glb/i);
    await expect(canvasElement).not.toHaveTextContent(/sam\.glb/i);
  }
};

/**
 * The longest name at the narrowest width: fitted to its column rather than broken mid-word.
 *
 * At display `lg` unfitted, "LAUREN" broke "LAURE / N". 320px is WCAG 1.4.10's reflow width and
 * the narrowest phone, and it is also the width that makes this a regression test in the
 * component-test runner: the tier is fluid on the *viewport*, and the runner's is 414px, where the
 * name fits a 1280px showcase with or without the fit. A 320px showcase leaves the name a column of
 * under 280px, which six unfitted capitals overrun at any viewport from about 383px up — 12px over
 * at the runner's 414.
 */
export const LongName: Story = {
  args: { player: LAUREN },
  decorators: [atWidth('20rem')],
  play: async ({ canvasElement }) => {
    const heading = within(canvasElement).getByRole('heading', { level: 1 });
    const box = heading.getBoundingClientRect();

    // One line — `overflow-wrap: anywhere` would break an overlong word onto a second one.
    await expect(box.height).toBeLessThan(Number.parseFloat(getComputedStyle(heading).lineHeight) * 1.5);

    // And the ink stays inside the column rather than spilling past the gutter.
    const ink = document.createRange();
    ink.selectNodeContents(heading);
    await expect(ink.getBoundingClientRect().width).toBeLessThanOrEqual(box.width + 0.5);
  }
};

/**
 * Draft mode — the Presentation tool, which is where an editor looks at this page.
 *
 * `sanityFetch` stega-encodes every plain string there, blank ones included, and the showcase tests
 * clean copies while rendering the encoded ones. Measured on the encoded name, the fit read
 * "Lauren" as a 17-letter word; tested on the encoded blanks, the eyebrow drew an empty line and
 * the card its lone header band.
 */
export const DraftMode: Story = {
  args: { player: inDraftMode({ ...LAUREN, eyebrow: ' ', level: ' ', stats: [] }) },
  play: async ({ canvasElement }) => {
    const heading = within(canvasElement).getByRole('heading', { level: 1 });

    // Rendered encoded — the payload is what lets the overlay map the name back to its field…
    await expect((heading.textContent ?? '').length).toBeGreaterThan('Lauren'.length);

    // …and fitted clean, as the six letters a reader sees.
    const column = heading.parentElement as HTMLElement;
    await expect(column.style.getPropertyValue('--player-name-length')).toBe('6');

    // A blank eyebrow and a blank level stay blank, payload or not.
    await expect(canvasElement.querySelector(`.${styles.eyebrow}`)).toBeNull();
    await expect(canvasElement.querySelector(`.${styles.card}`)).toBeNull();
  }
};

/**
 * What the site renders today, on the published data: a name, a model, and nothing else.
 *
 * The card is omitted rather than drawn empty — `PlayerCard` with no stats and no level would
 * render a lone header band with nothing beneath it — and the missing eyebrow leaves no element
 * behind rather than an empty one holding space. This is the state every other story's content
 * degrades to, so it is asserted rather than assumed.
 */
export const AsPublished: Story = {
  args: { player: SAM_AS_PUBLISHED },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent(/^Sam$/);
    await expect(canvasElement.querySelector(`.${styles.card}`)).toBeNull();
    await expect(canvasElement.querySelector(`.${styles.eyebrow}`)).toBeNull();
    await expect(canvas.queryByText(/lvl/i)).toBeNull();

    // The page still works without its content: the model and the way back and onward are intact.
    await expect(canvasElement.querySelector(`.${styles.model}`)).not.toBeNull();
    await expect(canvas.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
    await expect(canvas.getByRole('link', { name: 'Switch player, Lauren' })).toHaveAttribute('href', '/lauren/');
  }
};

/**
 * A level with no stats still earns the card — the level is card content, and hiding it because
 * the stat list happens to be empty would drop something an editor deliberately wrote.
 */
export const LevelOnly: Story = {
  args: { player: { ...SAM_AS_PUBLISHED, level: 'Lvl 33' } },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvasElement.querySelector(`.${styles.card}`)).not.toBeNull();
    await expect(canvas.getByText('Lvl 33')).toBeInTheDocument();
  }
};

/**
 * A single-player roster has nowhere to switch to, so neither copy of the control renders — the
 * alternative would be a link to the page the visitor is already on.
 */
export const SinglePlayer: Story = {
  args: { roster: [ROSTER[0]] },
  decorators: [atWidth('80rem')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryAllByRole('link', { name: /switch player/i })).toHaveLength(0);
    await expect(canvas.getByText('Player 01 / 01')).toBeVisible();
  }
};
