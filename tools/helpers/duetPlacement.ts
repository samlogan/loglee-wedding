/*=============================================>>>>>
= The duet's geometry =
===============================================>>>>>*/

/*
 * Where the two characters stand, and why each number is the number.
 *
 * In `tools/helpers` rather than beside `components/ModelDuet`, for the same reason `modelClips.ts`
 * is: the `unit` vitest project only collects `tools/**` and `config/**`, so anything under
 * `components/` can be asserted only through a story that needs a GPU. "The dancers do not pass
 * through each other" is a fact about six numbers and two animation clips, and nothing about it
 * needs a renderer to be true.
 *
 * Re-measure with `yarn duet:measure` after touching any number here — it decodes the GLBs and
 * recomputes the clearance table below from the files themselves.
 *
 * ## What was measured
 *
 * Everything below was read off the GLBs themselves — the animation tracks decoded, the skeleton
 * walked per frame, the swept volume of every bone accumulated over a whole clip cycle. Not
 * estimated from the bind pose, which is the thing that would be wrong: `restpose` has both figures
 * standing still with their arms down, and the question here is what they occupy at full extension
 * halfway through a dance.
 *
 *   Lauren  1.646m tall (`mixamorig:HeadTop_End` at rest), 0.353m across the shoulders
 *   Sam     1.783m tall,                                   0.407m across the shoulders
 *
 * Swept extent per clip, measured from each character's own mark, with the root's X and Z pinned to
 * zero exactly as `groundClips` does at runtime — so these are the extents that actually render,
 * not the extents in the file:
 *
 *   Lauren  Crystal_Beads    ±0.653m lateral   ±0.601m deep   head peaks at 1.835m   6.25s
 *   Sam     Gangnam_Groove   ±0.663m lateral   ±0.671m deep   head peaks at 2.247m  10.21s
 *
 * Sam's 2.247m is the clip jumping, and it is the single number that sets the top of the frame.
 * Read it as 0.46m of air above his standing height, not as a headroom allowance that can be
 * trimmed — the peak is an apex the sampling has to be fine enough to catch, not a transient.
 *
 * ## Why depth rather than width
 *
 * Treated as two cylinders, clearing those radii side by side needs 0.653 + 0.663 = 1.316m between
 * the marks. At this camera that is about 2.6m of frame, which is a phone-hostile 1.6:1 landscape
 * block for something that has to sit in a portrait column.
 *
 * Depth buys the same separation for a fraction of the *screen* width, because the axis it spends
 * it on is the one the camera is looking down. Hence the brief's "Sam two to three feet behind":
 * pushing him back 0.91m (3ft) converts most of the required distance into an axis that costs
 * almost no horizontal room, and the perspective divide shrinks what is left.
 *
 * ## Why 0.80m of lateral offset and not less
 *
 * The cylinder model is an upper bound and a bad one — it assumes both characters reach their
 * furthest point, in each other's direction, at the same instant. What matters is the real minimum
 * distance between the two swept skeletons across *every* phase combination of the two loops, and
 * the loops are 6.25s and 10.21s, so over a few minutes every combination does occur.
 *
 * Measured that way, bone-to-bone, with Sam 0.91m back:
 *
 *   lateral 0.50m   0.163m      lateral 0.70m   0.279m
 *   lateral 0.60m   0.227m      lateral 0.80m   0.333m
 *
 * Mesh thickness is roughly 0.08m of skin around a bone on each of them, so about 0.16m of that
 * figure is not air. 0.50m lateral leaves near-zero clearance — hands would graze — and 0.80m
 * leaves 0.333m, about 0.17m of genuine gap at the very worst alignment the two loops can reach.
 * That is the number this is set to.
 *
 * ## Why they are turned inward
 *
 * `ROTATION` turns each of them about 8.6° toward the other. It reads as two people dancing
 * together rather than two people dancing near each other, and it is free: turning their swing
 * planes inward moves the *arms* off the line between the marks, and the measured worst case
 * improves from 0.333m to 0.395m. The clearance figures above are the flat-on ones, so the shipped
 * arrangement is the more forgiving of the two.
 *
 * ## Why the pair is shifted right
 *
 * Sam is further from the camera, so his lateral offset is compressed by the perspective divide
 * while Lauren's is not: at equal and opposite marks she lands visibly further from centre than he
 * does, and the pair reads as sitting left of the frame. `GROUP_OFFSET_X` recentres the two of them
 * optically rather than arithmetically — it is the shift that minimises the larger of the two
 * horizontal half-angles, solved numerically against the projected swept volume.
 */

