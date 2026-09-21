import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, waitFor, within } from 'storybook/test';

import { DUET_BACK, DUET_FRONT, DUET_MIN_ASPECT, DUET_NATURAL_ASPECT } from '@/helpers/duetPlacement';
import mockImage from '@/tools/storybook/mockImage';

import ModelDuet from '.';

/**
 * The two GLBs that ship in `public/`, served by Storybook's `staticDirs`. Real files rather than
 * fixtures: `useGLTF` decodes `EXT_meshopt_compression` and rebinds two `SkinnedMesh`es, and
 * neither of those can be stood in for.
 */
const ALT = 'Sam and Lauren, as 3D characters, dancing together';

/** Portrait, because the stage is 0.84:1 — `mockImage` ranks the pool by how close the shape is. */
const FALLBACK = mockImage({ altText: ALT, height: 762, seed: 'model-duet', width: 640 });

/**
 * `Foundations`, beside `Foundations/Model Viewer`, and for the same reason that one gives.
 *
 * It is the 3D member of the same family as `Foundations/Image` and `Foundations/Video`: handed
 * assets, it renders them, and it wraps no subtree anyone else supplied — which is the question
 * `Surfaces` actually asks. The one wrinkle worth naming is that this component *does* know who is
 * in it: `DUET_FRONT` and `DUET_BACK` name Lauren and Sam specifically. That is a default rather
 * than a dependency — `characters` is a prop, and the component has no idea what a wedding is — so
 * it stays a primitive that happens to ship with the right two people in it.
 */
const meta = {
  title: 'Foundations/Model Duet',
  component: ModelDuet,
  tags: ['autodocs'],
  args: {
    alt: ALT,
    fallbackImage: FALLBACK
  },
  decorators: [
    (Story, context) => {
      const width = (context.parameters.holderWidth as string | undefined) ?? '560px';

      return (
        <div style={{ padding: 'var(--spacing-lg)' }}>
          <div style={{ width }}>
            <Story />
          </div>
        </div>
      );
    }
  ]
} satisfies Meta<typeof ModelDuet>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The wrapper carrying the state attributes. */
const blockOf = (canvasElement: HTMLElement) => canvasElement.querySelector('[data-model-render]') as HTMLElement;

/** The stage — the block's only element child, and the box whose shape the framing depends on. */
const stageOf = (block: HTMLElement) => block.querySelector(':scope > div') as HTMLElement;

/**
 * # What these stories can and cannot assert
 *
 * Headless Chromium — the browser `@storybook/addon-vitest` runs every story in — **does** have
 * WebGL 2.0, through SwiftShader, so a canvas genuinely mounts here and both GLBs genuinely decode.
 * These are not stories that pass by never reaching the thing they claim to test.
 *
 * The consequence to state plainly, because it is the same one `ModelViewer.stories.tsx` documents:
 * **SwiftShader is the software-rasteriser branch.** `useModelCapability` treats an unmasked
 * renderer matching `swiftshader|llvmpipe|software` as the "very slow device" arm, so `mode="auto"`
 * resolves to `fallback` in this browser — correctly, and by design. That is doubly right here,
 * since this scene is two four-megabyte characters rather than one. It also means the automatic
 * path cannot be used to reach the canvas from a story, which is why every canvas story below
 * passes an explicit `mode`. An explicit mode overrides *policy*; it cannot conjure a renderer.
 *
 * What is **not** asserted here is the geometry. Whether the two of them pass through each other is
 * a fact about a 7.21s loop against a 10.21s one, and no single rendered frame can settle it —
 * `tools/helpers/duetPlacement.test.ts` holds the invariants and `yarn duet:measure` recomputes the
 * clearance from the files. What the browser *can* settle, and does below, is layout: that the
 * stage keeps a shape the scene fits in, at a real viewport, with a real layout engine.
 */
