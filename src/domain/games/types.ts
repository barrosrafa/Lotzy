export type Game = readonly number[];
export type PatternGroup = 'geometric' | 'arithmetic' | 'calendar' | 'compositional';
export interface Range { min?: number; max?: number }
export interface MatchedPattern { key: string; group: PatternGroup; weight: number }
export interface PopularityAssessment { score: number; matchedPatterns: readonly MatchedPattern[]; confidence: 'heuristic' }
export interface GameMetrics { size:number; sum:number; evens:number; odds:number; primes:number; primeNumbers:readonly number[]; fibonacci:number; fibonacciNumbers:readonly number[]; frame:number; core:number; maxConsecutiveRun:number; popularity:PopularityAssessment }
export interface FilterSpec { evens?:Range; primes?:Range; fibonacci?:Range; sum?:Range; frame?:Range; maxConsecutiveRun?:number; maxPopularityScore?:number; maxOverlapWithBatch?:number; repeatsFromPrevious?: { previousDraw: Game; min?:number; max?:number } }
export interface FeasibilityViolation { constraint:string; reason:string; requested?:Range; achievable?:Range }
export interface Feasibility { feasible:boolean; violations:FeasibilityViolation[] }
