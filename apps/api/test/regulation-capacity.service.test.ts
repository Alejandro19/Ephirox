import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { clients, wearableMetricas, regulationCapacityBaselines, regulationCapacityHistory } from '../src/models/schema.js';
import {
  ensureBaseline,
  computeAndStoreRegulationCapacityForDate,
  getRegulationCapacityOverview,
} from '../src/services/regulation-capacity.service.js';

describe('regulation-capacity.service (Fase 7 — índice propio "Capacidad de regulación")', () => {
  let clientId: string;
  let newClientId: string;

  beforeAll(async () => {
    const [client] = await db
      .insert(clients)
      .values({ name: 'Regulation Client', email: `regulation-${Date.now()}@example.com`, status: 'active', clientType: 'coaching_1_1' })
      .returning();
    clientId = client.id;

    const [newClient] = await db
      .insert(clients)
      .values({ name: 'New Wearable Client', email: `regulation-new-${Date.now()}@example.com`, status: 'active', clientType: 'coaching_1_1' })
      .returning();
    newClientId = newClient.id;

    // 8 días de wearable: los primeros 7 (09-01..09-07) fijan el baseline
    // (HRV promedio 40, FC-reposo promedio 60, sueño promedio 70); el
    // octavo (09-08) es "hoy", con HRV más bajo -> capacidad de regulación
    // por debajo de 100. 09-09 queda sin fila de wearable a propósito.
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07'];
    await Promise.all(
      days.map((fecha) => db.insert(wearableMetricas).values({ clientId, dispositivo: 'oura', fecha, hrvNocturno: 40, fcReposo: 60, suenoScore: 70 }))
    );
    await db.insert(wearableMetricas).values({ clientId, dispositivo: 'oura', fecha: '2026-09-08', hrvNocturno: 30, fcReposo: 60, suenoScore: 70 });

    // Cliente nuevo: solo 3 días de wearable — todavía no llega al mínimo de 7.
    await Promise.all(
      ['2026-09-01', '2026-09-02', '2026-09-03'].map((fecha) =>
        db.insert(wearableMetricas).values({ clientId: newClientId, dispositivo: 'oura', fecha, hrvNocturno: 40, fcReposo: 60, suenoScore: 70 })
      )
    );
  }, 30000);

  afterAll(async () => {
    await db.delete(regulationCapacityHistory).where(eq(regulationCapacityHistory.clientId, clientId));
    await db.delete(regulationCapacityBaselines).where(eq(regulationCapacityBaselines.clientId, clientId));
    await db.delete(wearableMetricas).where(eq(wearableMetricas.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));
    await db.delete(wearableMetricas).where(eq(wearableMetricas.clientId, newClientId));
    await db.delete(clients).where(eq(clients.id, newClientId));
  });

  it('does not fix a baseline before the 7-day minimum is reached', async () => {
    const baseline = await ensureBaseline(newClientId);
    expect(baseline).toBeNull();
  });

  it('fixes the baseline from the first 7 days once the minimum is reached, and freezes it on a second call', async () => {
    const baseline = await ensureBaseline(clientId);
    expect(baseline).not.toBeNull();
    expect(Number(baseline!.hrvAvg)).toBeCloseTo(40, 5);
    expect(Number(baseline!.fcReposoAvg)).toBeCloseTo(60, 5);
    expect(Number(baseline!.suenoScoreAvg)).toBeCloseTo(70, 5);
    expect(baseline!.daysUsed).toBe(7);

    // Insertar más wearable después no debe mover el baseline ya congelado.
    await db.insert(wearableMetricas).values({ clientId, dispositivo: 'oura', fecha: '2026-09-09', hrvNocturno: 20, fcReposo: 90, suenoScore: 30 });
    const secondCall = await ensureBaseline(clientId);
    expect(Number(secondCall!.hrvAvg)).toBeCloseTo(40, 5);
  });

  it('computes and stores the score for a day with wearable data, and never inserts a row for a day without one', async () => {
    await computeAndStoreRegulationCapacityForDate(clientId, '2026-09-08');
    const [row] = await db.select().from(regulationCapacityHistory).where(eq(regulationCapacityHistory.clientId, clientId));
    expect(row).toBeDefined();
    // HRV 30 vs baseline 40 -> -25% de desviación en ese componente; FC-reposo
    // y sueño exactos al baseline (0% de desviación) -> score < 100.
    expect(Number(row.score)).toBeLessThan(100);
    expect(Number(row.score)).toBeGreaterThan(0);

    await computeAndStoreRegulationCapacityForDate(clientId, '2026-09-30');
    const rows = await db.select().from(regulationCapacityHistory).where(eq(regulationCapacityHistory.clientId, clientId));
    expect(rows).toHaveLength(1); // sigue habiendo solo la fila del 09-08, nada para el 09-30
  });

  it('getRegulationCapacityOverview returns the stored baseline/trend while the feature flag is on', async () => {
    const overview = await getRegulationCapacityOverview(clientId);
    expect(overview.enabled).toBe(true);
    expect(overview.baseline).not.toBeNull();
    expect(overview.trend.length).toBeGreaterThan(0);
  });

  // Regresión: evolution-cohort.service.ts necesita una ventana más ancha
  // que los 14 días por defecto del dashboard individual del cliente para
  // armar su tendencia de 8 semanas — sin este parámetro, `trend` siempre
  // quedaba truncado a 14 días sin importar cuánto historial hubiera.
  it('accepts a wider days window than the default 14', async () => {
    const overview = await getRegulationCapacityOverview(clientId, 90);
    expect(overview.enabled).toBe(true);
    expect(overview.trend.length).toBeGreaterThan(0);
  });
});
