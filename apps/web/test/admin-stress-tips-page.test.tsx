import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminStressTipsPage from '../app/(app)/admin/stress-tips/page';
import * as stressTipsClient from '../lib/stress-tips-client';

vi.mock('../lib/stress-tips-client');

describe('AdminStressTipsPage', () => {
  it('renders the tips bank panel', async () => {
    vi.mocked(stressTipsClient.listTips).mockResolvedValue([]);
    render(<AdminStressTipsPage />);
    expect(screen.getByRole('heading', { name: 'Tips de Stress' })).toBeInTheDocument();
    await waitFor(() => expect(stressTipsClient.listTips).toHaveBeenCalled());
  });
});
