import { describe, expect, it } from 'vitest';
import { GameGenerator } from '../src/domain/games/services/GameGenerator.js';
import { FilterEngine } from '../src/domain/games/services/FilterEngine.js';
import { PopularityScorer } from '../src/domain/games/services/PopularityScorer.js';
import { expand } from '../src/domain/games/services/CombinationExpander.js';
class Sequence { private i=0; nextInt(min:number,max:number){const v=min+(this.i++%(max-min));return v;} }
describe('GameGenerator',()=>{it.each([15,16,17,18,19,20])('gera %i dezenas válidas',k=>{const g=new GameGenerator(new Sequence()).draw(k,Array.from({length:25},(_,i)=>i+1));expect(g).toHaveLength(k);expect(new Set(g).size).toBe(k);expect(g).toEqual([...g].sort((a,b)=>a-b));});});
describe('FilterEngine',()=>{it('rejeita soma fora do envelope',()=>{const f=new FilterEngine().checkFeasibility({size:15,pool:Array.from({length:25},(_,i)=>i+1),fixed:[],filters:{sum:{min:300}}});expect(f.feasible).toBe(false);});it('trata free zero corretamente',()=>{const f=new FilterEngine().checkFeasibility({size:15,pool:Array.from({length:25},(_,i)=>i+1),fixed:Array.from({length:15},(_,i)=>i+1),filters:{sum:{min:120,max:120}}});expect(f.feasible).toBe(true);});});
describe('PopularityScorer',()=>{it('mantém confiança heurística e score limitado',()=>{const p=new PopularityScorer().score([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);expect(p.confidence).toBe('heuristic');expect(p.score).toBeGreaterThanOrEqual(0);expect(p.score).toBeLessThanOrEqual(1);});});
describe('CombinationExpander',()=>{it('expande 16 dezenas em 16 jogos',()=>{expect([...expand(Array.from({length:16},(_,i)=>i+1),15)]).toHaveLength(16);});});
