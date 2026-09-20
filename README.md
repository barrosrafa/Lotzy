# Lotzy — API Lotofácil

API HTTP stateless em **Node.js 20+, TypeScript strict e Express 5** para geração, validação, análise, desdobramento, conferência e estudo informacional de jogos da Lotofácil. A implementação segue o SSD `v3.0.0`, com separação `domain → application → infrastructure`, CSPRNG, filtros com pré-checagem de viabilidade, análise de diversidade, score heurístico anti-rateio, fechamento por catálogo e ferramentas de EV/backtest.

> **Transparência e jogo responsável:** nenhuma funcionalidade aumenta a probabilidade de premiação. As 3.268.760 combinações de 15 dezenas são equiprováveis e os sorteios são independentes. Filtros alteram composição, não probabilidade; `popularityScore` modela padrões humanos, não o sorteio; fechamento é garantia condicional; o valor esperado é negativo. Aposte somente o que puder perder. Proibido para menores de 18 anos.

## 1. Requisitos e instalação

- Node.js 20 LTS ou superior;
- npm 10 ou superior;
- um frontend que consiga chamar HTTP/JSON (React, Vue, Angular, mobile ou outro cliente).

```bash
git clone https://github.com/barrosrafa/Lotzy.git
cd Lotzy
cp .env.example .env
npm install
npm run build
npm test
```

A configuração mínima já possui defaults seguros para desenvolvimento. Para iniciar a API em modo de desenvolvimento:

```bash
npm run dev
```

Por padrão, o servidor fica em `http://localhost:3000`. Para executar a versão compilada:

```bash
npm run build
npm start
```

## 2. Variáveis de ambiente

| Variável | Default | Finalidade |
|---|---:|---|
| `NODE_ENV` | `development` | Ambiente (`development`, `test` ou `production`). |
| `PORT` | `3000` | Porta HTTP. |
| `CORS_ORIGINS` | vazio | Lista separada por vírgulas de origens autorizadas, por exemplo `http://localhost:5173,https://app.exemplo.com`. Em desenvolvimento, lista vazia permite CORS amplo para facilitar integração local. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Janela do rate limit em milissegundos. |
| `RATE_LIMIT_MAX` | `100` | Máximo de requisições padrão por janela. Endpoints pesados usam 10 por janela. |
| `RESPONSIBLE_GAMBLING_URL` | URL gov.br | Link exibido nas respostas de geração. |
| `PRICE_TABLE_VERSION` | `2024-11-04` | Versão da tabela de preço em centavos. |
| `WHEEL_CATALOG_VERSION` | `wheels-2026-09` | Versão do catálogo de fechamentos. |
| `POPULARITY_MODEL_VERSION` | `popularity-2026-09` | Versão do catálogo heurístico de padrões. |
| `API_KEYS` | vazio | Chaves separadas por vírgulas para futura proteção por `X-Api-Key`. |

Nunca commite `.env`, chaves ou segredos. Em produção, configure uma lista explícita de origens, use HTTPS e coloque um rate limiter distribuído (Redis) diante de múltiplas réplicas.

## 3. Arquitetura

```text
src/
├── domain/games/
│   ├── constants.ts                 universo, conjuntos e combinatória
│   ├── types.ts                     contratos puros
│   ├── ports/RandomSource.ts        porta de aleatoriedade
│   └── services/                    regras sem Express, Zod ou I/O
│       ├── GameGenerator.ts         Fisher-Yates parcial
│       ├── FilterEngine.ts          filtros e envelopes alcançáveis
│       ├── GameAnalyzer.ts           métricas
│       ├── PopularityScorer.ts       score anti-rateio heurístico
│       ├── DiversityAnalyzer.ts      overlap, Jaccard, cobertura e Gini
│       ├── CombinationExpander.ts    generator lexicográfico
│       └── ExpectedValueCalculator.ts EV determinístico/condicional
├── infrastructure/
│   ├── http/routes/                  rotas e validação Zod
│   ├── http/middlewares/             RFC 9457
│   ├── http/openapi/                 documento OpenAPI 3.1
│   ├── random/                       CSPRNG via node:crypto
│   └── pricing/                      tabela versionada em centavos
├── shared/config/                    configuração fail-fast
└── app.ts, server.ts                 composição e boot
```

O gerador nunca usa `Math.random()`. Ele usa `crypto.randomInt` e Fisher-Yates parcial, retornando jogos ordenados, sem duplicatas e uniformes sobre os subconjuntos possíveis. O domínio não importa Express, Zod ou `node:crypto`; a entropia entra pela porta `RandomSource`.

## 4. Endpoints

A base versionada é `http://localhost:3000/api/v1`. Todas as respostas recebem `X-Request-Id`; o cliente pode enviar seu próprio identificador para correlação de logs. Erros usam `Content-Type: application/problem+json` e status `422` para payload sintaticamente JSON, mas semanticamente inválido.

