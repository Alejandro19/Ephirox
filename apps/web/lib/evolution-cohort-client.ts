import { PermissionDeniedError } from './api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003';

export type CohortMemberRow = { label: string; regulationDeficit: number; atRisk: boolean };
export type CohortWeekPoint = { label: string; value: number };

export type CohortReport = {
  enabled: boolean;
  memberCount: number;
  atRiskCount: number;
  avgRecoveryScore: number | null;
  members: CohortMemberRow[];
  atRiskByWeek: CohortWeekPoint[];
  signalsByPillar: { label: string; value: number; colorKey: 'stress' | 'recovery' }[];
  avgRegulationByWeek: CohortWeekPoint[];
  avgRecoveryByWeek: CohortWeekPoint[];
};

// GET /api/clients/:id/cohort-report — "Reporte de mi equipo" (spec 28). El
// backend re-verifica permissions.reporteEquipo server-side y devuelve 403
// si no está habilitado, sin importar lo que muestre esta pestaña.
export async function getCohortReport(clientId: string): Promise<CohortReport> {
  const res = await fetch(`${API_BASE_URL}/api/clients/${clientId}/cohort-report`, {
    credentials: 'include',
  });
  if (res.status === 403) {
    const body = await res.json().catch(() => ({}));
    throw new PermissionDeniedError(body.error || 'No tienes acceso a Reporte de mi equipo.');
  }
  if (!res.ok) throw new Error('No se pudo cargar el reporte de tu equipo.');
  const body = await res.json();
  return body.report;
}
