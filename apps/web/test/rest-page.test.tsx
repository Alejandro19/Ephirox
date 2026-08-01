import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RestPage from '../app/rest/page';
import * as restToolsClient from '../lib/rest-tools-client';

describe('RestPage', () => {
  it('renders the client panel', async () => {
    vi.spyOn(restToolsClient, 'listRestTools').mockResolvedValue([]);
    render(<RestPage />);
    expect(await screen.findByText('Herramientas para dormir')).toBeInTheDocument();
  });
});