/**
 * What each clip actually sweeps, measured from the character's own mark.
 *
 * Exported because two other things need the same numbers and must not re-type them: the invariant
 * test next to this file, and `tools/3d/measure-duet.ts`, which recomputes them from the GLBs. A
 * mismatch between these and the script's output means the files changed underneath the geometry.
 *
 * `lateral` and `deep` are half-extents — the figure reaches that far either side of its mark.
 * `peak` is the highest point on the skeleton, which is what sets the top of the frame.
 */
export interface ClipExtent {
  lateral: number;
  deep: number;
  peak: number;
}

export const DUET_CLIP_EXTENTS: Record<string, ClipExtent> = {
  Crystal_Beads: { deep: 0.601, lateral: 0.653, peak: 1.835 },
  Gangnam_Groove: { deep: 0.671, lateral: 0.663, peak: 2.247 }
};

/**
 * The worst-case bone-to-bone gap at the placement below, measured across every phase combination
 * of the two loops — they are 6.25s and 10.21s and out of phase, so all of them do occur.
 *
 * About 0.16m of this is mesh rather than air (roughly 0.08m of skin around a bone on each of
 * them), so the real clearance at the tightest moment is around 0.24m.
 */
export const DUET_MEASURED_CLEARANCE = 0.395;

/** Below this the meshes touch. Mesh thickness plus a little, and the floor the test asserts. */
export const DUET_CLEARANCE_FLOOR = 0.2;

/** One character's placement. Metres and radians, in the scene's own space. */
export interface DuetPlacement {
  /** The GLB. A file under `public/`, since these two characters are the scene rather than content. */
  src: string;
  /** The clip that loops. Named as the file spells it — see `@/helpers/modelClips`. */
  clip: string;
  /** `[x, y, z]`. Negative Z is away from the camera. */
  position: [number, number, number];
  /** Yaw in radians. Negative turns toward +X, which is why the two signs differ. */
  rotationY: number;
}

/** 8.6°, the inward turn. One value, applied with opposite signs, so the pair stays symmetric. */
const ROTATION = 0.15;

/**
 * The optical recentring. See the note above — Sam's offset is foreshortened and Lauren's is not,
 * so equal and opposite marks do not read as centred.
 */
const GROUP_OFFSET_X = 0.1;

/** Half the lateral gap between the marks. The full gap is 0.80m; see the clearance table above. */
const HALF_LATERAL = 0.4;

/** 0.91m — three feet, the far end of the brief's range and the one the clearance figures assume. */
const DEPTH = 0.91;

/** Lauren, downstage. The figure the framing is built around. */
export const DUET_FRONT: DuetPlacement = {
  clip: 'Crystal_Beads',
  position: [-HALF_LATERAL + GROUP_OFFSET_X, 0, 0],
  rotationY: -ROTATION,
  src: '/lauren.glb'
};

/** Sam, three feet upstage. Renders at 0.85× for the depth alone, before any scaling. */
export const DUET_BACK: DuetPlacement = {
  clip: 'Gangnam_Groove',
  position: [HALF_LATERAL + GROUP_OFFSET_X, 0, -DEPTH],
  rotationY: ROTATION,
  src: '/sam.glb'
};

