import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import mockImage from '@/tools/storybook/mockImage';

import ModelViewer from '.';

/**
 * The GLB that ships in `public/`, served by Storybook's `staticDirs`. A real file rather than a
 * fixture: `useGLTF` decodes `EXT_meshopt_compression` and rebinds a `SkinnedMesh`, and neither of
 * those can be stood in for.
 */
const SRC = '/sam.glb';

/**
 * The clip names **as they actually appear inside `public/sam.glb`**, read out of the file's glTF
 * JSON chunk. Meshy names each clip after its source animation, which is why they look like this
 * and why `player.clips` pre-fills nothing — the names differ per character, so there is no shared
 * list worth defaulting.
 */
const CLIPS = { idle: 'Excited_Walk_M', hover: 'Agree_Gesture', feature: 'Gangnam_Groove' };

const ALT = 'Sam, as a 3D character, dancing on the spot';

/**
 * Portrait, because the arch is 0.53:1 — `mockImage` ranks the pool by how close the shape is.
 *
 * Today this renders as the grey block, and that is the dataset rather than this story: the
 * committed fixtures (`faqSection.json`, `globals.json`) contain no image assets at all, so the
 * pool `mockImage` draws from is empty and it warns about it on every load. The `<img>`, its `alt`
 * and the branch are all real — only the picture is missing, and it fills in the moment there is a
 * published image for `yarn storybook:fixtures` to find.
 */
const FALLBACK = mockImage({ altText: ALT, height: 374, seed: 'model-viewer-sam', width: 200 });

/**
 * `Foundations`, not `Surfaces`, and the deciding argument is consistency rather than taxonomy for
 * its own sake.
 *
 * This is the 3D member of the same family as `Foundations/Image` and `Foundations/Video`: it is
 * handed an asset and renders it, it owns no content, and nothing in it knows about players or
 * weddings — `restClip` names a *role*, not a page. `Surfaces` asks "does it present or disclose
 * **other content**", which is the question `Card`, `Accordion` and `PlayerCard` answer yes to
 * because they wrap a subtree someone else supplied. This one wraps nothing; it *is* the picture.
 *
 * Filing it beside the other two media primitives also keeps the one useful property of the group:
 * if you want to know how this project renders a thing, every kind of thing is in one place.
 */
const meta = {
  title: 'Foundations/Model Viewer',
  component: ModelViewer,
  tags: ['autodocs'],
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/design/KxvsJuCNaG4n2QVp3iD4jd/Wedding?node-id=1-162'
    }
  },
  args: {
    alt: ALT,
    clips: CLIPS,
    fallbackImage: FALLBACK,
    src: SRC
  },
  decorators: [
    /*
     * 520px is the panel's width in the desktop comp (node 1:162), and it has to be a `px` harness
     * for the same reason `PlayerCard`'s does: the rules under test are container queries against
     * that width. A `rem` wrapper would make every measurement depend on the root font size as
     * well as on the rule, and a change to either would be indistinguishable from the other.
     *
     * `parameters.forceTheme` pins a theme *in the first render*, rather than through
     * `globals: { theme: 'dark' }`. `PlayerCard.stories.tsx` documents the measurement behind that
     * at length — a story-level globals override landed on this project's canvas 5.2 seconds after
     * mount, which no `waitFor` can be made to win reliably.
     */
    (Story, context) => {
      const forced = context.parameters.forceTheme as 'dark' | 'light' | undefined;

      return (
        <div
          data-theme={forced}
          style={{ padding: 'var(--spacing-lg)', backgroundColor: forced ? 'var(--bg-default)' : undefined }}
        >
          <div style={{ width: '520px' }}>
            <Story />
          </div>
        </div>
      );
    }
  ]
} satisfies Meta<typeof ModelViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The panel — found through its state attribute rather than by walking down from the canvas. */
const panelOf = (canvasElement: HTMLElement) => canvasElement.querySelector('[data-model-render]') as HTMLElement;

/**
 * The arch. The panel's only element child that is a `div` — its chrome is `<span>`s, so this does
 * not move when a label or a readout is added or removed.
 */
const stageOf = (panel: HTMLElement) => panel.querySelector(':scope > div') as HTMLElement;

