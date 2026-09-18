import { eq, inArray, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients, wearableMetricas } from '../models/schema.js';

export type ActiveClientBaseline = {
  id: string;
  name: string;
  clientType: string;
  fecha: string | null;
  hrvNocturno: number | null;
  fcReposo: number | null;
  suenoScore: number | null;
  recoveryScore: number | null;
};

// Fase 4 del rediseño de Stress (spec 19.1/19.3): clientes activos + su
// snapshot de wearable más reciente, en una sola llamada — para el panel de
// baseline y el checklist de "Asignar a clientes activos". No existía este
// agregado (clients.service.ts::listClients solo trae un conteo de días con
// datos, no el valor más reciente). Reduce en memoria en vez de un
// `DISTINCT ON` de Postgres: esta versión de drizzle-orm (0.36.4) no expone
// un builder para eso, y la cantidad de clientes activos es chica.
export async function listActiveClientsWithLatestWearable(): Promise<ActiveClientBaseline[]> {
  const activeClients = await db
    .select({ id: clients.id, name: clients.name, clientType: clients.clientType })
    .from(clients)
    .where(eq(clients.status, 'active'));

  const clientIds = activeClients.map((c) => c.id);
  if (clientIds.length === 0) return [];

  const rows = await db
    .select({
      clientId: wearableMetricas.clientId,
      fecha: wearableMetricas.fecha,
      hrvNocturno: wearableMetricas.hrvNocturno,
      fcReposo: wearableMetricas.fcReposo,
      suenoScore: wearableMetricas.suenoScore,
      recoveryScore: wearableMetricas.recoveryScore,
    })
    .from(wearableMetricas)
    .where(inArray(wearableMetricas.clientId, clientIds))
    .orderBy(desc(wearableMetricas.fecha));

  const latestByClient = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByClient.has(row.clientId)) latestByClient.set(row.clientId, row);
  }

  return activeClients.map((c) => {
    const latest = latestByClient.get(c.id);
    return {
      id: c.id,
      name: c.name,
      clientType: c.clientType,
      fecha: latest?.fecha ?? null,
      hrvNocturno: latest?.hrvNocturno ?? null,
      fcReposo: latest?.fcReposo ?? null,
      suenoScore: latest?.suenoScore ?? null,
      recoveryScore: latest?.recoveryScore ?? null,
    };
  });
}
