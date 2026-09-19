'use client';

import { useAnimations, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AnimationMixer, LoopOnce, LoopRepeat, PropertyBinding, Vector3 } from 'three';
import type { AnimationAction, AnimationClip, Bone, Mesh, MeshStandardMaterial, Object3D, SkinnedMesh } from 'three';
import { SkeletonUtils } from 'three-stdlib';

import { matchModelClip, resolveModelClip } from '@/helpers/modelClips';
import type { ModelClipNames, ModelRestRole } from '@/helpers/modelClips';

/** Seconds of crossfade between two clips. Long enough to read as a transition, short enough not to drift. */
const FADE = 0.35;

export interface ModelCharacterProps {
  /** The GLB URL — a Sanity file asset in production, a file under `public/` in Storybook. */
  src: string;
  /** The authored clip names. Every one of the three may be absent or wrong; see `@/helpers/modelClips`. */
  clips?: ModelClipNames | null;
  /** Which role loops at rest — `idle` on the select screen, `feature` on a player page. */
  restClip: ModelRestRole;
  /** `false` under reduced motion: the rest clip is posed at its first frame and never advanced. */
  animate: boolean;
  /**
   * Increment to play the hover clip once.
   *
   * A counter rather than a boolean because the interesting event is *another* hover, not a change
   * of state: a counter re-arms itself, where a boolean has to be flipped back — by whom, and on
   * what event? — before it could fire a second time. `0` is the initial value and never plays, so
   * the first render is not a hover.
   *
   * A repeat hover *during* the playthrough is still swallowed, deliberately, by the
   * `action === current.current` guard on the one-shot effect below; restarting the clip mid-play
   * reads as a jitter. That same guard is what makes a touch tap benign, where `pointerenter` and
   * `pointerdown` both fire and bump this by two.
   */
  hoverSignal: number;
  /**
   * The clip now holding the skeleton, whenever that changes — and `undefined` when none resolved.
   *
   * Its **first** call is also "the clone is in the scene": nothing can be playing before the model
   * exists, so a separate `onReady` would fire on the same commit and carry no extra information.
   * The shell treats the first call as loaded and mirrors the name onto `data-model-clip`, which is
   * what makes the hover one-shot and the missing-clip degradation observable from a story without
   * reading pixels back off the canvas.
   */
  onClip?: (clip?: string) => void;
  /**
   * Where the character stands, in metres, as `[x, y, z]`. Defaults to the world origin.
   *
   * Applied to a wrapping `<group>` rather than to the `<primitive>` itself, so the clone's own
   * transform stays at identity. That matters because `groundClips` reasons about the root bone's
   * translation track in the character's *own* space: pinning X and Z to zero keeps a travelling
   * clip on its mark, and a mark moved by mutating the model would make "zero" mean two different
   * places depending on where the character was standing.
   */
  position?: [number, number, number];
  /**
   * Yaw, in radians, applied about the character's own vertical axis.
   *
   * Turns the figure on the spot without moving its mark, which is what lets two characters face
   * slightly inward without either of them drifting off the position they were measured at.
   */
  rotationY?: number;
}

/** Hoisted so the default is one array rather than a fresh one per render for R3F to diff. */
const ORIGIN: [number, number, number] = [0, 0, 0];

/**
 * Play `next`, fading `previous` out under it.
 *
 * `crossFadeFrom` rather than a hard cut, per the brief. Both actions must be *playing* for the
 * fade to have anything to interpolate — `crossFadeFrom` only schedules the two weight ramps, it
 * does not start anything — which is why `next.reset().play()` comes first and why the outgoing
 * action is left running rather than stopped.
 *
 * `warp` is on, so the outgoing clip's playback rate is bent towards the incoming one over the
 * fade. Without it two clips of different length visibly fight for the same skeleton.
 */
const crossFade = (next: AnimationAction, previous: AnimationAction | null) => {
  next.reset().play();
  if (previous && previous !== next) {
    next.crossFadeFrom(previous, FADE, true);
  }
};

/** How many poses across a clip `clipFloor` samples. Enough to catch a crouch; one-off cost per model. */
const FLOOR_SAMPLES = 24;

const scratch = new Vector3();

