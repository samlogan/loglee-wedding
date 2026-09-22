/*=============================================>>>>>
= Where a one-shot clip should hand back to its loop =
===============================================>>>>>*/

/** A pose: each bone's local rotation as a quaternion `[x, y, z, w]`, keyed by bone name. */
export type Pose = Record<string, ArrayLike<number>>;

export interface ClipExit {
  /** Seconds into the one-shot at which to hand over. */
  at: number;
  /** Seconds into the loop to start it from, so it picks up the matching step. */
  restAt: number;
  /** Mean angle, in degrees, between the two poses at the hand-over — lower reads smoother. */
  distance: number;
}

export interface FindClipExitOptions {
  /** The one-shot (the hover dance). */
  duration: number;
  sample: (time: number) => Pose;
  /** The loop it returns to (the idle walk). */
  restDuration: number;
  restSample: (time: number) => Pose;
  /**
   * The earliest the one-shot may end, as a fraction of its length. The search is the clip's last
   * stretch only: the dance should mostly play, and an exit a second in would cut it to nothing.
   */
  from?: number;
  /** Sampling interval, in seconds, for both clips. */
  step?: number;
  /**
   * How much worse than the best match, in degrees, a later moment may be and still be chosen. Poses
   * a degree or two apart look the same mid-crossfade, and between two that look the same the later
   * one cuts less of the dance.
   */
  tolerance?: number;
}

/** The angle, in degrees, between two unit quaternions — the rotation that takes one to the other. */
const quaternionAngle = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return (2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI;
};

/** The mean bone-rotation difference between two poses, over the bones both have. */
export const poseDistance = (a: Pose, b: Pose): number => {
  const bones = Object.keys(a).filter((bone) => bone in b);
  if (bones.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return bones.reduce((sum, bone) => sum + quaternionAngle(a[bone], b[bone]), 0) / bones.length;
};

/**
 * Find the moment late in a one-shot where the pose is closest to some moment of the loop it returns
 * to, and which moment of the loop that is.
 *
 * A one-shot played to its last frame hands back from wherever the clip happens to stop. Meshy's
 * dances often stop mid-move, and a crossfade from a mid-move pose reads as the character snapping
 * out of the dance. Handing over where the dance passes closest to the walk, into the walk's matching
 * step, reads as the dance settling into the walk instead.
 *
 * The clip's own last frame is one of the candidates, so a clip that already ends in a good pose
 * plays to the end. Near-ties (within `tolerance`) go to the later moment, so no more of the dance is
 * cut than has to be.
 */
export const findClipExit = (options: FindClipExitOptions): ClipExit | null => {
  const { duration, sample, restDuration, restSample, from = 0.6, step = 1 / 15, tolerance = 2 } = options;
  if (!(duration > 0) || !(restDuration > 0)) {
    return null;
  }

  const restPoses: { time: number; pose: Pose }[] = [];
  for (let time = 0; time < restDuration; time += step) {
    restPoses.push({ pose: restSample(time), time });
  }

  const candidates: number[] = [];
  for (let time = duration * from; time < duration; time += step) {
    candidates.push(time);
  }
  candidates.push(duration);

  // Each candidate's closest step of the loop.
  const matches: ClipExit[] = candidates.map((at) => {
    const pose = sample(at);
    let match: ClipExit = { at, distance: Number.POSITIVE_INFINITY, restAt: 0 };
    for (const rest of restPoses) {
      const distance = poseDistance(pose, rest.pose);
      if (distance < match.distance) {
        match = { at, distance, restAt: rest.time };
      }
    }
    return match;
  });

  const closest = Math.min(...matches.map((match) => match.distance));
  if (!Number.isFinite(closest)) {
    return null;
  }
  // The latest moment that is as good as the best, to within the tolerance.
  return matches.findLast((match) => match.distance <= closest + tolerance) ?? null;
};
