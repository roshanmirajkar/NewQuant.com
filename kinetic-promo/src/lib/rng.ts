/**
 * Tiny deterministic PRNG. Remotion renders frames in parallel browser tabs, so anything random
 * must be a pure function of a seed, never Math.random(). Dependency-free on purpose (the physics
 * check in scripts/ imports it from plain Node).
 */

/** FNV-1a: string seed → 32-bit unsigned int. */
export const hashSeed = (seed: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** mulberry32: returns a generator of floats in [0, 1) that is fully determined by `seed`. */
export const makeRng = (seed: string): (() => number) => {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** One value in [0, 1) for a seed, e.g. rand(`shake:x:${frame}`). */
export const rand = (seed: string): number => makeRng(seed)();
