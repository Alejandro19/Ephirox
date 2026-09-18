import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminStressProtocolCriteriaAndAssignment } from '../components/stress/AdminStressProtocolCriteriaAndAssignment';
import * as protocolsClient from '../lib/stress-protocols-client';
import * as criteriaClient from '../lib/assignment-criteria-client';
import * as baselineClient from '../lib/admin-client-baseline-client';
import * as casesClient from '../lib/labeled-cases-client';

vi.mock('../lib/stress-protocols-client');
vi.mock('../lib/assignment-criteria-client');
vi.mock('../lib/admin-client-baseline-client');
vi.mock('../lib/labeled-cases-client');

const HRV_METRIC: criteriaClient.MetricsCatalogEntry = {
  id: 'm1', name: 'HRV basal (RMSSD)', unit: 'ms', source: 'wearable', fieldKey: 'hrvNocturno',
  aggregation: 'latest', referenceRange: { min: 40, max: 60 }, active: true, createdAt: '2026-09-01T00:00:00.000Z',
  modulesInUse: ['stress'],
};
const PUBLISHED_CRITERIA: criteriaClient.AssignmentCriteria = {
  id: 'crit1', name: 'Recuperación Vagal — criterio estándar',
  conditions: { metric_id: 'm1', operator: 'menor_que', value: 40 },
  applicableModules: ['stress'], status: 'publicado', version: 1, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
  protocolCount: 0,
};
const CAMILA = { id: 'cl1', name: 'Camila Ruiz', clientType: 'coaching_1_1', fecha: '2026-09-16', hrvNocturno: 35, fcReposo: 68, suenoScore: 62, recoveryScore: null };
const JULIAN = { id: 'cl2', name: 'Julián Rendón', clientType: 'coaching_1_1', fecha: '2026-09-16', hrvNocturno: 50, fcReposo: 60, suenoScore: 70, recoveryScore: null };

describe('AdminStressProtocolCriteriaAndAssignment (Fase 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(criteriaClient.listMetrics).mockResolvedValue([HRV_METRIC]);
    vi.mocked(baselineClient.listActiveClientsWithBaseline).mockResolvedValue([CAMILA, JULIAN]);
    vi.mocked(casesClient.listRecentCases).mockResolvedValue([]);
  });

  it('only offers published, stress-applicable criteria in the selector', async () => {
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([
      PUBLISHED_CRITERIA,
      { ...PUBLISHED_CRITERIA, id: 'crit2', name: 'Borrador sin publicar', status: 'borrador' },
      { ...PUBLISHED_CRITERIA, id: 'crit3', name: 'Publicado de Nutrition', applicableModules: ['nutrition'] },
    ]);

    render(<AdminStressProtocolCriteriaAndAssignment protocolId="p1" criteriaId={null} onCriteriaChange={vi.fn()} />);
    const select = await screen.findByLabelText('Criterio guardado');
    expect(select.textContent).toContain('Recuperación Vagal — criterio estándar');
    expect(select.textContent).not.toContain('Borrador sin publicar');
    expect(select.textContent).not.toContain('Publicado de Nutrition');
  });

  it('selecting a criterion saves it on the protocol and shows the read-only chip summary', async () => {
    const user = userEvent.setup();
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([PUBLISHED_CRITERIA]);
    vi.mocked(protocolsClient.updateProtocolCriteria).mockResolvedValue({} as protocolsClient.StressProtocol);
    vi.mocked(criteriaClient.getMatchingClients).mockResolvedValue([CAMILA]);
    const onCriteriaChange = vi.fn();

    render(<AdminStressProtocolCriteriaAndAssignment protocolId="p1" criteriaId={null} onCriteriaChange={onCriteriaChange} />);
    await user.selectOptions(await screen.findByLabelText('Criterio guardado'), 'crit1');

    expect(protocolsClient.updateProtocolCriteria).toHaveBeenCalledWith('p1', 'crit1');
    expect(onCriteriaChange).toHaveBeenCalledWith('crit1');
  });

  it('shows the chip summary and preselects/tags matching clients when a criteria is already set', async () => {
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([PUBLISHED_CRITERIA]);
    vi.mocked(criteriaClient.getMatchingClients).mockResolvedValue([CAMILA]);

    render(<AdminStressProtocolCriteriaAndAssignment protocolId="p1" criteriaId="crit1" onCriteriaChange={vi.fn()} />);

    const operatorEl = await screen.findByText('menor que');
    const chip = operatorEl.closest('span');
    expect(chip).toHaveTextContent('HRV basal (RMSSD)');
    expect(chip).toHaveTextContent('40 ms');

    const camilaRow = (await screen.findByText('Camila Ruiz')).closest('label')!;
    expect(camilaRow.querySelector('input[type="checkbox"]')).toBeChecked();
    expect(camilaRow).toHaveTextContent('Cumple criterio');

    const julianRow = screen.getByText('Julián Rendón').closest('label')!;
    expect(julianRow.querySelector('input[type="checkbox"]')).not.toBeChecked();
    expect(julianRow).toHaveTextContent('No cumple');
  });

  it('filters the client checklist by search', async () => {
    const user = userEvent.setup();
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([]);

    render(<AdminStressProtocolCriteriaAndAssignment protocolId="p1" criteriaId={null} onCriteriaChange={vi.fn()} />);
    await screen.findByText('Camila Ruiz');
    await user.type(screen.getByLabelText('Buscar cliente activo'), 'Julián');

    expect(screen.queryByText('Camila Ruiz')).not.toBeInTheDocument();
    expect(screen.getByText('Julián Rendón')).toBeInTheDocument();
  });

  it('assigns the protocol to the checked clients, creating one labeled case per client', async () => {
    const user = userEvent.setup();
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([]);
    vi.mocked(casesClient.createCase).mockResolvedValue({} as casesClient.LabeledCase);

    render(<AdminStressProtocolCriteriaAndAssignment protocolId="p1" criteriaId={null} onCriteriaChange={vi.fn()} />);
    const camilaRow = (await screen.findByText('Camila Ruiz')).closest('label')!;
    await user.click(camilaRow.querySelector('input[type="checkbox"]')!);

    await user.click(screen.getByRole('button', { name: /Asignar protocolo a 1 cliente/ }));

    expect(casesClient.createCase).toHaveBeenCalledWith('cl1', { module: 'stress', protocol_id: 'p1', mentor_id: null });
    expect(await screen.findByText(/1 caso\(s\) etiquetado\(s\) creado\(s\)/)).toBeInTheDocument();
  });

  it('shows a log of recent case assignments', async () => {
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([]);
    vi.mocked(casesClient.listRecentCases).mockResolvedValue([
      { id: 'case-1', caseNumber: 1247, clientName: 'Camila Ruiz', clientType: 'coaching_1_1', protocolName: 'Recuperación Vagal — Nivel 1', mentorName: 'Sofía Duarte', assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    ]);

    render(<AdminStressProtocolCriteriaAndAssignment protocolId="p1" criteriaId={null} onCriteriaChange={vi.fn()} />);

    expect(await screen.findByText('Asignaciones recientes')).toBeInTheDocument();
    expect(screen.getByText(/Recuperación Vagal — Nivel 1/)).toBeInTheDocument();
    expect(screen.getByText(/Caso #1247/)).toBeInTheDocument();
  });
});
