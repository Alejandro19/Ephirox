import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithSWR as render } from './swr-test-utils';
import { AdminMetricsCatalogPanel } from '../components/admin/criteria/AdminMetricsCatalogPanel';
import * as criteriaClient from '../lib/assignment-criteria-client';

vi.mock('../lib/assignment-criteria-client');

const HRV_METRIC: criteriaClient.MetricsCatalogEntry = {
  id: 'm1', name: 'HRV basal (RMSSD)', unit: 'ms', source: 'wearable', fieldKey: 'hrvNocturno',
  aggregation: 'latest', referenceRange: { min: 40, max: 60 }, active: true, createdAt: '2026-09-01T00:00:00.000Z',
  modulesInUse: ['stress'],
};

describe('AdminMetricsCatalogPanel (Fase 6)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the seeded metrics with their source and reference range', async () => {
    vi.mocked(criteriaClient.listMetrics).mockResolvedValue([HRV_METRIC]);
    render(<AdminMetricsCatalogPanel />);
    expect(await screen.findByText('HRV basal (RMSSD)')).toBeInTheDocument();
    expect(screen.getByText('ms')).toBeInTheDocument();
    expect(screen.getByText('Wearable')).toBeInTheDocument();
    expect(screen.getByDisplayValue('40')).toBeInTheDocument();
    expect(screen.getByDisplayValue('60')).toBeInTheDocument();
    expect(screen.getByText('Stress')).toBeInTheDocument();
  });

  it('toggles a metric active/inactive', async () => {
    const user = userEvent.setup();
    vi.mocked(criteriaClient.listMetrics).mockResolvedValue([HRV_METRIC]);
    vi.mocked(criteriaClient.updateMetric).mockResolvedValue({ ...HRV_METRIC, active: false });

    render(<AdminMetricsCatalogPanel />);
    await user.click(await screen.findByText('Activo'));
    expect(criteriaClient.updateMetric).toHaveBeenCalledWith('m1', { active: false });
  });

  it('saves an edited reference range', async () => {
    const user = userEvent.setup();
    vi.mocked(criteriaClient.listMetrics).mockResolvedValue([HRV_METRIC]);
    vi.mocked(criteriaClient.updateMetric).mockResolvedValue({ ...HRV_METRIC, referenceRange: { min: 42, max: 58 } });

    render(<AdminMetricsCatalogPanel />);
    const minInput = await screen.findByLabelText('Mínimo de HRV basal (RMSSD)');
    await user.clear(minInput);
    await user.type(minInput, '42');
    const maxInput = screen.getByLabelText('Máximo de HRV basal (RMSSD)');
    await user.clear(maxInput);
    await user.type(maxInput, '58');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(criteriaClient.updateMetric).toHaveBeenCalledWith('m1', { reference_range: { min: 42, max: 58 } });
  });

  it('creates a new metric with a closed field_key selector for a wearable source', async () => {
    const user = userEvent.setup();
    vi.mocked(criteriaClient.listMetrics).mockResolvedValue([]);
    vi.mocked(criteriaClient.createMetric).mockResolvedValue({
      id: 'm2', name: 'Recovery score', unit: '/100', source: 'wearable', fieldKey: 'recoveryScore',
      aggregation: 'latest', referenceRange: null, active: true, createdAt: '2026-09-18T00:00:00.000Z', modulesInUse: [],
    });

    render(<AdminMetricsCatalogPanel />);
    await user.click(await screen.findByRole('button', { name: '+ Agregar marcador' }));
    await user.type(screen.getByLabelText('Nombre'), 'Recovery score');
    await user.type(screen.getByLabelText('Unidad'), '/100');
    await user.selectOptions(screen.getByLabelText('Campo'), 'recoveryScore');
    await user.click(screen.getByRole('button', { name: 'Guardar marcador' }));

    expect(criteriaClient.createMetric).toHaveBeenCalledWith({
      name: 'Recovery score', unit: '/100', source: 'wearable', field_key: 'recoveryScore', aggregation: 'latest',
    });
  });

  it('lets a lab_panel/morning_checkin field_key be typed freely, not from a closed list', async () => {
    const user = userEvent.setup();
    vi.mocked(criteriaClient.listMetrics).mockResolvedValue([]);
    vi.mocked(criteriaClient.createMetric).mockResolvedValue(HRV_METRIC);

    render(<AdminMetricsCatalogPanel />);
    await user.click(await screen.findByRole('button', { name: '+ Agregar marcador' }));
    await user.selectOptions(screen.getByLabelText('Fuente'), 'lab_panel');
    await user.type(screen.getByLabelText('Nombre'), 'Vitamina D');
    await user.type(screen.getByLabelText('Campo'), 'vitaminaD');
    await user.click(screen.getByRole('button', { name: 'Guardar marcador' }));

    expect(criteriaClient.createMetric).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'lab_panel', field_key: 'vitaminaD' })
    );
  });

  it('edits an existing metric\'s name and unit', async () => {
    const user = userEvent.setup();
    vi.mocked(criteriaClient.listMetrics).mockResolvedValue([HRV_METRIC]);
    vi.mocked(criteriaClient.updateMetric).mockResolvedValue({ ...HRV_METRIC, name: 'HRV nocturno (RMSSD)' });

    render(<AdminMetricsCatalogPanel />);
    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    const nameInput = screen.getByLabelText('Nombre');
    await user.clear(nameInput);
    await user.type(nameInput, 'HRV nocturno (RMSSD)');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(criteriaClient.updateMetric).toHaveBeenCalledWith('m1', expect.objectContaining({ name: 'HRV nocturno (RMSSD)' }));
  });

  it('deletes a metric', async () => {
    const user = userEvent.setup();
    vi.mocked(criteriaClient.listMetrics).mockResolvedValue([HRV_METRIC]);
    vi.mocked(criteriaClient.deleteMetric).mockResolvedValue();

    render(<AdminMetricsCatalogPanel />);
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    expect(criteriaClient.deleteMetric).toHaveBeenCalledWith('m1');
  });
});
