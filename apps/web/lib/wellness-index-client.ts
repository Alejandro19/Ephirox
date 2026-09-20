const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3003';

export type WellnessIndexResult = {
  value: number;
  previousValue: number | null;
  delta: number | null;
  trend: 'up' | 'down' | 'stable' | 'none';
  componentsUsed: Record<string, number>;
};

// GET /api/clients/:id/wellness-index — índice unificado (home + Mi
// Evolución). `null` cuando no hay datos suficientes todavía — la card
// simplemente no se muestra.
export async function getWellnessIndex(clientId: string): Promise<WellnessIndexResult | null> {
  const res = await fetch(`${API_BASE_URL}/api/clients/${clientId}/wellness-index`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.data ?? null;
}

export type WellnessIndexHistory = {
  points: { label: string; value: number }[];
  typical: number | null;
};

// Historial + "típico" para la gráfica de tendencia de Índice de rendimiento
// (Evolution, spec 27.2) — days: 7/30/90, mismo selector de rango del módulo.
export async function getWellnessIndexHistory(clientId: string, days: number): Promise<WellnessIndexHistory> {
  const res = await fetch(`${API_BASE_URL}/api/clients/${clientId}/wellness-index/history?days=${days}`, {
    credentials: 'include',
  });
  if (!res.ok) return { points: [], typical: null };
  const body = await res.json();
  return body.data ?? { points: [], typical: null };
}
