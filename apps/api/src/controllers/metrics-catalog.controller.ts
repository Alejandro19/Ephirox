import type { Request, Response } from 'express';
import type { MetricsCatalogInput, MetricsCatalogUpdate } from '@latribu/shared-types';
import * as metricsService from '../services/metrics-catalog.service.js';

function ok(res: Response, data: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function err(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

export async function listMetrics(req: Request, res: Response) {
  const metrics = await metricsService.listMetricsWithModules();
  return ok(res, { metrics });
}

export async function createMetric(req: Request, res: Response) {
  const metric = await metricsService.createMetric(req.body as MetricsCatalogInput);
  return ok(res, { metric }, 201);
}

export async function updateMetric(req: Request, res: Response) {
  const metric = await metricsService.updateMetric(req.params.metricId, req.body as MetricsCatalogUpdate);
  if (!metric) return err(res, 'Marcador no encontrado.', 404);
  return ok(res, { metric });
}

export async function deleteMetric(req: Request, res: Response) {
  const inUse = await metricsService.countCriteriaUsingMetric(req.params.metricId);
  if (inUse > 0) {
    return err(res, `No se puede eliminar: ${inUse} regla${inUse === 1 ? '' : 's'} de asignación todavía lo usa${inUse === 1 ? '' : 'n'}.`, 409);
  }
  await metricsService.deleteMetric(req.params.metricId);
  return ok(res, { message: 'Marcador eliminado.' });
}
