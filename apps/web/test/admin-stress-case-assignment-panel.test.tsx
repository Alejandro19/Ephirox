import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminStressCaseAssignmentPanel } from '../components/stress/AdminStressCaseAssignmentPanel';
import * as protocolsClient from '../lib/stress-protocols-client';
import * as mentorsClient from '../lib/mentors-client';
import * as casesClient from '../lib/labeled-cases-client';

vi.mock('../lib/stress-protocols-client');
vi.mock('../lib/mentors-client');
vi.mock('../lib/labeled-cases-client');

const PUBLISHED_PROTOCOL: protocolsClient.StressProtocol = {
  id: 'p1', name: 'Recuperación Vagal — Nivel 1', mechanism: 'Respiración', status: 'publicado', sortOrder: 0, createdAt: '2026-09-01T00:00:00.000Z',
};
const MENTOR: mentorsClient.Mentor = { id: 'm1', name: 'Sofía Duarte', specialty: null, active: true, createdAt: '2026-09-01T00:00:00.000Z' };

describe('AdminStressCaseAssignmentPanel', () => {
  it('lets the admin assign a published protocol + mentor to a client, creating a labeled case', async () => {
    const user = userEvent.setup();
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([PUBLISHED_PROTOCOL]);
    vi.mocked(mentorsClient.listMentors).mockResolvedValue([MENTOR]);
    vi.mocked(casesClient.getActiveCase).mockResolvedValueOnce(null).mockResolvedValueOnce({
      labeledCase: { id: 'case-1', caseNumber: 1, clientId: 'client-1', module: 'stress', protocolId: 'p1', mentorId: 'm1', assignedAt: new Date().toISOString(), cycleWeeks: 12, outcome: null },
      mentor: MENTOR,
      protocol: PUBLISHED_PROTOCOL,
      resources: [],
      checkpoints: [],
    });
    vi.mocked(casesClient.createCase).mockResolvedValue({
      id: 'case-1', caseNumber: 1, clientId: 'client-1', module: 'stress', protocolId: 'p1', mentorId: 'm1', assignedAt: new Date().toISOString(), cycleWeeks: 12, outcome: null,
    });

    render(<AdminStressCaseAssignmentPanel clientId="client-1" />);
    await screen.findByLabelText('Protocolo publicado');

    await user.selectOptions(screen.getByLabelText('Protocolo publicado'), 'p1');
    await user.selectOptions(screen.getByLabelText('Mentor (opcional)'), 'm1');
    await user.click(screen.getByRole('button', { name: 'Asignar protocolo' }));

    expect(casesClient.createCase).toHaveBeenCalledWith('client-1', { module: 'stress', protocol_id: 'p1', mentor_id: 'm1', cycle_weeks: 12 });
    expect(await screen.findByText(/Caso #1/)).toBeInTheDocument();
  });

  it('shows the currently active case with a "cerrar caso" action instead of the assignment form', async () => {
    const user = userEvent.setup();
    vi.mocked(protocolsClient.listProtocols).mockResolvedValue([PUBLISHED_PROTOCOL]);
    vi.mocked(mentorsClient.listMentors).mockResolvedValue([MENTOR]);
    vi.mocked(casesClient.getActiveCase).mockResolvedValue({
      labeledCase: { id: 'case-1', caseNumber: 7, clientId: 'client-1', module: 'stress', protocolId: 'p1', mentorId: 'm1', assignedAt: '2026-09-01T00:00:00.000Z', cycleWeeks: 12, outcome: null },
      mentor: MENTOR,
      protocol: PUBLISHED_PROTOCOL,
      resources: [],
      checkpoints: [],
    });
    vi.mocked(casesClient.closeCase).mockResolvedValue({
      id: 'case-1', caseNumber: 7, clientId: 'client-1', module: 'stress', protocolId: 'p1', mentorId: 'm1', assignedAt: '2026-09-01T00:00:00.000Z', cycleWeeks: 12, outcome: 'cerrado',
    });

    render(<AdminStressCaseAssignmentPanel clientId="client-1" />);
    expect(await screen.findByText('Caso #7')).toBeInTheDocument();
    expect(screen.queryByLabelText('Protocolo publicado')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar caso' }));
    expect(casesClient.closeCase).toHaveBeenCalledWith('case-1', 'cerrado');
  });
});
