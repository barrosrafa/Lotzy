import { randomInt } from 'node:crypto'; import type { RandomSource } from '../../domain/games/ports/RandomSource.js';
export class CryptoRandomSource implements RandomSource { nextInt(min:number,maxExclusive:number){return randomInt(min,maxExclusive);} }
