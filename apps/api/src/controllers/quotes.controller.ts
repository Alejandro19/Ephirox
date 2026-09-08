import type { Request, Response } from 'express';
import * as quotesService from '../services/quotes.service.js';

function ok(res: Response, data: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function err(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

export async function listQuotes(_req: Request, res: Response) {
  const quotes = await quotesService.listQuotes();
  return ok(res, { quotes });
}

export async function createQuote(req: Request, res: Response) {
  const { quote, author } = req.body as { quote?: unknown; author?: unknown };
  if (typeof quote !== 'string' || !quote.trim()) return err(res, 'La frase no puede estar vacía.');
  if (author !== undefined && author !== null && typeof author !== 'string') return err(res, 'Autor inválido.');
  const created = await quotesService.createQuote(quote.trim(), (author as string | null) || null);
  return ok(res, { quote: created }, 201);
}

export async function updateQuote(req: Request, res: Response) {
  const { quote, author, active } = req.body as { quote?: unknown; author?: unknown; active?: unknown };
  if (quote !== undefined && (typeof quote !== 'string' || !quote.trim())) return err(res, 'La frase no puede estar vacía.');
  if (author !== undefined && author !== null && typeof author !== 'string') return err(res, 'Autor inválido.');
  if (active !== undefined && typeof active !== 'boolean') return err(res, 'Valor de "active" inválido.');
  const patch: { quote?: string; author?: string | null; active?: boolean } = {};
  if (quote !== undefined) patch.quote = (quote as string).trim();
  if (author !== undefined) patch.author = author as string | null;
  if (active !== undefined) patch.active = active;
  const updated = await quotesService.updateQuote(req.params.id, patch);
  if (!updated) return err(res, 'Frase no encontrada.', 404);
  return ok(res, { quote: updated });
}

export async function deleteQuote(req: Request, res: Response) {
  await quotesService.deleteQuote(req.params.id);
  return ok(res, { message: 'Frase eliminada.' });
}

export async function getQuoteOfTheDay(req: Request, res: Response) {
  const quote = await quotesService.getQuoteOfTheDay(req.params.id);
  return ok(res, { quote });
}

export async function assignQuote(req: Request, res: Response) {
  const { quote_id } = req.body as { quote_id: string | null };
  const client = await quotesService.assignQuote(req.params.id, quote_id);
  if (!client) return err(res, 'Cliente no encontrado.', 404);
  return ok(res, { client });
}