/**
 * # What these stories can and cannot assert
 *
 * Headless Chromium — the browser `@storybook/addon-vitest` runs every story in — **does** have
 * WebGL 2.0, through SwiftShader. Probed on this machine it reports
 * `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device …))`. So a canvas genuinely mounts here and the
 * GLB genuinely decodes; these are not stories that pass by never getting as far as the thing they
 * claim to test.
 *
 * Two consequences are worth stating plainly rather than leaving to be discovered.
 *
 * **SwiftShader is the software-rasteriser branch.** `useModelCapability` treats an unmasked
 * renderer matching `swiftshader|llvmpipe|software` as the "very slow device" arm of the brief, so
 * `mode="auto"` resolves to `fallback` in this browser — correctly, and by design. It also means
 * the automatic path cannot be used to reach the canvas from a story, which is why every canvas
 * story below passes an explicit `mode`. An explicit mode overrides *policy*; it cannot conjure a
 * renderer, so these would still degrade rather than crash on a browser with no WebGL at all.
 *
 * **No story here proves "WebGL is absent".** There is no way to remove WebGL from inside a story,
 * so `NoWebGl` pins the *branch* the detector selects, not the detection. The detection itself is
 * unit-testable only in the sense that `Default` proves it ran and produced a decision. The clip
 * degradation that the acceptance criteria call out *is* pinned deterministically, and without a
 * GPU — in `tools/helpers/modelClips.test.ts`, which runs in the `unit` project in milliseconds.
 *
 * **A forced `animated` still yields to `prefers-reduced-motion`**, so the four stories below that
 * pass it resolve to `static` on a machine asking for reduced motion — and their `data-model-mode`
 * and `data-model-clip` assertions would fail there. That does not make `yarn test` machine-
 * dependent: Playwright's browser context emulates `reducedMotion: 'no-preference'` by default,
 * regardless of the host OS, so the runner always takes the animated branch. It is only visible to
 * a developer browsing `yarn storybook` with the OS switch on — where seeing the posed render is
 * the correct answer, not a broken story.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = panelOf(canvasElement);

    /*
     * The contract that holds in every branch: one arch, one accessible name, whatever is inside
     * it. Asserted first because it is the only thing on this page a reader who cannot see the
     * character will ever get.
     */
    await expect(canvas.getAllByRole('img', { name: ALT })).toHaveLength(1);

    /*
     * Detection ran and committed to something. Deliberately not asserted as a *particular* value:
     * this story uses `mode="auto"`, so the answer is a property of the machine — `fallback` under
     * SwiftShader here, `animated` on a developer's GPU, `static` if they have reduced motion on.
     * Pinning one of those would make the story pass or fail on where it was run.
     */
    await expect(['animated', 'static', 'fallback']).toContain(panel.dataset.modelMode);
    await expect(['canvas', 'image', 'placeholder']).toContain(panel.dataset.modelRender);
  }
};

/**
 * Nothing to show yet — the state the panel is in before anything has loaded, and the state a
 * player document is in before a GLB has been uploaded to it.
 *
 * `player.model` is optional in the schema, so "no `src`" is a real published state rather than a
 * contrivance, and it renders the **same element** the loading path does: the placeholder is always
 * in the arch, behind everything, and is simply the only thing in it here.
 *
 * What that buys is the acceptance criterion about page content: there is nothing to wait for,
 * because the space was never missing. This story is the proof — the panel has its full size and
 * its surface with no canvas in the document at all.
 */
export const Loading: Story = {
  args: { fallbackImage: undefined, src: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = panelOf(canvasElement);

    await expect(panel.dataset.modelRender).toBe('placeholder');
    // No canvas, and no `three` in the document — the chunk is never even requested.
    await expect(canvasElement.querySelector('canvas')).toBeNull();
    await expect(canvasElement.querySelector('img')).toBeNull();

    // The placeholder itself carries the name, so the arch is never anonymous.
    const named = canvas.getAllByRole('img', { name: ALT });
    await expect(named).toHaveLength(1);

    // And it occupies its space: a panel with no height would block nothing because it *is* nothing.
    await waitFor(async () => {
      await expect(panel.getBoundingClientRect().height).toBeGreaterThan(400);
    });
  }
};

