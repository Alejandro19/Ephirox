import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminStressCasesPanel } from '../components/admin/stress/AdminStressCasesPanel';
import * as casesClient from '../lib/labeled-cases-client';
import * as protocolsClient from '../lib/stress-protocols-client';

vi.mock('../lib/labeled-cases-client');
vi.mock('../lib/stress-protocols-client');

const PROTOCOL: protocolsClient.StressProtocol = {
  id: 'p1', name: 'Recuperación Vagal — Nivel 1', mechanism: 'Respiración', status: 'publicado',
  criteriaId: 'c1', suggestedFrequency: null, defaultCycleWeeks: 12, sortOrder: 0, createdAt: '2026-09-01T00:00:00.000Z',
};

const OVERDUE_CHECKPOINT: casesClient.CaseCheckpointView = {
  id: 'cp1', caseId: 'case-1', weekNumber: 6, status: 'pendiente', valoracion: null, notes: null, completedAt: null,
  dueDate: '2026-09-12T00:00:00.000Z', overdue: true,
};

const CASE_ROW: casesClient.CaseListRow = {
  id: 'case-1', caseNumber: 1245, clientId: 'cl1', clientName: 'Marcela Ortiz', clientType: 'coaching_1_1',
  protocolName: 'Recuperación Vagal — Nivel 1', status: 'vencido', currentWeek: 7, cycleWeeks: 12,
  nextCheckpoint: OVERDUE_CHECKPOINT, outcome: null,
};

describe('AdminStressCasesPanel (punto 24)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([PROTOCOL]);
  });

  it('lists cases with their derived status (activo/vencido/completado)', async () => {
    vi.mocked(casesClient.listCasesDetailed).mockResolvedValue([CASE_ROW]);

    render(<AdminStressCasesPanel />);
    expect(await screen.findByText('Marcela Ortiz')).toBeInTheDocument();
    // "Checkpoint vencido" aparece dos veces a propósito: como opción del
    // filtro de estado y como badge de la fila del caso.
    expect(screen.getAllByText('Checkpoint vencido').length).toBe(2);
    expect(screen.getByText('Semana 7 de 12')).toBeInTheDocument();
  });

  it('expands a case and shows its full detail — regla, consentimiento y checkpoints', async () => {
    const user = userEvent.setup();
    vi.mocked(casesClient.listCasesDetailed).mockResolvedValue([CASE_ROW]);
    vi.mocked(casesClient.getCaseDetail).mockResolvedValue({
      labeledCase: { id: 'case-1', caseNumber: 1245, clientId: 'cl1', module: 'stress', protocolId: 'p1', mentorId: 'm1', assignedAt: '2026-08-01T00:00:00.000Z', cycleWeeks: 12, outcome: null },
      clientName: 'Marcela Ortiz', clientType: 'coaching_1_1',
      mentor: { id: 'm1', name: 'Sofía Duarte', specialty: null },
      protocolName: 'Recuperación Vagal — Nivel 1',
      criteriaName: 'Coherencia Cardíaca — sostenido', criteriaVersion: 1,
      dataResearchConsent: null,
      checkpoints: [OVERDUE_CHECKPOINT],
    });

    render(<AdminStressCasesPanel />);
    await user.click(await screen.findByText('Marcela Ortiz'));

    expect(await screen.findByText('Coherencia Cardíaca — sostenido')).toBeInTheDocument();
    expect(screen.getByText(/Pendiente — cuenta registrada antes de incluir esta autorización/)).toBeInTheDocument();
    expect(screen.getByText(/Vencido hace/)).toBeInTheDocument();
  });

  it('registers an overdue checkpoint with a standardized rating and a short note', async () => {
    const user = userEvent.setup();
    vi.mocked(casesClient.listCasesDetailed).mockResolvedValue([CASE_ROW]);
    vi.mocked(casesClient.getCaseDetail).mockResolvedValue({
      labeledCase: { id: 'case-1', caseNumber: 1245, clientId: 'cl1', module: 'stress', protocolId: 'p1', mentorId: null, assignedAt: '2026-08-01T00:00:00.000Z', cycleWeeks: 12, outcome: null },
      clientName: 'Marcela Ortiz', clientType: 'coaching_1_1',
      mentor: null, protocolName: 'Recuperación Vagal — Nivel 1',
      criteriaName: null, criteriaVersion: null, dataResearchConsent: true,
      checkpoints: [OVERDUE_CHECKPOINT],
    });
    vi.mocked(casesClient.updateCheckpoint).mockResolvedValue({ ...OVERDUE_CHECKPOINT, status: 'completado', valoracion: 'mejora_leve', overdue: false });

    render(<AdminStressCasesPanel />);
    await user.click(await screen.findByText('Marcela Ortiz'));
    await screen.findByText(/Vencido hace/);

    await user.selectOptions(screen.getByLabelText('Valoración estándar'), 'mejora_leve');
    await user.type(screen.getByLabelText('Nota corta (opcional)'), 'Mejoró tensión percibida.');
    await user.click(screen.getByRole('button', { name: 'Guardar checkpoint' }));

    expect(casesClient.updateCheckpoint).toHaveBeenCalledWith('case-1', 6, { status: 'completado', valoracion: 'mejora_leve', notes: 'Mejoró tensión percibida.' });
  });

  it('links to the CSV export for the Stress module', async () => {
    vi.mocked(casesClient.listCasesDetailed).mockResolvedValue([]);
    vi.mocked(casesClient.exportCasesCsvUrl).mockReturnValue('http://localhost:3003/api/admin/labeled-cases/export.csv?module=stress');

    render(<AdminStressCasesPanel />);
    const link = await screen.findByRole('link', { name: 'Exportar CSV (Stress)' });
    expect(link).toHaveAttribute('href', 'http://localhost:3003/api/admin/labeled-cases/export.csv?module=stress');
  });
});
