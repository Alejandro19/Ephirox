import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.getByText('wearable')).toBeInTheDocument();
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
});
