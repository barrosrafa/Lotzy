import type { RandomSource } from '../ports/RandomSource.js';
export class GameGenerator {
  constructor(private readonly random: RandomSource) {}
  draw(size: number, pool: readonly number[]): number[] {
    if (size < 0 || size > pool.length) throw new RangeError(`Cannot draw ${size} numbers from a pool of ${pool.length}.`);
    const scratch = [...pool];
    for (let i = 0; i < size; i += 1) { const j = this.random.nextInt(i, scratch.length); [scratch[i], scratch[j]] = [scratch[j], scratch[i]]; }
    return scratch.slice(0, size).sort((a,b) => a-b);
  }
}
