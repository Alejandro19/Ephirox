import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SleepProtocolPage from '../app/(app)/sleep-protocol/page';

vi.mock('../lib/api-client', () => ({
  getSessionToken: () => 'header.eyJpZCI6ImNsaWVudC0xIn0.signature',
}));
vi.mock('../lib/sleep-client', () => ({
  getProtocol: vi.fn().mockResolvedValue(null),
  getTodayLog: vi.fn().mockResolvedValue(null),
}));

describe('SleepProtocolPage', () => {
  it('renders the sleep protocol heading', () => {
    render(<SleepProtocolPage />);
    expect(screen.getByRole('heading', { name: 'Protocolo de Sueño' })).toBeInTheDocument();
  });
});
