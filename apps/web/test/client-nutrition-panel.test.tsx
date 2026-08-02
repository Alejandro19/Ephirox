import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ClientNutritionPanel } from '../components/nutrition/ClientNutritionPanel';
import * as nutritionClient from '../lib/nutrition-client';

vi.mock('../lib/nutrition-client');

describe('ClientNutritionPanel', () => {
  it('shows the assigned macros and meals', async () => {
    vi.mocked(nutritionClient.getNutrition).mockResolvedValue({
      plan: { dailyCals: 2200, proteinG: 160 },
      meals: [{ id: 'm1', mealTime: 'Desayuno', name: 'Avena', calories: 300, proteinG: 10, carbsG: 40, fatG: 5 }],
    });
    render(<ClientNutritionPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText(/2200/)).toBeInTheDocument());
    expect(screen.getByText(/Avena/)).toBeInTheDocument();
  });

  it('shows a message when no plan has been assigned yet', async () => {
    vi.mocked(nutritionClient.getNutrition).mockResolvedValue({ plan: {}, meals: [] });
    render(<ClientNutritionPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByText('Todavía no tienes un plan de nutrición asignado.')).toBeInTheDocument());
  });

  it('shows a link to the PDF when the plan has one', async () => {
    vi.mocked(nutritionClient.getNutrition).mockResolvedValue({ plan: { dailyCals: 2000, pdfUrl: 'https://x.co/plan.pdf', pdfName: 'plan.pdf' }, meals: [] });
    render(<ClientNutritionPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByRole('link', { name: 'plan.pdf' })).toHaveAttribute('href', 'https://x.co/plan.pdf'));
  });
});
