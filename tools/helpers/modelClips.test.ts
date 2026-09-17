import { describe, expect, it } from 'vitest';

import { matchModelClip, resolveModelClip } from './modelClips';

/**
 * The real clip list inside `public/sam.glb`, read out of the file's glTF JSON chunk rather than
 * invented. Meshy names each clip after its source animation, which is why the names look like
 * this and why the schema pre-fills nothing.
 */
const SAM = ['Running', 'Walking', 'Agree_Gesture', 'Excited_Walk_M', 'FunnyDancing_03', 'Gangnam_Groove', 'restpose'];

describe('matchModelClip', () => {
  it('matches a name verbatim', () => {
    expect(matchModelClip('Gangnam_Groove', SAM)).toBe('Gangnam_Groove');
  });

  it('matches past surrounding whitespace', () => {
    // Pasting a clip name out of a model inspector picks up a trailing space more often than not.
    expect(matchModelClip('  Gangnam_Groove ', SAM)).toBe('Gangnam_Groove');
  });

  it('matches past case, and returns the file spelling', () => {
    // The return value is the key `useAnimations` builds `actions` from, so returning the author's
    // casing would resolve here and then find no action at all.
    expect(matchModelClip('gangnam_groove', SAM)).toBe('Gangnam_Groove');
  });

  it('matches past whitespace in the *file* name, and still returns the file spelling', () => {
    // The third pass trims both sides of the comparison, so a GLB exported with a padded clip name
    // resolves — and what comes back is the padded original, untrimmed. That is deliberate and it is
    // the non-obvious half of the "returns the file spelling" rule: `useAnimations` keys `actions`
    // off the name exactly as the file spells it, so handing back the tidied version would resolve
    // here and then find no action at all.
    expect(matchModelClip('gangnam_groove', [' Gangnam_Groove '])).toBe(' Gangnam_Groove ');
  });

  it('does not guess at a near miss', () => {
    // "Gangnam" is a prefix of a real clip. Playing the nearest match would hide the typo; the
    // caller degrading to idle shows it without breaking the page.
    expect(matchModelClip('Gangnam', SAM)).toBeUndefined();
    expect(matchModelClip('Dance', SAM)).toBeUndefined();
  });

  it('treats absent, empty and whitespace-only names alike', () => {
    expect(matchModelClip(undefined, SAM)).toBeUndefined();
    expect(matchModelClip('', SAM)).toBeUndefined();
    expect(matchModelClip('   ', SAM)).toBeUndefined();
  });

  it('returns nothing when the file has no clips', () => {
    expect(matchModelClip('Gangnam_Groove', [])).toBeUndefined();
  });
});

describe('resolveModelClip', () => {
  const clips = { idle: 'Excited_Walk_M', hover: 'Agree_Gesture', feature: 'Gangnam_Groove' };

  it('resolves each role to its own clip when all three are authored and present', () => {
    expect(resolveModelClip('idle', clips, SAM)).toBe('Excited_Walk_M');
    expect(resolveModelClip('hover', clips, SAM)).toBe('Agree_Gesture');
    expect(resolveModelClip('feature', clips, SAM)).toBe('Gangnam_Groove');
  });

  it('degrades to idle when the role was never authored', () => {
    // The schema gives none of the three an initialValue, so this is the state a freshly created
    // player document is in — not an edge case.
    expect(resolveModelClip('feature', { idle: 'Excited_Walk_M' }, SAM)).toBe('Excited_Walk_M');
    expect(resolveModelClip('hover', { idle: 'Excited_Walk_M' }, SAM)).toBe('Excited_Walk_M');
  });

  it('degrades to idle when the role names a clip that is not in the file', () => {
    // The dangerous one: the field is filled in, so nothing in the Studio looks wrong. A model
    // re-exported with renamed clips puts every player in this state at once.
    expect(resolveModelClip('feature', { ...clips, feature: 'Dance Loop' }, SAM)).toBe('Excited_Walk_M');
    // Asserted for `hover` too, because the doc claims both non-idle roles behave identically and
    // only `feature` was pinned. Note `ModelCharacter` deliberately routes around this branch —
    // degrading a one-shot to idle would crossfade the rest clip into itself on every pointer enter
    // — so this is the helper's contract for a future caller, not a description of today's.
    expect(resolveModelClip('hover', { ...clips, hover: 'Wave Hello' }, SAM)).toBe('Excited_Walk_M');
  });

  it('resolves to nothing when idle itself is missing, rather than throwing', () => {
    // The floor. No clip resolves, the viewer plays nothing, and the model renders its bind pose.
    expect(resolveModelClip('idle', { feature: 'Gangnam_Groove' }, SAM)).toBeUndefined();
    expect(resolveModelClip('feature', { feature: 'Nope' }, SAM)).toBeUndefined();
    expect(resolveModelClip('idle', {}, SAM)).toBeUndefined();
  });

  it('survives an absent clips object', () => {
    // GROQ projects an absent object as null, not undefined, so both shapes actually arrive.
    expect(resolveModelClip('feature', undefined, SAM)).toBeUndefined();
    expect(resolveModelClip('feature', null, SAM)).toBeUndefined();
  });

  it('survives a file with no clips at all', () => {
    // A static GLB — a prop, a set piece — handed to the same component.
    expect(resolveModelClip('feature', clips, [])).toBeUndefined();
  });
});