export const Default: Story = {
  /*
   * `auto` spelled out rather than reached through the prop's own default.
   *
   * It is the same render either way, and the point is legibility: every other `mode` literal has a
   * story that names it, so leaving this one implicit makes the set look like it has a gap when it
   * does not.
   */
  args: { mode: 'auto' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const block = blockOf(canvasElement);

    /*
     * The contract that holds in every branch: one stage, one accessible name, whatever is inside
     * it. Asserted first because it is the only thing on the thank-you page a reader who cannot see
     * the characters will ever get.
     */
    await expect(canvas.getAllByRole('img', { name: ALT })).toHaveLength(1);

    /*
     * Detection ran and committed to something. Deliberately not asserted as a *particular* value:
     * this story uses `mode="auto"`, so the answer is a property of the machine — `fallback` under
     * SwiftShader here, `animated` on a developer's GPU. Pinning one would make the story pass or
     * fail on where it was run.
     */
    await expect(['animated', 'static', 'fallback']).toContain(block.dataset.modelMode);
    await expect(['canvas', 'image', 'placeholder']).toContain(block.dataset.modelRender);
  }
};

/**
 * Both of them, dancing. The thank-you page's configuration.
 *
 * `mode="animated"` rather than `auto`, because this browser rasterises in software and `auto`
 * correctly refuses to hand it two rigged characters. See the note on `Default`.
 *
 * The assertion that matters is `data-model-loaded`, which is **only** true once *both* characters
 * have reported in — it is the pair-readiness rule from `index.tsx` observed from the outside. A
 * scene that mounted Lauren and silently dropped Sam would satisfy every other check on this page.
 */
export const Animated: Story = {
  args: { mode: 'animated' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const block = blockOf(canvasElement);

    await expect(block.dataset.modelMode).toBe('animated');
    await expect(block.dataset.modelRender).toBe('canvas');

    /*
     * The `<canvas>` assertion belongs **inside** the wait, not before it.
     *
     * `ModelDuetScene` is behind `next/dynamic` with `loading: () => null`, so on the commit that
     * first sets `data-model-render="canvas"` there is no canvas element in the document yet — the
     * chunk carrying `three` is still downloading. Asserted eagerly, this fails on a null that was
     * always going to arrive a moment later.
     *
     * The timeout is generous and honestly so: this decodes two meshopt GLBs and rasterises two
     * skinned characters on the CPU.
     */
    await waitFor(
      async () => {
        await expect(canvasElement.querySelector('canvas')).not.toBeNull();
        // True only once *both* characters have reported in — the pair-readiness rule, observed.
        await expect(block.dataset.modelLoaded).toBe('true');
      },
      { timeout: 25_000 }
    );

    // Still exactly one name, now that the canvas rather than the placeholder is carrying it.
    await expect(canvas.getAllByRole('img', { name: ALT })).toHaveLength(1);
  }
};

/**
 * The reduced-motion render — the canvas mounts, both characters are posed at the first frame of
 * their clip, the mixer never advances and the frame loop goes on demand.
 *
 * Worth having as its own story rather than trusting the branch: this scene is two clips looping
 * forever with no in-page control to stop them, which is exactly the shape WCAG 2.2.2 is about, and
 * "the animation stopped" is not something the animated story can prove by its absence.
 */
export const ReducedMotion: Story = {
  args: { mode: 'static' },
  play: async ({ canvasElement }) => {
    const block = blockOf(canvasElement);

    await expect(block.dataset.modelMode).toBe('static');
    await expect(block.dataset.modelRender).toBe('canvas');

    // Inside the wait for the same reason as `Animated` — the scene chunk is still in flight on the
    // commit that chooses the canvas branch.
    await waitFor(
      async () => {
        await expect(canvasElement.querySelector('canvas')).not.toBeNull();
        await expect(block.dataset.modelLoaded).toBe('true');
      },
      { timeout: 25_000 }
    );
  }
};

/**
 * No WebGL, a software rasteriser, Data Saver, ≤1GB of memory, or a GLB that would not parse.
 *
 * This branch carries more weight than it does on a player card. There the arch is one of several
 * things on a page; here the scene *is* the page, so a device that cannot render it is a device
 * that would otherwise be shown an empty thank-you page.
 */
export const NoWebGl: Story = {
  args: { mode: 'fallback' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const block = blockOf(canvasElement);

    await expect(block.dataset.modelRender).toBe('image');
    // No canvas at all — the 3D chunk is never mounted, so `three` is never evaluated.
    await expect(canvasElement.querySelector('canvas')).toBeNull();
    await expect(canvas.getAllByRole('img', { name: ALT })).toHaveLength(1);
  }
};