/**
 * The full render — canvas, clips playing, gentle orbit. The player page's configuration.
 *
 * `mode="animated"` rather than `auto`, because this browser rasterises in software and `auto`
 * correctly refuses to hand it a 4MB rigged character (see the note on `Default`).
 *
 * The assertion that matters is `data-model-clip`: it is written from the value `resolveModelClip`
 * returned *after* `useAnimations` built its action map, so it proves the whole chain — the GLB
 * decoded, `SkeletonUtils.clone` produced something with the clips still attached, and the authored
 * `feature` name matched one of them. A model that cloned with `scene.clone(true)` would reach this
 * point too, but `data-model-loaded` would be the only thing true about it.
 */
export const Loaded: Story = {
  args: { mode: 'animated', orbit: true, restClip: 'feature' },
  play: async ({ canvasElement }) => {
    const panel = panelOf(canvasElement);

    await expect(panel.dataset.modelMode).toBe('animated');
    await expect(panel.dataset.modelRender).toBe('canvas');

    // Generous, and honestly so: this decodes a 4MB meshopt GLB and rasterises it on the CPU.
    await waitFor(
      async () => {
        await expect(canvasElement.querySelector('canvas')).not.toBeNull();
        await expect(panel.dataset.modelLoaded).toBe('true');
        await expect(panel.dataset.modelClip).toBe(CLIPS.feature);
      },
      { timeout: 25_000 }
    );
  }
};

/**
 * `prefers-reduced-motion: reduce` — the first of the three required fallbacks.
 *
 * The canvas still mounts; what stops is playback. `ModelCharacter` plays the rest action, sets
 * `time = 0`, sets `paused`, and samples the skeleton once with `mixer.update(0)`; the canvas drops
 * to `frameloop="demand"` so no `requestAnimationFrame` loop is held open to redraw an identical
 * frame. The reader gets the character, posed, and no motion at all.
 *
 * **`mode="static"`, not a forced media query, and the distinction is not cosmetic.** A story
 * cannot change `prefers-reduced-motion` — that is a browser-launch setting — so what is pinned
 * here is the branch, not the detection that selects it. The detection is a one-line `matchMedia`
 * subscription in `useModelCapability`; the branch is the part with behaviour worth asserting.
 */
export const ReducedMotion: Story = {
  args: { mode: 'static', restClip: 'feature' },
  play: async ({ canvasElement }) => {
    const panel = panelOf(canvasElement);

    await expect(panel.dataset.modelMode).toBe('static');
    await expect(panel.dataset.modelRender).toBe('canvas');

    await waitFor(
      async () => {
        await expect(canvasElement.querySelector('canvas')).not.toBeNull();
        // Posed, not playing — but posed from the same clip the animated story loops.
        await expect(panel.dataset.modelClip).toBe(CLIPS.feature);
      },
      { timeout: 25_000 }
    );
  }
};

/**
 * No WebGL, or a device too slow to be given a rigged character — the second required fallback.
 *
 * Both resolve to the same branch, which is why there is one story: the player's fallback image
 * replaces the canvas entirely, and the `<img>` carries the alternative the canvas would have.
 *
 * **What this does *not* assert.** WebGL cannot be removed from inside a story, so this pins the
 * branch rather than the detector. The nearest thing to a real proof is `Default`, which runs the
 * genuine detector in this browser and — because SwiftShader is a software rasteriser — arrives
 * here on its own.
 */
export const NoWebGl: Story = {
  args: { mode: 'fallback' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = panelOf(canvasElement);

    await expect(panel.dataset.modelRender).toBe('image');
    await expect(canvasElement.querySelector('canvas')).toBeNull();

    // One name, on the image this time rather than on the arch — the same assertion as every other
    // branch, which is the point of writing it the same way.
    await expect(canvas.getAllByRole('img', { name: ALT })).toHaveLength(1);
  }
};

/**
 * The fallback's own fallback: no WebGL **and** no fallback image authored.
 *
 * `fallbackImage` is optional in the schema, and `components/Image` returns `null` for an asset
 * with no URL — so choosing the image branch here would leave the arch holding nothing and
 * answering to no name. The placeholder is the honest render, and it keeps the accessible name.
 */
export const NoFallbackImage: Story = {
  args: { fallbackImage: undefined, mode: 'fallback' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = panelOf(canvasElement);

    await expect(panel.dataset.modelRender).toBe('placeholder');
    await expect(canvas.getAllByRole('img', { name: ALT })).toHaveLength(1);
  }
};

