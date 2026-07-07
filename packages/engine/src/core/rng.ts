/**
 * Deterministic pseudo-random number generation.
 *
 * The entire "intelligence" of Athena is reproducible: given a seed, every
 * tick unfolds identically, forever. To make that true, randomness must be
 * (a) seeded and (b) serializable — we store the generator's cursor as a
 * single number on OrgState (`rngState`) and thread it through each tick.
 *
 * Algorithm: mulberry32. Tiny, fast, good statistical quality for a sim.
 */

/** One draw: returns a float in [0, 1) and the next cursor. Pure. */
export function nextFloat(state: number): [value: number, next: number] {
  let t = (state + 0x6d2b79f5) | 0;
  const s = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, s];
}

/**
 * A stateful cursor wrapper for ergonomic use inside a single tick.
 * It is constructed from `state.rngState` at the top of `advance`, drawn from
 * freely, and its final `.state` is written back — keeping OrgState the sole
 * serializable source of truth.
 */
export class Rng {
  constructor(public state: number) {}

  /** Float in [0, 1). */
  float(): number {
    const [v, next] = nextFloat(this.state);
    this.state = next;
    return v;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.float() * (max - min);
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.float() < p;
  }

  /** Approximate standard normal (Box–Muller), mean 0, sd 1. */
  normal(): number {
    const u = 1 - this.float();
    const v = this.float();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}