/**
 * Nothing to show, and nothing to fall back to — the state the stage is in before anything has
 * loaded, and the one a browser with no WebGL and no fallback image lands in permanently.
 *
 * It renders the **same element** the loading path does: the placeholder is always in the stage,
 * behind everything, and is simply the only thing in it here. What that buys is the page never
 * reflowing — there is nothing to wait for, because the space was never missing.
 */
export const Loading: Story = {
  args: { characters: [], fallbackImage: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const block = blockOf(canvasElement);

    await expect(block.dataset.modelRender).toBe('placeholder');
    await expect(canvasElement.querySelector('canvas')).toBeNull();
    await expect(canvasElement.querySelector('img')).toBeNull();

    // The placeholder carries the name, so the stage is never anonymous.
    await expect(canvas.getAllByRole('img', { name: ALT })).toHaveLength(1);

    // And it occupies its space: a stage with no height would block nothing because it *is* nothing.
    await waitFor(async () => {
      await expect(stageOf(block).getBoundingClientRect().height).toBeGreaterThan(300);
    });
  }
};

/**
 * A 390px phone column — the case the brief was actually worried about.
 *
 * This is the one thing on this page a real layout engine is needed for, and it is why the story
 * asserts a *measured* ratio rather than reading the declared `aspect-ratio` back out of the
 * stylesheet. `max-height: 80svh` and `max-width` can both override the ratio silently, and a
 * stage that quietly went taller than `DUET_MIN_ASPECT` (0.773:1) would crop a hand at the one moment the two loops
 * peak together — which is to say, not on load, and not in a screenshot.
 */
export const Narrow: Story = {
  args: { mode: 'fallback' },
  parameters: { holderWidth: '390px' },
  play: async ({ canvasElement }) => {
    const block = blockOf(canvasElement);

    await waitFor(async () => {
      const { height, width } = stageOf(block).getBoundingClientRect();
      await expect(width).toBeGreaterThan(0);
      await expect(height).toBeGreaterThan(0);

      // Wider is safe, taller is not. See the table in `duetPlacement.ts`.
      await expect(width / height).toBeGreaterThanOrEqual(DUET_MIN_ASPECT);
      // And it is actually at the ratio the scene is designed for, not merely inside the floor.
      await expect(width / height).toBeCloseTo(DUET_NATURAL_ASPECT, 1);
    });
  }
};

/**
 * A different HDRI on the pair.
 *
 * `environmentPreset` is the set of HDRIs the site hosts itself — `studio` and `sunset`, see
 * `ModelLighting` — so with every other story on the `studio` default, this one completes the
 * one-story-per-literal rule. What is this component's to get right is that the prop is *wired
 * through*: it crosses the `next/dynamic` boundary into `ModelDuetScene` and reaches `ModelLighting`.
 *
 * `sunset` is hosted for this story alone — no page asks for it — and it is the one chosen because it
 * is the furthest from `studio` in colour temperature, so a regression that dropped the prop on the
 * floor shows up as a visibly identical render rather than as a subtle one.
 */
export const SunsetLighting: Story = {
  args: { environmentPreset: 'sunset', mode: 'animated' },
  play: async ({ canvasElement }) => {
    const block = blockOf(canvasElement);

    await expect(block.dataset.modelRender).toBe('canvas');
    await waitFor(
      async () => {
        await expect(canvasElement.querySelector('canvas')).not.toBeNull();
        await expect(block.dataset.modelLoaded).toBe('true');
      },
      { timeout: 25_000 }
    );
  }
};

/**
 * The placement itself, surfaced as a story so the arrangement is legible without reading the
 * geometry module — who is where, in metres, and which way each of them is turned.
 *
 * It renders the fallback branch deliberately: the numbers are the subject, and a canvas here would
 * invite reading the arrangement off a SwiftShader render rather than off the measurements.
 */
export const Placement: Story = {
  args: { mode: 'fallback' },
  play: async ({ canvasElement }) => {
    const block = blockOf(canvasElement);
    await expect(block.dataset.modelRender).toBe('image');

    // Sam upstage of Lauren — the whole idea of the arrangement, asserted where it is visible.
    await expect(DUET_BACK.position[2]).toBeLessThan(DUET_FRONT.position[2]);
    // Turned toward each other by equal and opposite amounts.
    await expect(DUET_FRONT.rotationY).toBeCloseTo(-DUET_BACK.rotationY, 10);
  }
};
