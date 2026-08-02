import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminNutritionPanel } from '../components/nutrition/AdminNutritionPanel';
import * as nutritionClient from '../lib/nutrition-client';

vi.mock('../lib/nutrition-client');

describe('AdminNutritionPanel', () => {
  beforeEach(() => {
    vi.mocked(nutritionClient.getNutrition).mockResolvedValue({ plan: {}, meals: [] });
  });

  it('loads and shows the current plan macros', async () => {
    vi.mocked(nutritionClient.getNutrition).mockResolvedValue({ plan: { dailyCals: 2200 }, meals: [] });
    render(<AdminNutritionPanel clientId="client-1" />);
    await waitFor(() => expect(screen.getByLabelText('Calorías diarias')).toHaveValue(2200));
  });

  it('saves the plan macros', async () => {
    const user = userEvent.setup();
    vi.mocked(nutritionClient.saveNutritionPlan).mockResolvedValue({ dailyCals: 2000 });
    render(<AdminNutritionPanel clientId="client-1" />);
    await waitFor(() => screen.getByLabelText('Calorías diarias'));

    await user.clear(screen.getByLabelText('Calorías diarias'));
    await user.type(screen.getByLabelText('Calorías diarias'), '2000');
    await user.click(screen.getByRole('button', { name: 'Guardar plan' }));

    await waitFor(() => expect(nutritionClient.saveNutritionPlan).toHaveBeenCalledWith('client-1', expect.objectContaining({ daily_cals: 2000 })));
  });

  it('adds a meal', async () => {
    const user = userEvent.setup();
    vi.mocked(nutritionClient.createMeal).mockResolvedValue({ id: 'meal-1', mealTime: 'Desayuno', name: 'Avena', calories: 300, proteinG: 10, carbsG: 40, fatG: 5 });
    render(<AdminNutritionPanel clientId="client-1" />);
    await waitFor(() => screen.getByLabelText('Calorías diarias'));

    await user.type(screen.getByLabelText('Momento'), 'Desayuno');
    await user.type(screen.getByLabelText('Nombre de la comida'), 'Avena');
    await user.click(screen.getByRole('button', { name: 'Agregar comida' }));

    await waitFor(() => expect(nutritionClient.createMeal).toHaveBeenCalledWith('client-1', expect.objectContaining({ meal_time: 'Desayuno', name: 'Avena' })));
  });
});