/** The height of the lowest bone in the object's current pose, in world units. */
const lowestBoneY = (object: Object3D) => {
  let lowest = Number.POSITIVE_INFINITY;
  object.updateMatrixWorld(true);
  object.traverse((node) => {
    if ((node as Bone).isBone) {
      lowest = Math.min(lowest, node.getWorldPosition(scratch).y);
    }
  });
  return lowest;
};

/** The lowest the clip ever takes the skeleton — its contact with the floor. */
const clipFloor = (mixer: AnimationMixer, sample: Object3D, clip: AnimationClip) => {
  const action = mixer.clipAction(clip);
  action.play();

  let lowest = Number.POSITIVE_INFINITY;
  for (let step = 0; step <= FLOOR_SAMPLES; step += 1) {
    mixer.setTime((clip.duration * step) / FLOOR_SAMPLES);
    lowest = Math.min(lowest, lowestBoneY(sample));
  }

  action.stop();
  mixer.uncacheClip(clip);
  return lowest;
};

/**
 * Put each clip on the floor.
 *
 * The contact shadow is drawn at the model's origin, where its rest pose stands. Meshy exports each
 * Mixamo clip with the hips at the height of the rig it was authored on, so a clip can hold the whole
 * body several centimetres above that floor — the character hovers over its own shadow — or below
 * it, the feet sunk through it. This measures that per clip, and `groundClips` shifts the clip's hips
 * Y track by it, so the clip's *lowest* pose touches the floor exactly where the rest pose does.
 *
 * The lowest pose, not the first frame or the mean, so vertical motion survives: a jump still leaves
 * the ground and a crouch still dips, they just do it from the floor. Measured against the rest pose
 * rather than against zero, because the lowest *bone* is the toe joint, a few centimetres above the
 * sole: comparing like with like keeps whatever sole the rest pose stands on.
 *
 * Measured on a private clone with its own mixer, sampled across each clip — never on the model being
 * shown, whose pose that would disturb. The cost is paid once per model load.
 */
const floorOffsets = (animations: AnimationClip[], model: Object3D, trackName: string) => {
  const sample = SkeletonUtils.clone(model);
  const mixer = new AnimationMixer(sample);

  const restFloor = lowestBoneY(sample);

  // World units per unit of the root bone's local Y — its parent's scale, e.g. an armature at 0.01.
  let root: Object3D | null = null;
  sample.traverse((node) => {
    if (!root && (node as Bone).isBone) {
      root = node;
    }
  });
  const scale = (root as Object3D | null)?.parent?.getWorldScale(new Vector3()).y || 1;

  const offsets = new Map<AnimationClip, number>();
  for (const clip of animations) {
    if (clip.tracks.some((track) => track.name === trackName)) {
      offsets.set(clip, (restFloor - clipFloor(mixer, sample, clip)) / scale);
    }
  }

  mixer.stopAllAction();
  return offsets;
};

/**
 * Hold the character on its mark.
 *
 * Meshy exports Mixamo animations with their **root motion intact**, so a clip that travels moves
 * the hips through world space rather than cycling on the spot. Measured off the hips translation
 * track in `public/sam.glb`, `Excited_Walk_M` covers **1.02m in X**; at this camera and the arch's
 * 0.53:1 aspect the frame is roughly **1.28m across**, so the character walks four fifths of the way
 * out of a stage the design draws with `overflow: hidden` and is clipped at the edge — hand first,
 * then shoulder. Every other clip in the file stays under 0.34m, which is why this reads as a clip
 * choice going wrong rather than as a systematic problem, and why it will keep happening: the
 * authored names come from the CMS and nothing in the Studio says which of them travel.
 *
 * The fix is the standard in-place conversion — pin the root bone's X and Z to zero, which is the
 * camera's own axis and where the rest pose already sits (`restpose` holds X 0.003, Z -0.013). Y is
 * untouched, so jumps and crouches survive: `Gangnam_Groove` rises 0.12m and `FunnyDancing_03`
 * drops 0.26m, and both are the clip doing its job.
 *
 * Zero rather than each clip's first frame or its mean, and that choice is about the crossfade: one
 * shared mark means the character does not slide sideways when one clip hands over to the next.
 *
 * What it costs is the *horizontal* component of a clip's sway — at most 0.19m on the dance clips,
 * about 15% of the frame. Every limb is untouched, so a dance still reads as a dance and a walk reads
 * as walking on the spot, which is what the comp's "DANCE LOOP" means for a fixed arch. The hips'
 * rotation is untouched too: a clip that spins turns the character's back to the camera, and the
 * client is happy to see that when the choreography calls for it.
 *
 * Clips are cloned rather than edited in place. `useGLTF` hands every viewer the same cached
 * `animations` array, so writing to those tracks would reach through to every other character on
 * the page — and, the second time this ran, to already-flattened data.
 */