### Operacionais

- `GET /health` — liveness simples: `{ "status": "ok" }`.
- `GET /ready` — readiness da tabela de preços e catálogo de wheels.
- `GET /metrics` — métrica Prometheus mínima (`lotzy_up`).
- `GET /api/v1/openapi.json` — contrato OpenAPI 3.1 publicado pela própria API.

### Geração aleatória

`POST /api/v1/games/generate-random`

```json
{ "quantity": 2, "numbersPerGame": 15, "unique": true }
```

`quantity` varia de 1 a 500 e `numbersPerGame` de 15 a 20. A resposta contém jogos, custo em centavos, quantidade equivalente de apostas simples, tabela de preço, EV fixo informacional e `disclaimer`.

### Geração filtrada

`POST /api/v1/games/generate-filtered`

```json
{
  "quantity": 3,
  "numbersPerGame": 15,
  "fixedNumbers": [2, 10],
  "excludedNumbers": [1, 25],
  "filters": {
    "evens": { "min": 6, "max": 8 },
    "primes": { "min": 4, "max": 6 },
    "sum": { "min": 170, "max": 220 },
    "maxConsecutiveRun": 5,
    "maxPopularityScore": 0.3,
    "maxOverlapWithBatch": 11
  },
  "budget": { "maxAttemptsPerGame": 5000, "maxTotalMs": 1000 }
}
```

Filtros disponíveis: quantidade de pares, primos, Fibonacci, moldura, soma, maior sequência consecutiva, `maxPopularityScore`, sobreposição máxima com jogos aceitos e repetição em relação a `previousDraw`. Antes de sortear, a API calcula um envelope de viabilidade. Se o conjunto solução for vazio, retorna `422 INFEASIBLE_FILTERS` rapidamente. Se o orçamento terminar depois de gerar ao menos um jogo, retorna `206` com `meta.partial: true` e `rejectionsByConstraint`.

`expectedRateioGainCents` acompanha qualquer resposta que use popularidade. É uma estimativa pequena, dependente de premissas, e não altera a chance de acerto.

### Metadados e validação

- `GET /api/v1/games/filters` — catálogo auto-descritivo com domínio, expectativa, cobertura a priori e natureza (`statistical`, `cosmetic` ou `behavioural`).
- `GET /api/v1/games/patterns` — padrões do score heurístico, pesos, versão, confiança e magnitude estimada.
- `POST /api/v1/games/validate` — body `{ "game": [1,2,...,15] }`; normaliza, calcula custo, métricas e warnings não bloqueantes.
- `POST /api/v1/games/analyze` — body `{ "games": [[...]], "page": 1, "pageSize": 100 }`; devolve métricas por jogo, médias, desvio, diversidade, cobertura, Gini e números não cobertos.

### Desdobramento e conferência

`POST /api/v1/games/expand`

```json
{ "numbers": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], "format": "ndjson" }
```

O resultado é a expansão lexicográfica em apostas simples de 15 dezenas. `ndjson` é recomendado e suporta até `C(20,15)=15.504` linhas. JSON único acima de 1.000 combinações retorna `406 UNSUPPORTED_RESPONSE_SIZE`.

`POST /api/v1/games/check`

```json
{
  "drawnNumbers": [2,3,5,8,9,11,13,14,16,18,19,21,22,24,25],
  "games": [[1,2,3,5,8,9,11,13,14,16,19,21,22,24,25]]
}
```

Retorna acertos, faixa (`ELEVEN` a `FIFTEEN` ou `NONE`), prêmios fixos de 11/12/13 em centavos e resumo por faixa. Faixas 14/15 são pari-mutuel.

### Carteira e fechamento

- `POST /api/v1/games/portfolio` — gera até 200 jogos respeitando overlap/popularidade e orçamento; retorna `200` quando a meta é atingida ou `206` quando entrega o melhor resultado possível dentro do orçamento.
- `POST /api/v1/games/wheel` — consulta sistemas pré-computados. A resposta inclui `triggerProbability`, `guarantee.note`, `ticketCount`, limite inferior de Schönheim, versão e data de verificação. Sistemas fora do catálogo retornam `422 WHEEL_NOT_AVAILABLE`; a garantia é sempre condicional e não aumenta a probabilidade de premiação.

### Ferramentas informacionais

- `POST /api/v1/tools/expected-value` — separa EV determinístico das faixas fixas e EV condicional dependente de jackpot, vencedores esperados e prêmio da faixa 14.
- `POST /api/v1/tools/backtest` — recebe `historicDraws` e estratégia; nunca responde sem `statisticalPower`, que informa por que milhares de concursos não têm poder para detectar diferenças na faixa 15.
- `POST /api/v1/tools/bankroll-check` — recebe orçamento mensal, custo e horizonte; projeta apostas, gasto, retorno aproximado e perda esperada, sem recomendação.

