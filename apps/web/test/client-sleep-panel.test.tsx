import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientSleepPanel } from '../components/sleep/ClientSleepPanel';
import * as sleepClient from '../lib/sleep-client';

vi.mock('../lib/sleep-client');

describe('ClientSleepPanel', () => {
  it('shows the assigned protocol', async () => {
    vi.mocked(sleepClient.getProtocol).mockResolvedValue({ protocolText: 'Apaga pantallas 1h antes.', sleepWindow: '22:30 - 06:30', supplement: 'Magnesio' });
    vi.mocked(sleepClient.getTodayLog).mockResolvedValue(null);
    render(<ClientSleepPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText('Apaga pantallas 1h antes.')).toBeInTheDocument());
    expect(screen.getByText(/22:30 - 06:30/)).toBeInTheDocument();
  });

  it('shows a message when no protocol has been assigned yet', async () => {
    vi.mocked(sleepClient.getProtocol).mockResolvedValue(null);
    vi.mocked(sleepClient.getTodayLog).mockResolvedValue(null);
    render(<ClientSleepPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText('Todavía no tienes un protocolo de sueño asignado.')).toBeInTheDocument());
  });

  it('logs sleep for today', async () => {
    const user = userEvent.setup();
    vi.mocked(sleepClient.getProtocol).mockResolvedValue(null);
    vi.mocked(sleepClient.getTodayLog).mockResolvedValue(null);
    vi.mocked(sleepClient.logSleep).mockResolvedValue({ id: 'l1', date: '2026-08-02', hours: 7, quality: 4 });
    render(<ClientSleepPanel clientId="client-1" />);
    await waitFor(() => screen.getByLabelText('Horas dormidas'));

    await user.type(screen.getByLabelText('Horas dormidas'), '7');
    await user.selectOptions(screen.getByLabelText('Calidad (1-5)'), '4');
    await user.click(screen.getByRole('button', { name: 'Guardar registro de hoy' }));

    await waitFor(() => expect(sleepClient.logSleep).toHaveBeenCalledWith('client-1', { hours: 7, quality: 4 }));
  });
});