const groundClips = (animations: AnimationClip[], root: Object3D | null, model: Object3D) => {
  if (!root) {
    return animations;
  }

  /*
   * Bindings are keyed by the *sanitised* node name — three strips `:` and `.` and turns whitespace
   * into `_`, so `mixamorig:Hips` is bound as `mixamorigHips`.
   *
   * Belt and braces rather than the load-bearing step it looks like, and worth being accurate about:
   * `GLTFLoader` already runs every node name through `sanitizeNodeName` as it builds the graph
   * (`createUniqueName`), and writes its track names from the result — so for a GLB, `root.name` is
   * *already* sanitised and a raw comparison would have matched. `sanitizeNodeName` is idempotent,
   * so calling it costs nothing and keeps the rule true for a root that reached this graph by some
   * other route. The failure it guards against is silent: a name that does not match leaves the
   * walk-off in place with no way to tell from the outside.
   */
  const trackName = `${PropertyBinding.sanitizeNodeName(root.name)}.position`;
  const offsets = floorOffsets(animations, model, trackName);

  return animations.map((clip) => {
    if (!clip.tracks.some((track) => track.name === trackName)) {
      return clip;
    }

    const grounded = clip.clone();

    for (const track of grounded.tracks) {
      if (track.name !== trackName) {
        continue;
      }
      // A `.position` track is always VEC3, so the stride is three and Y is the middle component.
      const lift = offsets.get(clip) ?? 0;
      for (let i = 0; i < track.values.length; i += 3) {
        track.values[i] = 0;
        track.values[i + 1] += Number.isFinite(lift) ? lift : 0;
        track.values[i + 2] = 0;
      }
    }

    return grounded;
  });
};

/**
 * The roughness every character's surface is drawn at.
 *
 * Both GLBs carry one baked PBR material. Its metallic-roughness texture is effectively no metal
 * (the blue channel averages 0.01), but it is glossy: roughness averages 0.55, and a fifth to a third
 * of its texels sit below 0.5, mostly on the dark fabrics. Under the studio HDRI those texels mirror
 * the environment, and black cloth that mirrors a softbox reads as leather or latex. That is the
 * "way too metallic" look, though no metal is involved. A constant matte roughness fixes it where a
 * lower environment intensity would not: that darkens the diffuse light along with the highlights.
 * 0.85 leaves a soft sheen on skin and trainers without a mirror anywhere.
 */
const MATTE_ROUGHNESS = 0.85;

/**
 * Take the gloss off a cached GLB's materials, once.
 *
 * Applied to `useGLTF`'s shared `scene` rather than to each clone, because `SkeletonUtils.clone`
 * shares materials with the original: every viewer of one file draws the same material, so it is
 * changed in one place. The `userData` flag makes every later call a no-op, which is what makes
 * running it where the scene is first read safe.
 *
 * `metalness` is zeroed as well as the map dropped. The texture already says "not metal", but glTF's
 * default `metallicFactor` is 1, so any bright texel in the blue channel would render as metal.
 */
const matteMaterials = (root: Object3D) => {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) {
      return;
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const standard = material as MeshStandardMaterial;
      if (standard.isMeshStandardMaterial && !standard.userData.matte) {
        standard.metalness = 0;
        standard.metalnessMap = null;
        standard.roughness = MATTE_ROUGHNESS;
        standard.roughnessMap = null;
        standard.userData.matte = true;
        standard.needsUpdate = true;
      }
    }
  });
};

/**
 * One character in the scene.
 *
 * Everything here that looks like ceremony is load-bearing; the notes say which.
 */
