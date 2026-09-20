import { CORE, FIBONACCI, FRAME, PRIMES } from '../constants.js';
import type { Game, GameMetrics } from '../types.js';
import { PopularityScorer } from './PopularityScorer.js';
export class GameAnalyzer {
  constructor(private readonly scorer = new PopularityScorer()) {}
  analyze(game: Game): GameMetrics {
    const sorted = [...game].sort((a,b)=>a-b); let run=sorted.length ? 1 : 0; let maxRun=run;
    for (let i=1;i<sorted.length;i+=1) { run = sorted[i] === sorted[i-1]+1 ? run+1 : 1; maxRun=Math.max(maxRun,run); }
    const primes=sorted.filter(n=>PRIMES.has(n)); const fib=sorted.filter(n=>FIBONACCI.has(n));
    return { size:sorted.length, sum:sorted.reduce((a,b)=>a+b,0), evens:sorted.filter(n=>n%2===0).length, odds:sorted.filter(n=>n%2!==0).length, primes:primes.length, primeNumbers:primes, fibonacci:fib.length, fibonacciNumbers:fib, frame:sorted.filter(n=>FRAME.has(n)).length, core:sorted.filter(n=>CORE.has(n)).length, maxConsecutiveRun:maxRun, popularity:this.scorer.score(sorted) };
  }
}