/**
 * An authored clip name that is not in the file — the acceptance criterion about degradation.
 *
 * This is the dangerous shape, not the obvious one. `clips.feature` is *filled in*, so nothing in
 * the Studio looks wrong; the name is simply not one of the seven the GLB contains, which is what a
 * typo looks like, and what re-exporting a model with renamed clips does to every player at once.
 *
 * The viewer falls back to the idle clip rather than throwing, and `data-model-clip` reports which
 * one actually ran. The same rule is pinned exhaustively and without a GPU in
 * `tools/helpers/modelClips.test.ts` — this story is the end-to-end half of that pair, proving the
 * resolved name reaches a real `AnimationAction`.
 */
export const MissingClip: Story = {
  args: {
    clips: { ...CLIPS, feature: 'Dance Loop' },
    mode: 'animated',
    restClip: 'feature'
  },
  play: async ({ canvasElement }) => {
    const panel = panelOf(canvasElement);

    await waitFor(
      async () => {
        await expect(panel.dataset.modelLoaded).toBe('true');
        // Not `feature`, and not nothing.
        await expect(panel.dataset.modelClip).toBe(CLIPS.idle);
      },
      { timeout: 25_000 }
    );
  }
};

/**
 * Hover or tap — the clip that plays once and returns.
 *
 * `hover` is the one clip role that interrupts rather than replaces: `ModelCharacter` crossfades
 * into it with `LoopOnce` and `clampWhenFinished`, listens for the mixer's `finished` event, and
 * crossfades back. Both directions are asserted here, which is the whole of "plays once, returns to
 * idle" — a one-shot that never returns looks identical for its first second.
 *
 * **The hover clip is `Running` rather than the plausible `Agree_Gesture`, and only because of its
 * length.** `Agree_Gesture` runs 13.08s in this file; a story that waits for it to finish would add
 * fourteen seconds to every `yarn test`. `Running` is 0.71s and exercises exactly the same code
 * path. The choreography is MAM-1901's decision; the mechanism is this story's.
 *
 * Note the trigger is the arch, not the model — pointer events are taken on the DOM element rather
 * than by raycasting a `SkinnedMesh` on every pointer move, which would cost a skinned intersection
 * test per frame to answer a question the card already knows the answer to.
 */
export const Interactive: Story = {
  args: {
    clips: { ...CLIPS, hover: 'Running' },
    interactive: true,
    mode: 'animated',
    restClip: 'idle'
  },
  play: async ({ canvasElement }) => {
    const panel = panelOf(canvasElement);

    await waitFor(
      async () => {
        await expect(panel.dataset.modelClip).toBe(CLIPS.idle);
      },
      { timeout: 25_000 }
    );

    await userEvent.hover(stageOf(panel));

    await waitFor(
      async () => {
        await expect(panel.dataset.modelClip).toBe('Running');
      },
      { timeout: 5000 }
    );

    // And back, unprompted, once the clip reaches its end.
    await waitFor(
      async () => {
        await expect(panel.dataset.modelClip).toBe(CLIPS.idle);
      },
      { timeout: 15_000 }
    );
  }
};

/**
 * The panel chrome from the comp — the corner label (node 1:166), the file chip over the arch
 * (1:164) and the bottom-right readout (1:167).
 *
 * All three are props with no defaults, so a caller that says nothing gets none of them. That is
 * deliberate: MAM-1901 flags them as "confirm whether they ship", which is the player route's
 * decision to make, and a component that baked them in would have made it already.
 */
export const PanelChrome: Story = {
  args: {
    badge: 'sam-dance.glb',
    label: '3D canvas (react three fiber) · dance loop',
    mode: 'fallback',
    readout: 'BPM 118'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    /*
     * Matched case-insensitively because the stylesheet uppercases the label and the readout, and
     * Chromium computes a name from *rendered* text — so the authored sentence case is not what is
     * in the tree. The chip is not uppercased: it prints a file name, which is the one string here
     * that has to survive verbatim.
     */
    await expect(canvas.getByText(/3D CANVAS \(REACT THREE FIBER\)/i)).toBeVisible();
    await expect(canvas.getByText('sam-dance.glb')).toBeVisible();
    await expect(canvas.getByText(/BPM 118/i)).toBeVisible();
  }
};

