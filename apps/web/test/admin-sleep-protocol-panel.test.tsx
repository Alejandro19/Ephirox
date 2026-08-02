import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminSleepProtocolPanel } from '../components/sleep/AdminSleepProtocolPanel';
import * as sleepClient from '../lib/sleep-client';

vi.mock('../lib/sleep-client');

describe('AdminSleepProtocolPanel', () => {
  beforeEach(() => {
    vi.mocked(sleepClient.getProtocol).mockResolvedValue(null);
  });

  it('loads and shows the current protocol', async () => {
    vi.mocked(sleepClient.getProtocol).mockResolvedValue({ protocolText: 'Apaga pantallas', sleepWindow: '22:30 - 06:30', supplement: null });
    render(<AdminSleepProtocolPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByLabelText('Protocolo')).toHaveValue('Apaga pantallas'));
  });

  it('saves the protocol', async () => {
    const user = userEvent.setup();
    vi.mocked(sleepClient.saveProtocol).mockResolvedValue({ protocolText: 'Nuevo protocolo', sleepWindow: null, supplement: null });
    render(<AdminSleepProtocolPanel clientId="client-1" />);
    await waitFor(() => screen.getByLabelText('Protocolo'));

    await user.type(screen.getByLabelText('Protocolo'), 'Nuevo protocolo');
    await user.click(screen.getByRole('button', { name: 'Guardar protocolo' }));

    await waitFor(() => expect(sleepClient.saveProtocol).toHaveBeenCalledWith('client-1', expect.objectContaining({ protocol_text: 'Nuevo protocolo' })));
  });
});
