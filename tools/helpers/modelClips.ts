/*=============================================>>>>>
= Animation clip resolution =
===============================================>>>>>*/

/*
 * Maps the three clip names an editor types in the Studio onto the clip names that are actually
 * inside a GLB.
 *
 * Pure, and deliberately separate from `components/ModelViewer` so it can be asserted in the `unit`
 * vitest project rather than only through a story that needs a GPU. The acceptance criterion this
 * exists for — "a missing clip degrades to idle rather than throwing" — is a decision about three
 * strings and a list of strings, and nothing about it needs a renderer to be true.
 *
 * Why it can fail at all: `tools/sanity/schema/documents/player.ts` gives `clips.idle`,
 * `clips.hover` and `clips.feature` **no `initialValue` and no validation**, because the names
 * differ per character (Meshy names each clip after its source animation) so there is no shared
 * list worth pre-filling. Every one of the three can therefore be absent, blank, or a typo of a
 * name that is not in the file — and a typo is indistinguishable from an absence at runtime.
 */

/** The three roles the player schema authors, in the schema's own spelling. */
export type ModelClipRole = 'idle' | 'hover' | 'feature';

/**
 * The roles that can be a viewer's *rest* clip — the one that loops when nothing is happening.
 *
 * `hover` is excluded by construction rather than by convention: it is a one-shot played *over* the
 * rest loop, so naming it as the thing it interrupts is incoherent. Named here rather than spelled
 * `Exclude<ModelClipRole, 'hover'>` at each use so the invariant survives the whole way down —
 * `ModelViewerProps` had it and the two components below it did not, which is exactly how an
 * invariant enforced at the front door gets lost behind it.
 */
export type ModelRestRole = Exclude<ModelClipRole, 'hover'>;

/**
 * The authored names. Structurally identical to `IPlayerDocument['clips']`, declared here rather
 * than imported from the schema so this helper does not depend on the CMS layer — a second document
 * type with the same three roles would reuse it as-is.
 */
export interface ModelClipNames {
  idle?: string;
  hover?: string;
  feature?: string;
}

/**
 * Match one authored name against the clips the file actually contains.
 *
 * Three passes, narrowing:
 *
 *   1. verbatim — what the Studio's help text asks for ("copy it verbatim from the file")
 *   2. trimmed — a name pasted with a trailing space is the same clip, not a different one
 *   3. case-insensitive on the trimmed name — likewise `gangnam_groove` and `Gangnam_Groove`
 *
 * It stops there. No fuzzy matching, no prefix matching: past case and whitespace, a name that does
 * not appear in the file is a mistake, and quietly playing the *nearest* clip would hide it. The
 * caller degrades instead, which is visible without being fatal.
 *
 * Returns the name **as the file spells it**, because that is the key `useAnimations` builds its
 * `actions` map from — returning the author's spelling would resolve and then not be found.
 */
export const matchModelClip = (name: string | undefined, available: readonly string[]): string | undefined => {
  if (!name) {
    return undefined;
  }

  if (available.includes(name)) {
    return name;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return undefined;
  }
  if (available.includes(trimmed)) {
    return trimmed;
  }

  const lowered = trimmed.toLowerCase();
  return available.find((clip) => clip.trim().toLowerCase() === lowered);
};

/**
 * Resolve a role to a clip that exists, degrading to idle.
 *
 * `feature` and `hover` fall back to `idle`; `idle` falls back to nothing. That asymmetry is the
 * whole contract: idle is the floor, so there is nowhere below it to go, and a viewer with no
 * resolvable clip at all renders the model's bind pose rather than throwing.
 *
 * Note what "degrades to idle" covers, because the two cases are not the same mistake and both
 * happen: the role was **never authored** (the field is blank), and the role was authored but
 * **names a clip that is not in the GLB** (a typo, or a model re-exported with renamed clips). The
 * second is the dangerous one — it looks authored — and it lands here identically.
 */
export const resolveModelClip = (
  role: ModelClipRole,
  clips: ModelClipNames | undefined | null,
  available: readonly string[]
): string | undefined => {
  if (!clips) {
    return undefined;
  }

  const direct = matchModelClip(clips[role], available);
  if (direct) {
    return direct;
  }

  return role === 'idle' ? undefined : matchModelClip(clips.idle, available);
};