const ModelCharacter = (props: ModelCharacterProps) => {
  const { src, clips, restClip, animate, hoverSignal, onClip, position = ORIGIN, rotationY = 0 } = props;

  const invalidate = useThree((state) => state.invalidate);

  /*
   * `useDraco` is `false`.
   *
   * drei defaults it to `true`, which attaches a `DRACOLoader` pointed at a Google CDN. Nothing is
   * fetched unless a mesh is actually Draco-compressed and these are not — `yarn model:optimise`
   * produces `EXT_meshopt_compression`, whose decoder drei imports from `three-stdlib` and bundles.
   * Turning it off removes a third-party host from the runtime that was never going to be used.
   */
  const { scene, animations } = useGLTF(src, false);

  /**
   * `SkeletonUtils.clone(scene)` — **not** `scene.clone(true)`.
   *
   * `useGLTF` caches by URL and hands every caller the same `scene` object, so a viewer must clone
   * before it puts anything in its own graph. A plain `Object3D.clone(true)` copies each
   * `SkinnedMesh`, but the copy's `skeleton` still points at the *original* bones: the copy renders
   * in its bind pose and never moves, with no error and no warning. `SkeletonUtils.clone` rebuilds
   * the bone hierarchy alongside the meshes and rebinds the skin to it.
   *
   * The home page renders two characters, and the player page may mount a second viewer beside the
   * first, so this is the normal case rather than a precaution.
   *
   * The matte pass runs on the cached original first, so the clone shares the corrected material.
   * It mutates an object this component does not own, which is only acceptable because it is
   * idempotent. See `matteMaterials`.
   */
  const model = useMemo(() => {
    matteMaterials(scene);
    return SkeletonUtils.clone(scene);
  }, [scene]);

  /*
   * Release the clone's skeletons on the way out.
   *
   * `SkeletonUtils.clone` gives every `SkinnedMesh` copy `sourceMesh.skeleton.clone()` — a whole new
   * `Skeleton` per viewer — and each one lazily allocates its own `boneTexture` the first time it is
   * rendered. Nothing else frees them: R3F deliberately never disposes a `<primitive>` ("their state
   * may be kept outside of React"), which is the right call here because geometry and material are
   * shared with the cached original and disposing *those* would blank every other viewer. So the
   * leak is specifically the per-clone skeletons, and it accumulates across route changes, StrictMode
   * double-mounts and story swaps.
   *
   * `Skeleton.dispose()` is the exact scalpel: it disposes `boneTexture` and nulls it, and touches
   * nothing shared.
   */
  useEffect(
    () => () => {
      model.traverse((object) => {
        const skinned = object as SkinnedMesh;
        if (skinned.isSkinnedMesh) {
          skinned.skeleton.dispose();
        }
      });
    },
    [model]
  );

  /**
   * The rig's root bone — `mixamorig:Hips` on these characters, but **found rather than named**, so
   * the rule survives a character exported through a different pipeline.
   *
   * `traverse` is depth-first pre-order, which visits a node before its children — so the first bone
   * it reaches provably has no bone above it. What that does *not* rule out is a rig with more than
   * one independent bone root (a prop with its own single bone placed before the armature): the
   * first-traversed root wins, and the armature's tracks then match no track name. That degrades to
   * "the clip is not grounded", never to a throw. See `groundClips`.
   *
   * `traverse` has no early exit, so the flag is how this stops doing work after the first hit. The
   * previous spelling collected every bone into an array and read index 0 off it — through
   * `Array.prototype.at`, which is ES2022 against this project's ES2017 target. `lib: ["esnext"]`
   * means `ts:check` cannot see that, and TypeScript never down-levels a built-in method.
   */
  const rootBone = useMemo(() => {
    let root: Object3D | null = null;
    model.traverse((object) => {
      if (!root && (object as Bone).isBone) {
        root = object;
      }
    });
    return root as Object3D | null;
  }, [model]);

  /** See `groundClips` — without this a travelling clip walks the character out of the arch. */
  const grounded = useMemo(() => groundClips(animations, rootBone, model), [animations, rootBone, model]);

  const { actions, mixer, names } = useAnimations(grounded, model);

  const rest = resolveModelClip(restClip, clips, names);
  /*
   * No idle fallback for the hover clip, unlike `rest`.
   *
   * `resolveModelClip('hover', …)` would degrade to idle, which is right when idle is the thing
   * being *replaced* and wrong here: the hover clip is a one-shot played *over* the rest loop, and
   * degrading it to idle means crossfading the rest clip into itself on every pointer enter.
   * `matchModelClip` resolves the authored name or nothing.
   */
  const hover = matchModelClip(clips?.hover, names);

  /** The action currently holding the skeleton, so a fade always has something to fade *from*. */
  const current = useRef<AnimationAction | null>(null);

  /*
   * The rest loop, and the reduced-motion pose.
   *
   * Both live in one effect because they are one decision — what the character does when nothing is
   * happening — and splitting them lets the two race on a preference change.
   */
  useEffect(() => {
    const action = rest ? actions[rest] : null;

    if (!action) {
      /*
       * Nothing resolved. The model is in the scene in its bind pose, which is the degradation the
       * acceptance criteria ask for: a missing or misspelt clip name costs the animation, not the
       * page. `onClip` still fires, so the placeholder clears and the reader sees the character.
       */
      current.current = null;
      onClip?.(undefined);
      invalidate();
      return;
    }

    if (animate) {
      action.setLoop(LoopRepeat, Number.POSITIVE_INFINITY);
      action.clampWhenFinished = false;
      crossFade(action, current.current);
    } else {
      /*
       * Idle pose only.
       *
       * `reset()` then `play()` then `paused = true` — in that order. `fadeIn` is deliberately not
       * used: a fade ramps the action's weight as the mixer advances, and the mixer is about to
       * stop advancing, so the weight would sit at zero and the character would never appear.
       *
       * `mixer.update(0)` is what actually puts the skeleton in the pose. A paused action still
       * evaluates its interpolants at its current time on every mixer update; with `frameloop` on
       * `demand` there may not be another one, so the pose is sampled here rather than hoped for.
       */
      action.setLoop(LoopRepeat, Number.POSITIVE_INFINITY);
      action.reset().play();
      action.time = 0;
      action.paused = true;
      mixer.update(0);
    }

    current.current = action;
    onClip?.(rest);
    invalidate();

    return () => {
      action.stop();
    };
  }, [actions, animate, invalidate, mixer, onClip, rest]);

  /*
   * The hover one-shot.
   *
   * Skips `hoverSignal === 0` so the first render is not a hover, and does nothing at all under
   * reduced motion — where "no clip playback" has to mean no clip playback, not "no *looping*
   * clip playback".
   */
  useEffect(() => {
    if (hoverSignal === 0 || !animate || !hover) {
      return;
    }
    const action = actions[hover];
    if (!action || action === current.current) {
      return;
    }

    action.setLoop(LoopOnce, 1);
    // Hold the last frame instead of snapping to the bind pose, so the return crossfade starts from
    // where the clip ended.
    action.clampWhenFinished = true;
    crossFade(action, current.current);
    current.current = action;
    onClip?.(hover);
  }, [actions, animate, hover, hoverSignal, onClip]);

  /*
   * Return to rest when the one-shot finishes.
   *
   * The mixer's `finished` event is the only reliable signal — polling `action.time` against the
   * clip duration misses by up to a frame and double-fires on a slow one. Listening on the mixer
   * rather than per-action means one subscription for however many one-shots are played.
   */
  useEffect(() => {
    if (!animate || !rest) {
      return;
    }
    const restAction = actions[rest];
    if (!restAction) {
      return;
    }

    const onFinished = (event: { action: AnimationAction }) => {
      if (event.action === restAction || event.action !== current.current) {
        return;
      }
      restAction.setLoop(LoopRepeat, Number.POSITIVE_INFINITY);
      crossFade(restAction, event.action);
      current.current = restAction;
      onClip?.(rest);
    };

    const target = mixer as AnimationMixer & {
      addEventListener: (type: 'finished', listener: (event: { action: AnimationAction }) => void) => void;
      removeEventListener: (type: 'finished', listener: (event: { action: AnimationAction }) => void) => void;
    };
    target.addEventListener('finished', onFinished);
    return () => target.removeEventListener('finished', onFinished);
  }, [actions, animate, mixer, onClip, rest]);

  return (
    <group position={position} rotation-y={rotationY}>
      <primitive object={model} />
    </group>
  );
};

/** Warm the GLB cache before a viewer mounts. See `preload.ts` for the only caller that matters. */
export const preloadCharacter = (src: string) => {
  useGLTF.preload(src, false);
};

export default ModelCharacter;
