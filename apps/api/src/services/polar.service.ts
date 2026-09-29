// OAuth 2.0 real (puerto fiel de BIO360services/polarService.js) + sincronización
// de métricas reales contra AccessLink v3 (antes era un stub que solo conectaba
// y registraba la sincronización sin traer datos — ver session-memory.md).
//
// AccessLink v3 no tiene rango de fechas configurable como Oura: GET
// /users/sleep y /users/nightly-recharge devuelven, cada uno, "los últimos 28
// días" fijos, sin parámetros — confirmado contra el swagger.yaml oficial
// (https://www.polar.com/accesslink-api/swagger.yaml, operationId listNights /
// listNightlyRecharge). Esto sí alcanza para un backfill inicial razonable al
// conectar, sin necesitar el modelo de transacciones (ese modelo solo aplica a
// Exercises/Daily Activity/Physical Info — Sleep y Nightly Recharge son GET
// directos con Bearer token, confirmado contra el cliente oficial
// accesslink-example-python).
import * as wearableService from './wearable.service.js';
import { updateBaselineTimestampsIfNeeded } from './wearable-baseline.service.js';

const POLAR_BASE_URL = 'https://www.polaraccesslink.com/v3';
const POLAR_AUTH_URL = 'https://flow.polar.com/oauth2/authorization';
const POLAR_TOKEN_URL = 'https://polarremote.com/v2/oauth2/token';

type PolarTokenResponse = { access_token: string; refresh_token?: string; expires_in?: number };
type PolarPerfil = { 'polar-user-id'?: number };

type PolarSleep = {
  date: string;
  sleep_start_time?: string;
  sleep_end_time?: string;
  light_sleep?: number;
  deep_sleep?: number;
  rem_sleep?: number;
  unrecognized_sleep_stage?: number;
  total_interruption_duration?: number;
  sleep_score?: number;
};

type PolarNightlyRecharge = {
  date: string;
  heart_rate_avg?: number;
  heart_rate_variability_avg?: number;
  breathing_rate_avg?: number;
  nightly_recharge_status?: number; // escala 1-6 (Polar), no 0-100
};

export function getAuthUrl(clienteId: string): string {
  const state = Buffer.from(JSON.stringify({ clienteId, dispositivo: 'polar' })).toString('base64');
  const params = new URLSearchParams({ client_id: process.env.POLAR_CLIENT_ID!, response_type: 'code', state });
  return `${POLAR_AUTH_URL}?${params.toString()}`;
}

export async function intercambiarToken(code: string): Promise<PolarTokenResponse> {
  const token = Buffer.from(`${process.env.POLAR_CLIENT_ID}:${process.env.POLAR_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(POLAR_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${token}`, Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code }),
  });
  if (!res.ok) throw new Error(`Polar token exchange failed: ${res.status}`);
  return res.json();
}

async function getTokenValido(clienteId: string): Promise<string> {
  // AccessLink no emite refresh_token de forma consistente (a diferencia de
  // Oura/WHOOP) — sus access tokens son de larga duración por diseño, así
  // que no hay lógica de renovación acá (fiel al comportamiento real de la API,
  // no un descuido).
  const tokenData = await wearableService.obtenerToken(clienteId, 'polar');
  if (!tokenData) throw new Error('Polar no conectado');
  return tokenData.accessToken;
}

export async function getPerfil(accessToken: string): Promise<PolarPerfil> {
  const res = await fetch(`${POLAR_BASE_URL}/users`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Polar profile fetch failed: ${res.status}`);
  return res.json();
}

// ── Sincronización real ────────────────────────────────────────────

type MetricasPorFecha = Record<string, wearableService.MetricaInput & Record<string, unknown>>;

const secsToMins = (s: number | null | undefined) => (s != null ? Math.round(s / 60) : null);

export async function sincronizarPolar(clienteId: string): Promise<{ sincronizados: number }> {
  const accessToken = await getTokenValido(clienteId);
  const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };

  const [sleepRes, rechargeRes] = await Promise.allSettled([
    fetch(`${POLAR_BASE_URL}/users/sleep`, { headers }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    fetch(`${POLAR_BASE_URL}/users/nightly-recharge`, { headers }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
  ]);

  const metricasPorFecha: MetricasPorFecha = {};
  const base = (fecha: string) => {
    if (!metricasPorFecha[fecha]) metricasPorFecha[fecha] = { clientId: clienteId, dispositivo: 'polar', fecha };
    return metricasPorFecha[fecha];
  };

  if (sleepRes.status === 'fulfilled') {
    const nights = (sleepRes.value.nights ?? []) as PolarSleep[];
    for (const s of nights) {
      const fecha = s.date;
      if (!fecha) continue;
      Object.assign(base(fecha), {
        suenoScore: s.sleep_score ?? null,
        suenoProfundoMinutos: secsToMins(s.deep_sleep),
        suenoRemMinutos: secsToMins(s.rem_sleep),
        suenoLigeroMinutos: secsToMins(s.light_sleep),
        // Total = suma de las 3 etapas reconocidas + la no reconocida — Polar
        // no da un total_sleep_duration directo como Oura, hay que sumarlo.
        suenoTotalMinutos: secsToMins(
          (s.light_sleep ?? 0) + (s.deep_sleep ?? 0) + (s.rem_sleep ?? 0) + (s.unrecognized_sleep_stage ?? 0)
        ),
        suenoDespiertoMinutos: secsToMins(s.total_interruption_duration),
        horaDormir: s.sleep_start_time ?? null,
        horaDespertar: s.sleep_end_time ?? null,
        rawData: { ...(base(fecha).rawData as object), sleep: s },
      });
    }
  }

  if (rechargeRes.status === 'fulfilled') {
    const recharges = (rechargeRes.value.recharges ?? []) as PolarNightlyRecharge[];
    for (const r of recharges) {
      const fecha = r.date;
      if (!fecha) continue;
      Object.assign(base(fecha), {
        fcReposo: r.heart_rate_avg ?? null,
        hrvNocturno: r.heart_rate_variability_avg ?? null,
        tasaRespiratoria: r.breathing_rate_avg ?? null,
        // nightly_recharge_status es 1-6 en Polar (no 0-100 como el resto de
        // dispositivos) — se reescala linealmente para que quede comparable
        // en cualquier vista que trate recoveryScore como porcentaje.
        recoveryScore: r.nightly_recharge_status != null ? Math.round(((r.nightly_recharge_status - 1) / 5) * 100) : null,
        rawData: { ...(base(fecha).rawData as object), nightlyRecharge: r },
      });
    }
  }

  const metricas = Object.values(metricasPorFecha);
  if (metricas.length > 0) await wearableService.guardarMetricas(metricas);
  await wearableService.actualizarUltimaSync(clienteId, 'polar');
  await updateBaselineTimestampsIfNeeded(clienteId);

  return { sincronizados: metricas.length };
}