/**
 * The camera.
 *
 * `fov` is 32 to match `ModelViewer`'s, which was settled in the model harness against these same
 * two characters — keeping it means the two surfaces render the same people at the same lens, and
 * a character does not subtly change shape between the player page and this one.
 *
 * Level, at 1.0m, and 4.1m back: the position at which the pair's two vertical extremes meet the
 * frame together. The bottom one is Lauren's feet, the nearer figure. The top one is Sam's
 * 2.247m jump, which is 0.91m further back and so subtends less than its height suggests. Solving
 * `h / d = (2.247 − h) / (d + 0.91)` gives `h ≈ 1.0` at any distance near this. At 4.1m the swept pair
 * fills about 87% of the frame's height (`yarn duet:measure` prints the exact figure), where the
 * first framing stood 5m back and filled 72%. The client asked for the characters to fill more of
 * the canvas; the old headroom went on the rare moment Sam's jump peaks.
 */
export const DUET_CAMERA = { fov: 32, position: [0, 1, 4.1] as const };

/**
 * What the camera looks at: straight ahead at the camera's own height, so the frame is level and
 * the half-angles above and below are the same. See `DUET_CAMERA` for why 1.0.
 */
export const DUET_TARGET: [number, number, number] = [0, 1, 0];

/*
 * The two aspect ratios, and which way the danger runs.
 *
 * Both measured rather than chosen: the swept volume of both characters was projected through the
 * camera above and the resulting half-angles compared against the frustum's.
 *
 * The asymmetry is the thing to hold on to, because it is the opposite of the intuition. A
 * three.js `fov` is **vertical**, and it does not change with the canvas's shape — so the visible
 * world *height* is a constant 2.35m at the front mark whatever the container does, and the content
 * uses 90% of it. Vertical fit is therefore not a constraint at all. The visible world *width* is that
 * height times the aspect, so width is the only thing a container shape can take away.
 *
 *   below 0.83   crops a hand at the moment both dancers are at full lateral extension
 *   0.83         the pair exactly fits the frame's width
 *   0.92         the pair fills the frame both ways, the shape the stage is drawn at
 *   wider        fits, with air to spare at the sides
 *
 * Both figures are printed by `yarn duet:measure`, which is also what checks them against the two
 * constants below. They moved when the camera came in from 5m to 4.1m: a closer camera makes the pair
 * larger in both axes, so the floor rose from 0.68 and the natural shape from 0.94.
 *
 * So **wider is always safe and taller is not**, which is worth stating because a portrait-column
 * layout drifts naturally toward the dangerous end. A container one percent below the floor does
 * not fail visibly on load either: the loops are 6.25s and 10.21s and out of phase, so it looks
 * correct for a minute and then clips a hand at the one moment they are both at full extension.
 */

/** Where the pair exactly fills the frame in both axes. The framing this scene is designed at. */
export const DUET_NATURAL_ASPECT = 0.918;

/** The floor. Below this the sides crop; see the list above. */
export const DUET_MIN_ASPECT = 0.829;

/**
 * The contact-shadow plane.
 *
 * **At the origin, and it has to be.** It used to sit between the two marks, at
 * `[GROUP_OFFSET_X, 0, -DEPTH / 2]`, and drei's `ContactShadows` does not survive being moved: the
 * shadow it bakes is displaced by twice the plane's offset. Seen from above, a plane centred at
 * z −0.455 put the whole pool about 0.9m in front of Lauren, clear of both pairs of feet. From the
 * scene's camera that reads as two characters floating over a shadow on the floor in front of them.
 * At the origin each shadow lands under its own dancer. `ModelViewer` never showed the fault, because
 * its one character always stands at the origin.
 *
 * Sized to cover both swept footprints from the origin with margin for the blur, which needs room
 * outside the geometry or the shadow is cut off square. The test checks that margin for each mark.
 */
export const DUET_SHADOW = {
  position: [0, 0, 0] as [number, number, number],
  scale: 5
};
