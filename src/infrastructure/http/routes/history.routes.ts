import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';

export type HistoryResult = {
  concurso: number;
  data: string;
  dezenas: number[];
  premiacoes?: Record<string, number>;
  acumulado: boolean;
  valorEstimadoProximoConcurso?: number;
};

const router = Router();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function queryValue(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? undefined : String(value);
}

function isIsoDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function invalid(res: Response, parameter: string): Response {
  return res.status(400).json({ error: `Parâmetro '${parameter}' inválido` });
}

function parseInteger(value: string | undefined, parameter: string, res: Response): number | undefined | null {
  if (value === undefined || value === '') return undefined;
  if (!/^\d+$/.test(value)) { invalid(res, parameter); return null; }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) { invalid(res, parameter); return null; }
  return parsed;
}

function loadResults(): HistoryResult[] {
  const file = path.join(process.cwd(), 'db', 'resultados.json');
  if (!fs.existsSync(file)) {
    const error = new Error('Base de resultados não encontrada');
    error.name = 'HistoryNotFoundError';
    throw error;
  }

  const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('Resultados inválidos');
  return parsed as HistoryResult[];
}

router.get('/history', (req: Request, res: Response) => {
  const dataInicio = queryValue(req.query.dataInicio);
  const dataFim = queryValue(req.query.dataFim);
  const concurso = queryValue(req.query.concurso);
  const concursoMin = queryValue(req.query.concursoMin);
  const concursoMax = queryValue(req.query.concursoMax);
  const pageValue = queryValue(req.query.page) ?? '1';
  const limitValue = queryValue(req.query.limit) ?? '50';
  const order = queryValue(req.query.order) ?? 'desc';

  if (dataInicio !== undefined && !isIsoDate(dataInicio)) return invalid(res, 'dataInicio');
  if (dataFim !== undefined && !isIsoDate(dataFim)) return invalid(res, 'dataFim');
  if (dataInicio && dataFim && dataInicio > dataFim) return invalid(res, 'dataInicio');
  if (order !== 'asc' && order !== 'desc') return invalid(res, 'order');

  const parsedConcurso = parseInteger(concurso, 'concurso', res);
  const parsedConcursoMin = parseInteger(concursoMin, 'concursoMin', res);
  const parsedConcursoMax = parseInteger(concursoMax, 'concursoMax', res);
  const page = parseInteger(pageValue, 'page', res);
  const requestedLimit = parseInteger(limitValue, 'limit', res);
  if (parsedConcurso === null || parsedConcursoMin === null || parsedConcursoMax === null || page === null || requestedLimit === null) {
    return res;
  }
  if (page === undefined || page < 1) return invalid(res, 'page');
  if (requestedLimit === undefined || requestedLimit < 1) return invalid(res, 'limit');
  const limit = Math.min(500, requestedLimit);

  try {
    let results = loadResults();
    results = results.filter((result) => {
      if (dataInicio && result.data < dataInicio) return false;
      if (dataFim && result.data > dataFim) return false;
      if (parsedConcurso !== undefined && result.concurso !== parsedConcurso) return false;
      if (parsedConcursoMin !== undefined && result.concurso < parsedConcursoMin) return false;
      if (parsedConcursoMax !== undefined && result.concurso > parsedConcursoMax) return false;
      return true;
    });

    results.sort((a, b) => order === 'asc' ? a.concurso - b.concurso : b.concurso - a.concurso);
    const total = results.length;
    const offset = (page - 1) * limit;
    return res.status(200).json({ total, page, limit, totalPages: Math.ceil(total / limit), data: results.slice(offset, offset + limit) });
  } catch (error) {
    if (error instanceof Error && error.name === 'HistoryNotFoundError') return res.status(404).json({ error: 'Base de resultados não encontrada' });
    return res.status(500).json({ error: 'Falha ao processar resultados' });
  }
});

export { router as historyRoutes };
