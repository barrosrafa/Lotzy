export const UNIVERSE = Object.freeze(Array.from({ length: 25 }, (_, i) => i + 1));
export const MIN_GAME_SIZE = 15;
export const MAX_GAME_SIZE = 20;
export const DRAW_SIZE = 15;
export const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);
export const FIBONACCI = new Set([1, 2, 3, 5, 8, 13, 21]);
export const FRAME = new Set(UNIVERSE.filter((n) => n <= 5 || n >= 21 || n % 5 === 1 || n % 5 === 0));
export const CORE = new Set([7, 8, 9, 12, 13, 14, 17, 18, 19]);
export const ROWS = [[1,2,3,4,5],[6,7,8,9,10],[11,12,13,14,15],[16,17,18,19,20],[21,22,23,24,25]];
export const COLUMNS = [[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],[5,10,15,20,25]];
export const DIAGONALS = [[1,7,13,19,25],[5,9,13,17,21]];
export const MIN_SUM = 120;
export const MAX_SUM = 270;
export const minOverlap = (a: number, b: number): number => Math.max(0, a + b - 25);
export const simpleBetCount = (n: number, k = 15): number => {
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = result * (n - k + i) / i;
  return Math.round(result);
};
