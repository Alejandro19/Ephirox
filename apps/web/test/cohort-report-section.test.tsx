import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithSWR as render } from './swr-test-utils';
import { CohortReportSection } from '../components/evolution/CohortReportSection';
import * as cohortClient from '../lib/evolution-cohort-client';
import { PermissionDeniedError } from '../lib/api-client';
import type { CohortReport } from '../lib/evolution-cohort-client';

vi.mock('../lib/evolution-cohort-client');

const FULL_REPORT: CohortReport = {
  enabled: true,
  memberCount: 3,
  atRiskCount: 1,
  avgRecoveryScore: 58,
  members: [
    { label: 'Miembro 1', regulationDeficit: 12, atRisk: true },
    { label: 'Miembro 2', regulationDeficit: 0, atRisk: false },
    { label: 'Miembro 3', regulationDeficit: 0, atRisk: false },
  ],
  atRiskByWeek: [{ label: 'Sem 1', value: 2 }, { label: 'Sem 2', value: 1 }],
  signalsByPillar: [{ label: 'Estrés', value: 2, colorKey: 'stress' }, { label: 'Recuperación', value: 1, colorKey: 'recovery' }],
  avgRegulationByWeek: [{ label: 'Sem 1', value: 70 }, { label: 'Sem 2', value: 72 }],
  avgRecoveryByWeek: [{ label: 'Sem 1', value: 55 }, { label: 'Sem 2', value: 58 }],
};

describe('CohortReportSection', () => {
  it('shows the 3 KPI tiles and anonymized member bars — never a real name', async () => {
    vi.mocked(cohortClient.getCohortReport).mockResolvedValue(FULL_REPORT);
    render(<CohortReportSection clientId="leader-1" />);

    expect(await screen.findByText('Miembros en el equipo')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1 de 3')).toBeInTheDocument();
    expect(screen.getByText('Distancia bajo su propio típico — por miembro')).toBeInTheDocument();
  });

  it('shows an empty state when the leader has no eligible cohort members yet', async () => {
    vi.mocked(cohortClient.getCohortReport).mockResolvedValue({ ...FULL_REPORT, memberCount: 0, members: [] });
    render(<CohortReportSection clientId="leader-1" />);
    expect(await screen.findByText(/Aún no hay miembros de tu equipo/)).toBeInTheDocument();
  });

  it('shows a neutral message instead of a premium upsell when the backend denies access', async () => {
    vi.mocked(cohortClient.getCohortReport).mockRejectedValue(new PermissionDeniedError('No tienes acceso a Reporte de mi equipo.'));
    render(<CohortReportSection clientId="leader-1" />);
    expect(await screen.findByText('Reporte de mi equipo no está habilitado para tu cuenta.')).toBeInTheDocument();
  });
});
