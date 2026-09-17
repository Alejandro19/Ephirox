import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminMentorList } from '../components/admin/AdminMentorList';
import * as mentorsClient from '../lib/mentors-client';

vi.mock('../lib/mentors-client');

describe('AdminMentorList', () => {
  it('shows an empty state when there are no mentors yet', async () => {
    vi.mocked(mentorsClient.listMentors).mockResolvedValue([]);
    render(<AdminMentorList />);
    expect(await screen.findByText('Aún no hay mentores en el catálogo.')).toBeInTheDocument();
  });

  it('creates a mentor and it appears in the list', async () => {
    const user = userEvent.setup();
    const created = { id: 'm1', name: 'Sofía Duarte', specialty: 'Regulación del sistema nervioso', active: true, createdAt: '2026-09-17T00:00:00.000Z' };
    vi.mocked(mentorsClient.listMentors).mockResolvedValueOnce([]).mockResolvedValueOnce([created]);
    vi.mocked(mentorsClient.createMentor).mockResolvedValue(created);

    render(<AdminMentorList />);
    await screen.findByText('Aún no hay mentores en el catálogo.');

    await user.type(screen.getByLabelText('Nombre'), 'Sofía Duarte');
    await user.type(screen.getByLabelText('Especialidad (opcional)'), 'Regulación del sistema nervioso');
    await user.click(screen.getByRole('button', { name: '+ Agregar mentor' }));

    expect(mentorsClient.createMentor).toHaveBeenCalledWith('Sofía Duarte', 'Regulación del sistema nervioso');
    expect(await screen.findByText('Sofía Duarte')).toBeInTheDocument();
  });

  it('toggles a mentor active/inactive', async () => {
    const user = userEvent.setup();
    const mentor = { id: 'm1', name: 'Sofía Duarte', specialty: null, active: true, createdAt: '2026-09-17T00:00:00.000Z' };
    vi.mocked(mentorsClient.listMentors).mockResolvedValue([mentor]);
    vi.mocked(mentorsClient.updateMentor).mockResolvedValue({ ...mentor, active: false });

    render(<AdminMentorList />);
    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
    expect(mentorsClient.updateMentor).toHaveBeenCalledWith('m1', { active: false });
  });
});
