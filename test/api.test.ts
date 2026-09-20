import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/app.js';

const app = createApp();
const resultsFile = path.join(process.cwd(), 'db', 'resultados.json');
const results = [
  { concurso: 2700, data: '2026-09-15', dezenas: [3, 7, 12, 24, 31, 45], acumulado: true },
  { concurso: 2699, data: '2026-09-12', dezenas: [1, 5, 22, 33, 41, 50], acumulado: false },
  { concurso: 2698, data: '2026-09-10', dezenas: [2, 8, 13, 19, 27, 44], acumulado: true },
];
let originalResults: string | undefined;

beforeAll(() => {
  originalResults = fs.existsSync(resultsFile) ? fs.readFileSync(resultsFile, 'utf8') : undefined;
  fs.mkdirSync(path.dirname(resultsFile), { recursive: true });
  fs.writeFileSync(resultsFile, JSON.stringify(results));
});

afterAll(() => {
  if (originalResults === undefined) fs.rmSync(resultsFile, { force: true });
  else fs.writeFileSync(resultsFile, originalResults);
});

describe('API', () => {
  it('expõe health e request id', async () => {
    const r = await request(app).get('/health').set('X-Request-Id', 'test-request');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
    expect(r.headers['x-request-id']).toBe('test-request');
  });

  it('gera jogos aleatórios', async () => {
    const r = await request(app).post('/api/v1/games/generate-random').send({ quantity: 2, numbersPerGame: 15 });
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(2);
    expect(r.body.disclaimer).toBeTruthy();
  });

  it('expõe filtros', async () => {
    const r = await request(app).get('/api/v1/games/filters');
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'sum' })]));
  });

  it('retorna 422 em payload inválido', async () => {
    const r = await request(app).post('/api/v1/games/generate-random').send({ quantity: 0 });
    expect(r.status).toBe(422);
    expect(r.headers['content-type']).toMatch(/problem\+json/);
  });
});

describe('GET /api/history', () => {
  it('retorna resultados em ordem decrescente por padrão', async () => {
    const r = await request(app).get('/api/history');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ total: 3, page: 1, limit: 50, totalPages: 1 });
    expect(r.body.data.map((item: { concurso: number }) => item.concurso)).toEqual([2700, 2699, 2698]);
  });

  it('aplica filtros inclusivos de data e concurso', async () => {
    const byDate = await request(app).get('/api/history?dataInicio=2026-09-12&dataFim=2026-09-15');
    expect(byDate.body.data.map((item: { concurso: number }) => item.concurso)).toEqual([2700, 2699]);
    const byContest = await request(app).get('/api/history?concurso=2700');
    expect(byContest.body.data).toHaveLength(1);
    expect(byContest.body.data[0].concurso).toBe(2700);
  });

  it('respeita paginação e ordenação ascendente', async () => {
    const r = await request(app).get('/api/history?page=2&limit=1&order=asc');
    expect(r.body).toMatchObject({ total: 3, page: 2, limit: 1, totalPages: 3 });
    expect(r.body.data[0].concurso).toBe(2699);
  });

  it('rejeita parâmetros inválidos', async () => {
    const invalidDate = await request(app).get('/api/history?dataInicio=2026-10-01&dataFim=2026-09-01');
    expect(invalidDate.status).toBe(400);
    expect(invalidDate.body.error).toContain('dataInicio');
    const invalidLimit = await request(app).get('/api/history?limit=0');
    expect(invalidLimit.status).toBe(400);
  });

  it('retorna 500 para JSON inválido', async () => {
    fs.writeFileSync(resultsFile, '{invalid');
    const r = await request(app).get('/api/history');
    expect(r.status).toBe(500);
    expect(r.body.error).toBe('Falha ao processar resultados');
    fs.writeFileSync(resultsFile, JSON.stringify(results));
  });
});
