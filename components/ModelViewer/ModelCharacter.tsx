'use client';

import { useAnimations, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { LoopOnce, LoopRepeat, PropertyBinding } from 'three';
import type { AnimationAction, AnimationClip, AnimationMixer, Bone, Object3D } from 'three';
import { SkeletonUtils } from 'three-stdlib';

import { matchModelClip, resolveModelClip } from '@/helpers/modelClips';
import type { ModelClipNames, ModelClipRole } from '@/helpers/modelClips';

/** Seconds of crossfade between two clips. Long enough to read as a transition, short enough not to drift. */
const FADE = 0.35;

export interface ModelCharacterProps {
  /** The GLB URL — a Sanity file asset in production, a file under `public/` in Storybook. */
  src: string;
  /** The authored clip names. Every one of the three may be absent or wrong; see `@/helpers/modelClips`. */
  clips?: ModelClipNames | null;
  /** Which role loops at rest — `idle` on the select screen, `feature` on a player page. */
  restClip: ModelClipRole;
  /** `false` under reduced motion: the rest clip is posed at its first frame and never advanced. */
  animate: boolean;
  /**
   * Increment to play the hover clip once.
   *
   * A counter rather than a boolean because the interesting event is *another* hover, not a change
   * of state — a boolean would have to be flipped back before it could fire again, and a second
   * hover during the first playthrough would be swallowed. `0` is the initial value and never
   * plays, so the first render is not a hover.
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
}

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
 * about 15% of the frame. Hips **rotation** and every limb are untouched, so a dance still reads as
 * a dance and a walk reads as walking on the spot, which is what the comp's "DANCE LOOP" means for
 * a fixed arch.
 *
 * Clips are cloned rather than edited in place. `useGLTF` hands every viewer the same cached
 * `animations` array, so writing to those tracks would reach through to every other character on
 * the page — and, the second time this ran, to already-flattened data.
 */
const groundClips = (animations: AnimationClip[], root: Object3D | null) => {
  if (!root) {
    return animations;
  }

  /*
   * Bindings are keyed by the *sanitised* node name: three strips `:` and `.` from it, so
   * `mixamorig:Hips` is bound as `mixamorigHips` and comparing against `root.name` raw would match
   * nothing at all — silently, leaving the walk-off in place with no way to tell from the outside.
   */
  const trackName = `${PropertyBinding.sanitizeNodeName(root.name)}.position`;

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
      for (let i = 0; i < track.values.length; i += 3) {
        track.values[i] = 0;
        track.values[i + 2] = 0;
      }
    }

    return grounded;
  });
};

/**
 * One character in the scene.
 *
 * Everything here that looks like ceremony is load-bearing; the notes say which.
 */
const ModelCharacter = (props: ModelCharacterProps) => {
  const { src, clips, restClip, animate, hoverSignal, onClip } = props;

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
   */
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  /**
   * The rig's root bone — `mixamorig:Hips` on these characters, but **found rather than named**, so
   * the rule survives a character exported through a different pipeline. `traverse` is depth-first
   * pre-order, so the first bone it reaches is the topmost one.
   */
  const rootBone = useMemo(() => {
    const bones: Object3D[] = [];
    model.traverse((object) => {
      if ((object as Bone).isBone) {
        bones.push(object);
      }
    });
    return bones.at(0) ?? null;
  }, [model]);

  /** See `groundClips` — without this a travelling clip walks the character out of the arch. */
  const grounded = useMemo(() => groundClips(animations, rootBone), [animations, rootBone]);

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

  return <primitive object={model} />;
};

/** Warm the GLB cache before a viewer mounts. See `preload.ts` for the only caller that matters. */
export const preloadCharacter = (src: string) => {
  useGLTF.preload(src, false);
};

export default ModelCharacter;
