import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSWR as render } from './swr-test-utils';
import { ClientRestPanel } from '../components/rest/ClientRestPanel';
import * as wearableClient from '../lib/wearable-client';
import * as sleepClient from '../lib/sleep-client';
import * as clientsClient from '../lib/clients-client';
import * as restToolsClient from '../lib/rest-tools-client';
import { PermissionDeniedError } from '../lib/api-client';

vi.mock('../lib/wearable-client');
vi.mock('../lib/sleep-client');
vi.mock('../lib/clients-client');
vi.mock('../lib/rest-tools-client');

const sampleMetrics: wearableClient.WearableMetrica[] = [
  {
    id: 'm2', dispositivo: 'oura', fecha: '2026-08-05',
    fcReposo: 54, hrvNocturno: 62, suenoTotalMinutos: 462,
    suenoProfundoMinutos: 111, suenoRemMinutos: 212, suenoLigeroMinutos: 112, suenoDespiertoMinutos: 15,
    suenoScore: 86, tasaRespiratoria: 14.2, temperaturaPiel: 0.2,
    horaDormir: '2026-08-04T23:48:00Z', horaDespertar: '2026-08-05T07:30:00Z',
  },
  {
    id: 'm1', dispositivo: 'oura', fecha: '2026-08-04',
    fcReposo: 56, hrvNocturno: 57, suenoTotalMinutos: 420,
    suenoProfundoMinutos: 100, suenoRemMinutos: 190, suenoLigeroMinutos: 100, suenoDespiertoMinutos: 12,
    suenoScore: 78, tasaRespiratoria: 14.0, temperaturaPiel: 0.1,
    horaDormir: '2026-08-04T00:00:00Z', horaDespertar: '2026-08-04T07:00:00Z',
  },
];

function mockFetches({
  clientType = 'mentoring',
  metrics = sampleMetrics,
  protocol = null,
}: {
  clientType?: string;
  metrics?: wearableClient.WearableMetrica[];
  protocol?: sleepClient.SleepProtocol;
} = {}) {
  vi.mocked(wearableClient.getMetricas).mockResolvedValue({ total: metrics.length, promedios: {}, data: metrics });
  vi.mocked(wearableClient.getWearableEstado).mockResolvedValue([
    { dispositivo: 'oura', conectado: true, conectadoEn: '2026-07-01T00:00:00Z', ultimaSync: new Date(Date.now() - 12 * 60000).toISOString(), tokenExpirado: false },
  ]);
  vi.mocked(sleepClient.getProtocol).mockResolvedValue(protocol);
  vi.mocked(clientsClient.fetchClient).mockResolvedValue({
    id: 'client-1', name: 'Ana', email: 'a@x.com', plan: '', status: 'active', clientType,
  });
  vi.mocked(restToolsClient.listRestTools).mockResolvedValue([]);
}

describe('ClientRestPanel', () => {
  it('shows the sleep score, duration and hypnogram for a mentoring client', async () => {
    mockFetches();
    render(<ClientRestPanel clientId="client-1" />);
    expect(await screen.findByText('86')).toBeInTheDocument();
    expect(screen.getByText(/puntaje de sueño · óptimo/)).toBeInTheDocument();
    // MetricValue separa cifra y unidad en spans distintos (spec de cifras).
    expect(screen.getByText('7:42')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText(/profundo 1:51/)).toBeInTheDocument();
    expect(screen.getByText(/REM 3:32/)).toBeInTheDocument();
    // Despierto usa el dato real del wearable (Oura: awake_time), nunca la
    // resta total-(profundo+rem+ligero) — ver bug reportado, siempre daba 0.
    expect(screen.getByText(/despierto 0:15/)).toBeInTheDocument();
  });

  it('shows recovery metric cards computed from the latest sync', async () => {
    mockFetches();
    render(<ClientRestPanel clientId="client-1" />);
    // MetricValue separa cifra y unidad en spans distintos (spec de cifras).
    expect(await screen.findByText('62')).toBeInTheDocument();
    expect(screen.getByText('MS')).toBeInTheDocument();
    expect(screen.getByText('54')).toBeInTheDocument();
    expect(screen.getByText('BPM')).toBeInTheDocument();
    expect(screen.getByText('14.2')).toBeInTheDocument();
    expect(screen.getByText('RPM')).toBeInTheDocument();
    expect(screen.getByText(/↑ \d+% vs\. prom\./)).toBeInTheDocument();
  });

  it('renders the trend chart with a point per synced day', async () => {
    mockFetches();
    render(<ClientRestPanel clientId="client-1" />);
    expect(await screen.findByText('Tendencia · últimos 7 días')).toBeInTheDocument();
  });

  it('renders the personalized protocol with bold action and italic context', async () => {
    mockFetches({ protocol: { protocolText: '**Prioriza tu hora de acostarte** incluso los viernes.', sleepWindow: null, supplement: 'Magnesio · 45 min antes' } });
    render(<ClientRestPanel clientId="client-1" />);
    expect(await screen.findByText('Prioriza tu hora de acostarte')).toBeInTheDocument();
    expect(screen.getByText(/incluso los viernes\./)).toBeInTheDocument();
    expect(screen.getByText('Suplemento sugerido')).toBeInTheDocument();
    expect(screen.getByText('Magnesio · 45 min antes')).toBeInTheDocument();
  });

  it('skips a same-day row that only has readiness (no sleep detail yet) and shows the last complete night instead', async () => {
    // Reproduce el bug reportado: Oura publica el readiness de hoy antes que
    // el detalle de sueño (llega después) — esa fila queda con todo en null
    // salvo temperaturaPiel, y nunca debe mostrarse como "Anoche".
    const partialToday: wearableClient.WearableMetrica = {
      id: 'm3', dispositivo: 'oura', fecha: '2026-08-06',
      fcReposo: null, hrvNocturno: null, suenoTotalMinutos: null,
      suenoProfundoMinutos: null, suenoRemMinutos: null, suenoLigeroMinutos: null, suenoDespiertoMinutos: null,
      suenoScore: null, tasaRespiratoria: null, temperaturaPiel: -0.2,
      horaDormir: null, horaDespertar: null,
    };
    mockFetches({ metrics: [partialToday, ...sampleMetrics] });
    render(<ClientRestPanel clientId="client-1" />);
    // El puntaje 86 y la duración 7:42 son de la última noche COMPLETA (m2),
    // no de la fila parcial de hoy.
    expect(await screen.findByText('86')).toBeInTheDocument();
    expect(screen.getByText('7:42')).toBeInTheDocument();
  });

  it('shows an empty state in the hero when no wearable data has synced yet', async () => {
    mockFetches({ metrics: [] });
    render(<ClientRestPanel clientId="client-1" />);
    expect(await screen.findByText('Aún no hay datos sincronizados desde tu Oura Ring.')).toBeInTheDocument();
  });

  it('locks the module behind an overlay for a non-mentoring client', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    mockFetches({ clientType: 'coaching_1_1' });
    render(<ClientRestPanel clientId="client-1" />);

    expect(await screen.findByText('Disponible en Premium')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hablar con tu coach' }));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank');
  });

  it('shows the generic upgrade card (not "Módulo no disponible") when the module itself is not allowed for this client type', async () => {
    mockFetches();
    vi.mocked(sleepClient.getProtocol).mockRejectedValue(new PermissionDeniedError('Este módulo no está disponible para tu tipo de cuenta.'));
    render(<ClientRestPanel clientId="client-1" />);

    expect(await screen.findByText('Disponible en Premium')).toBeInTheDocument();
  });
});
