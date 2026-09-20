import { simpleBetCount } from '../../domain/games/constants.js';
export const priceTable={version:'2024-11-04',betPriceCents:350,fixedPrizeCents:{11:700,12:1400,13:3500}} as const;
export const costFor=(size:number)=>({simpleBets:simpleBetCount(size,15),totalCents:simpleBetCount(size,15)*priceTable.betPriceCents,formatted:new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(simpleBetCount(size,15)*priceTable.betPriceCents/100)});
