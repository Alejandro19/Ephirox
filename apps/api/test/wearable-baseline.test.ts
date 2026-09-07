import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { clients, wearableMetricas } from '../src/models/schema.js';
import { updateBaselineTimestampsIfNeeded } from '../src/services/wearable-baseline.service.js';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe('wearable-baseline.service', () => {
  let clientId: string;

  beforeAll(async () => {
    const [client] = await db
      .insert(clients)
      .values({ name: 'Baseline Client', email: `baseline-${Date.now()}@example.com`, status: 'active', clientType: 'mentoring' })
      .returning();
    clientId = client.id;
  });

  afterAll(async () => {
    await db.delete(clients).where(eq(clients.id, clientId));
  });

  afterEach(async () => {
    await db.delete(wearableMetricas).where(eq(wearableMetricas.clientId, clientId));
    await db.update(clients).set({ wearableBaselineReadyAt: null, wearableBaselineStableAt: null }).where(eq(clients.id, clientId));
  });

  // Antes cada día se insertaba con su propio await secuencial — 28 round
  // trips uno detrás del otro a la base remota de pruebas eran lentos incluso
  // en condiciones normales, y con la latencia de red del día empujaban el
  // test justo por encima del timeout de 10s de Vitest (confirmado: fallaba
  // igual corriéndolo solo, sin ninguna otra suite en paralelo — no era
  // contención de CPU). Un solo insert con un array hace el mismo trabajo en
  // un solo viaje de red.
  it('does not set any timestamp with fewer than 7 days of data', async () => {
    await db.insert(wearableMetricas).values(
      Array.from({ length: 5 }, (_, i) => ({ clientId, dispositivo: 'whoop', fecha: daysAgo(i) }))
    );
    await updateBaselineTimestampsIfNeeded(clientId);
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    expect(client.wearableBaselineReadyAt).toBeNull();
    expect(client.wearableBaselineStableAt).toBeNull();
  });

  it('sets wearableBaselineReadyAt once 7 distinct days exist, but not wearableBaselineStableAt', async () => {
    await db.insert(wearableMetricas).values(
      Array.from({ length: 7 }, (_, i) => ({ clientId, dispositivo: 'whoop', fecha: daysAgo(i) }))
    );
    await updateBaselineTimestampsIfNeeded(clientId);
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    expect(client.wearableBaselineReadyAt).not.toBeNull();
    expect(client.wearableBaselineStableAt).toBeNull();
  });

  it('sets both timestamps once 28 distinct days exist', async () => {
    await db.insert(wearableMetricas).values(
      Array.from({ length: 28 }, (_, i) => ({ clientId, dispositivo: 'whoop', fecha: daysAgo(i) }))
    );
    await updateBaselineTimestampsIfNeeded(clientId);
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    expect(client.wearableBaselineReadyAt).not.toBeNull();
    expect(client.wearableBaselineStableAt).not.toBeNull();
  });

  it('never overwrites an already-set timestamp (idempotent)', async () => {
    await db.insert(wearableMetricas).values(
      Array.from({ length: 7 }, (_, i) => ({ clientId, dispositivo: 'whoop', fecha: daysAgo(i) }))
    );
    await updateBaselineTimestampsIfNeeded(clientId);
    const [first] = await db.select().from(clients).where(eq(clients.id, clientId));
    const firstReadyAt = first.wearableBaselineReadyAt;

    await updateBaselineTimestampsIfNeeded(clientId);
    const [second] = await db.select().from(clients).where(eq(clients.id, clientId));
    expect(second.wearableBaselineReadyAt?.getTime()).toBe(firstReadyAt?.getTime());
  });

  it('counts distinct days across multiple devices, not per-device totals', async () => {
    await db.insert(wearableMetricas).values([
      ...Array.from({ length: 4 }, (_, i) => ({ clientId, dispositivo: 'whoop', fecha: daysAgo(i) })),
      ...Array.from({ length: 3 }, (_, i) => ({ clientId, dispositivo: 'oura', fecha: daysAgo(i + 10) })),
    ]);
    await updateBaselineTimestampsIfNeeded(clientId);
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    expect(client.wearableBaselineReadyAt).not.toBeNull();
  });
});
