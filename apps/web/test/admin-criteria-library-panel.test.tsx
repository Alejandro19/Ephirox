import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminCriteriaLibraryPanel } from '../components/admin/criteria/AdminCriteriaLibraryPanel';
import * as criteriaClient from '../lib/assignment-criteria-client';

vi.mock('../lib/assignment-criteria-client');

const HRV_METRIC: criteriaClient.MetricsCatalogEntry = {
  id: 'm1', name: 'HRV basal (RMSSD)', unit: 'ms', source: 'wearable', fieldKey: 'hrvNocturno',
  aggregation: 'latest', referenceRange: { min: 40, max: 60 }, active: true, createdAt: '2026-09-01T00:00:00.000Z',
  modulesInUse: ['stress'],
};
const CORTISOL_METRIC: criteriaClient.MetricsCatalogEntry = {
  id: 'm2', name: 'Cortisol PM', unit: 'µg/dL', source: 'lab_panel', fieldKey: 'cortisol',
  aggregation: 'latest', referenceRange: { min: 6, max: 18 }, active: true, createdAt: '2026-09-01T00:00:00.000Z',
  modulesInUse: [],
};

const DRAFT_CRITERIA: criteriaClient.AssignmentCriteria = {
  id: 'c1', name: 'Recuperación Vagal — criterio estándar',
  conditions: { op: 'AND', rules: [{ metric_id: 'm1', operator: 'menor_que', value: 40 }, { metric_id: 'm2', operator: 'mayor_que', value: 15 }] },
  applicableModules: ['stress'], status: 'borrador', version: 1, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
  protocolCount: 2,
};

describe('AdminCriteriaLibraryPanel (Fase 6 — armador de reglas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(criteriaClient.listMetrics).mockResolvedValue([HRV_METRIC, CORTISOL_METRIC]);
  });

  it('shows an empty state with no criteria yet', async () => {
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([]);
    render(<AdminCriteriaLibraryPanel />);
    expect(await screen.findByText('Aún no hay reglas de asignación guardadas.')).toBeInTheDocument();
  });

  it('shows how many protocols are using each criterion', async () => {
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([DRAFT_CRITERIA]);
    render(<AdminCriteriaLibraryPanel />);
    expect(await screen.findByText('2 protocolos')).toBeInTheDocument();
  });

  it('creates a criterion with 2 chained AND conditions, saved as borrador', async () => {
    const user = userEvent.setup();
    vi.mocked(criteriaClient.listCriteria).mockResolvedValueOnce([]).mockResolvedValueOnce([DRAFT_CRITERIA]);
    vi.mocked(criteriaClient.createCriteria).mockResolvedValue(DRAFT_CRITERIA);

    render(<AdminCriteriaLibraryPanel />);
    await screen.findByText('Aún no hay reglas de asignación guardadas.');
    await user.click(screen.getByRole('button', { name: '+ Crear nueva regla' }));

    await user.type(screen.getByLabelText('Nombre de la regla'), 'Recuperación Vagal — criterio estándar');
    await user.click(screen.getByRole('checkbox', { name: 'Stress' }));

    // Fila 1 (HRV < 40, default), agrega una segunda condición y la configura.
    await user.click(screen.getByRole('button', { name: '+ Agregar condición' }));
    const metricSelects = screen.getAllByLabelText('Métrica');
    await user.selectOptions(metricSelects[1], 'm2');
    const operatorSelects = screen.getAllByLabelText('Operador');
    await user.selectOptions(operatorSelects[1], 'mayor_que');
    const valueInputs = screen.getAllByLabelText(/^Valor/);
    await user.clear(valueInputs[0]);
    await user.type(valueInputs[0], '40');
    await user.clear(valueInputs[1]);
    await user.type(valueInputs[1], '15');

    await user.click(screen.getByRole('button', { name: 'Guardar regla en la librería' }));

    expect(criteriaClient.createCriteria).toHaveBeenCalledWith({
      name: 'Recuperación Vagal — criterio estándar',
      applicable_modules: ['stress'],
      conditions: {
        op: 'AND',
        rules: [
          { metric_id: 'm1', operator: 'menor_que', value: 40 },
          { metric_id: 'm2', operator: 'mayor_que', value: 15 },
        ],
      },
    });
    expect(await screen.findByText('Recuperación Vagal — criterio estándar')).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
  });

  it('publishes a borrador criterion via the "Publicar" button', async () => {
    const user = userEvent.setup();
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([DRAFT_CRITERIA]);
    vi.mocked(criteriaClient.publishCriteria).mockResolvedValue({ ...DRAFT_CRITERIA, status: 'publicado' });

    render(<AdminCriteriaLibraryPanel />);
    await user.click(await screen.findByRole('button', { name: 'Publicar' }));
    expect(criteriaClient.publishCriteria).toHaveBeenCalledWith('c1');
  });

  it('editing an already-published criterion saves it as a new version, not a draft patch', async () => {
    const user = userEvent.setup();
    const published: criteriaClient.AssignmentCriteria = { ...DRAFT_CRITERIA, status: 'publicado' };
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([published]);
    vi.mocked(criteriaClient.publishCriteria).mockResolvedValue({ ...published, version: 2 });

    render(<AdminCriteriaLibraryPanel />);
    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Guardar como nueva versión' }));

    expect(criteriaClient.publishCriteria).toHaveBeenCalledWith('c1', expect.objectContaining({ name: DRAFT_CRITERIA.name }));
    expect(criteriaClient.updateDraftCriteria).not.toHaveBeenCalled();
  });

  it('deletes a criterion', async () => {
    const user = userEvent.setup();
    vi.mocked(criteriaClient.listCriteria).mockResolvedValue([DRAFT_CRITERIA]);
    vi.mocked(criteriaClient.deleteCriteria).mockResolvedValue();

    render(<AdminCriteriaLibraryPanel />);
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(criteriaClient.deleteCriteria).toHaveBeenCalledWith('c1');
  });
});