/**
 * The panel on the dark theme, where the surround's tokens are the whole point.
 *
 * Every colour in the stylesheet is a `[data-theme]` custom property — there is no hex anywhere in
 * it — which means a token that fails to resolve does not fall back to something wrong, it makes
 * the whole declaration invalid at computed-value time and the property disappears. A dashed border
 * that reports `none` and a missing panel fill are the same symptom, so both are checked.
 *
 * Shown with the placeholder rather than the fallback image, because the surround is the subject:
 * an image filling the arch would hide the one surface the dark theme changes.
 *
 * Themed through `parameters.forceTheme`; the decorator at the top of this file explains why a
 * `globals` override cannot be waited on.
 */
export const DarkTheme: Story = {
  args: { fallbackImage: undefined, mode: 'fallback' },
  parameters: { forceTheme: 'dark' },
  play: async ({ canvasElement }) => {
    const panel = panelOf(canvasElement);
    const surface = panel.closest('[data-theme]') as HTMLElement;

    // Synchronous, because the decorator put it there in the first render.
    await expect(surface.dataset.theme).toBe('dark');

    await waitFor(async () => {
      const frame = getComputedStyle(panel);
      // The stroke resolved at all — `1px dashed var(--fg-accent)` reports `none` if it did not.
      await expect(frame.borderTopStyle).toBe('dashed');
      // And the panel is a different surface from the page it sits on, which is what `--bg-accent`
      // is for. Stated as a relationship so it holds on either theme.
      await expect(frame.backgroundColor).not.toBe(getComputedStyle(surface).backgroundColor);
    });
  }
};

/**
 * Two viewers side by side — the select screen, and the one configuration that catches the
 * environment-map trap.
 *
 * Each `<Canvas>` is its own `WebGLRenderer`, and a PMREM belongs to the context that built it. The
 * failure mode this story exists for is silent: drei's `<Environment preset>` renders
 * `EnvironmentCube`, which disposes the *globally cached source texture* on unmount, so the first
 * of two panels to go takes the second's lighting with it and leaves it black — no error, no
 * warning. `ModelLighting` loads the texture and passes it in as `map` instead, which routes
 * through `EnvironmentMap` and disposes nothing.
 *
 * It is also the story that proves `SkeletonUtils.clone` is doing its job in the way that matters:
 * two characters from one cached `scene`, each with its own skeleton. A `scene.clone(true)` would
 * leave both bound to the same bones and both frozen in the bind pose — with, again, nothing
 * printed anywhere.
 *
 * Asserted as "two canvases, both loaded, both playing a clip". What cannot be asserted from here
 * is the *picture*: reading pixels back off a SwiftShader canvas to prove one of them is not black
 * is a visual-regression job, and `/review-design` owns it.
 */
export const SelectPair: Story = {
  args: { mode: 'animated', restClip: 'idle' },
  decorators: [
    (Story) => (
      <div style={{ display: 'grid', gap: 'var(--spacing-lg)', gridTemplateColumns: '1fr 1fr' }}>
        <Story />
        <Story />
      </div>
    )
  ],
  play: async ({ canvasElement }) => {
    const panels = [...canvasElement.querySelectorAll<HTMLElement>('[data-model-render]')];
    await expect(panels).toHaveLength(2);

    await waitFor(
      async () => {
        await expect(canvasElement.querySelectorAll('canvas')).toHaveLength(2);
        for (const panel of panels) {
          await expect(panel.dataset.modelLoaded).toBe('true');
          await expect(panel.dataset.modelClip).toBe(CLIPS.idle);
        }
      },
      { timeout: 30_000 }
    );
  }
};

/**
 * `backdrop={false}` — no arch behind the character, as the RSVP rail uses it. The stage keeps its
 * size; only the fill and the loading hatch go.
 */
export const WithoutBackdrop: Story = {
  args: { backdrop: false },
  play: async ({ canvasElement }) => {
    const stage = canvasElement.querySelector('[class*="stage"]') as HTMLElement;
    const placeholder = canvasElement.querySelector('[class*="placeholder"]') as HTMLElement;

    await expect(getComputedStyle(stage).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    await expect(getComputedStyle(placeholder).opacity).toBe('0');
    // Still named, whichever element is on show.
    await expect(within(canvasElement).getByRole('img', { name: ALT })).toBeInTheDocument();
  }
};
