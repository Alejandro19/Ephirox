import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CortisolPage from '../app/cortisol/page';

vi.mock('../lib/api-client', () => ({
  getSessionToken: () => 'header.eyJpZCI6ImNsaWVudC0xIn0.signature',
}));
vi.mock('../lib/cortisol-client', () => ({
  listTechniques: vi.fn().mockResolvedValue([]),
  getTipOfTheDay: vi.fn().mockResolvedValue(null),
  getTodayCheckin: vi.fn().mockResolvedValue(null),
}));

describe('CortisolPage', () => {
  it('renders the cortisol heading', () => {
    render(<CortisolPage />);
    expect(screen.getByRole('heading', { name: 'Gestión de Cortisol' })).toBeInTheDocument();
  });
});