## 5. Integração com frontend

O frontend deve consumir o contrato HTTP; não deve duplicar a lógica combinatória. Em React/TypeScript, um cliente mínimo é:

```ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export async function generateRandom(quantity = 1, numbersPerGame = 15) {
  const response = await fetch(`${API_URL}/games/generate-random`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity, numbersPerGame, unique: true }),
  });
  if (!response.ok) {
    const problem = await response.json();
    throw new Error(problem.detail ?? 'Falha ao gerar jogos');
  }
  return response.json() as Promise<{
    data: Array<{ game: number[] }>;
    cost: { totalCents: number; formatted: string };
    disclaimer: string;
  }>;
}
```

Uso em um componente:

```tsx
const [result, setResult] = useState<Awaited<ReturnType<typeof generateRandom>>>();
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string>();

async function onGenerate() {
  setLoading(true); setError(undefined);
  try { setResult(await generateRandom(5, 15)); }
  catch (err) { setError(err instanceof Error ? err.message : 'Erro inesperado'); }
  finally { setLoading(false); }
}
```

Para conectar um frontend local Vite, crie `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

Em produção, substitua pela URL pública da API e defina `CORS_ORIGINS` no backend com a origem exata do frontend. Mostre o `disclaimer` recebido perto do CTA de geração, trate `206` como sucesso parcial, exiba `invalidParams` em `422` por campo e guarde o `X-Request-Id` para suporte/observabilidade. Para desdobramento, use `fetch` e leia a resposta como stream quando `format=ndjson`:

```ts
const response = await fetch(`${API_URL}/games/expand`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
  body: JSON.stringify({ numbers, format: 'ndjson' }),
});
const reader = response.body?.getReader();
// Decodifique chunks, divida por '\\n' e processe cada JSON progressivamente.
```

Nunca transforme o score de popularidade em uma previsão de sorteio na interface. Rotule-o como **heurística de possíveis padrões humanos** e exiba `estimatedGain` junto. Para wheels, exiba a frase da garantia e `triggerProbability` lado a lado.

## 6. Scripts de desenvolvimento

| Comando | Uso |
|---|---|
| `npm run dev` | servidor com watch via `tsx` |
| `npm run build` | compilação TypeScript em `dist/` |
| `npm start` | executa a compilação |
| `npm test` | testes unitários e de integração Vitest |
| `npm run typecheck` | validação sem emitir arquivos |

## 7. Qualidade, segurança e limites

O body máximo é 256 kB. A geração usa limite padrão de 100 requisições por minuto; expansão, backtest e carteira usam limite pesado de 10 por minuto. O servidor desativa `x-powered-by`, usa Helmet, limita CORS e define `trust proxy` apenas em produção. A tabela monetária usa somente centavos inteiros; formatação em reais ocorre na borda.

Os testes cobrem invariantes de tamanho, unicidade, ordenação, geração determinística com fonte injetada, envelope de soma, caso de `free === 0`, score limitado e expansão combinatória, além de `/health`, `X-Request-Id`, geração, catálogo de filtros e erro RFC 9457.

## 8. Licença e escopo

Este software é um gerador/analisador combinatório sem relação institucional com a Caixa Econômica Federal. Não integra a API da Caixa e não persiste histórico. Resultados oficiais devem ser informados pelo cliente em `drawnNumbers`/`historicDraws`. Consulte `SSD-lotofacil-api-2.md` para a especificação completa, fundamentos matemáticos, decisões arquiteturais e roadmap.

## Histórico de resultados

O backend expõe `GET /api/history`, que lê `db/resultados.json` uma vez por requisição e retorna os resultados paginados. A resposta contém `total`, `page`, `limit`, `totalPages` e `data`.

Parâmetros opcionais: `dataInicio`, `dataFim`, `concurso`, `concursoMin`, `concursoMax`, `page`, `limit` e `order` (`asc` ou `desc`). As datas usam `YYYY-MM-DD`, o intervalo é inclusivo e `limit` é limitado a 500. Parâmetros inválidos retornam `400`; arquivo ausente retorna `404`; JSON ilegível retorna `500`.

```bash
curl 'http://localhost:3000/api/history?dataInicio=2026-01-01&dataFim=2026-09-20&limit=50&order=desc'
```

O SSD recebido pressupõe uma aplicação Next.js com Pages Router e páginas frontend. Este repositório é exclusivamente uma API Express/TypeScript: não contém `pages/`, Navbar, nem as rotas `/filtros`, `/analisar`, `/conferir`, `/ferramentas` ou `/carteira`. Por isso, não foram criados redirects ou removidos arquivos inexistentes; a página frontend `/history` deverá consumir este contrato em um repositório de frontend separado.
