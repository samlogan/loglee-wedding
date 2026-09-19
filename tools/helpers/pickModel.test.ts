import { describe, expect, it } from 'vitest';

import pickModel from './pickModel';

const SAM = { clips: { feature: 'Gangnam', hover: 'Agree', idle: 'Walk' }, name: 'Sam', src: '/sam.glb' };
const LAUREN = { clips: { feature: 'Salsa', idle: 'Sway' }, name: 'Lauren', src: '/lauren.glb' };

describe('pickModel', () => {
  it('picks the model from the whole part of random × count', () => {
    expect(pickModel([SAM, LAUREN], 0.1)?.model.name).toBe('Sam');
    expect(pickModel([SAM, LAUREN], 0.9)?.model.name).toBe('Lauren');
  });

  it("picks one of that model's own clips from what is left over", () => {
    // 0.1 × 2 = 0.2 → Sam, and 0.2 of the way through his three clips → the first.
    expect(pickModel([SAM, LAUREN], 0.1)?.clip).toBe('Walk');
    // 0.45 × 2 = 0.9 → Sam, 0.9 of the way through → the last.
    expect(pickModel([SAM, LAUREN], 0.45)?.clip).toBe('Gangnam');
    // Lauren never gets one of Sam's clips.
    expect(['Sway', 'Salsa']).toContain(pickModel([SAM, LAUREN], 0.8)?.clip);
  });

  it('reaches every model and every clip across the range', () => {
    const seen = new Set<string>();
    for (let step = 0; step < 1000; step += 1) {
      const pick = pickModel([SAM, LAUREN], step / 1000);
      seen.add(`${pick?.model.name}:${pick?.clip}`);
    }
    expect(seen).toEqual(new Set(['Sam:Walk', 'Sam:Agree', 'Sam:Gangnam', 'Lauren:Sway', 'Lauren:Salsa']));
  });

  it('counts a clip authored under two roles once', () => {
    const twice = { clips: { feature: 'Dance', idle: 'Dance' }, name: 'Jo', src: '/jo.glb' };
    expect(pickModel([twice], 0.99)?.clip).toBe('Dance');
  });

  it('skips a model with no file, and has nothing to pick when none has one', () => {
    expect(pickModel([{ name: 'Sam', src: null }, LAUREN], 0)?.model.name).toBe('Lauren');
    expect(pickModel([{ name: 'Sam', src: '  ' }], 0.5)).toBeUndefined();
    expect(pickModel([], 0.5)).toBeUndefined();
  });

  it('leaves the clip undefined for a model with none authored', () => {
    expect(pickModel([{ name: 'Sam', src: '/sam.glb' }], 0.5)).toEqual({
      clip: undefined,
      model: { name: 'Sam', src: '/sam.glb' }
    });
  });

  it('holds to the range at its edges', () => {
    expect(pickModel([SAM, LAUREN], 1)?.model.name).toBe('Lauren');
    expect(pickModel([SAM, LAUREN], -1)?.model.name).toBe('Sam');
  });
});
