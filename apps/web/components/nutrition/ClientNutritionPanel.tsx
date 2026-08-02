'use client';

import { useEffect, useState } from 'react';
import { getNutrition, type NutritionPlan, type Meal } from '../../lib/nutrition-client';

export function ClientNutritionPanel({ clientId }: { clientId: string }) {
  const [plan, setPlan] = useState<NutritionPlan>({});
  const [meals, setMeals] = useState<Meal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNutrition(clientId)
      .then((result) => {
        setPlan(result.plan);
        setMeals(result.meals);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p>Cargando tu plan de nutrición...</p>;
  if (error) return <p role="alert">{error}</p>;
  if (plan.dailyCals == null && !plan.pdfUrl) return <p>Todavía no tienes un plan de nutrición asignado.</p>;

  return (
    <div>
      <p>Calorías diarias: {plan.dailyCals ?? '—'}</p>
      <p>Proteína: {plan.proteinG ?? '—'} g</p>
      <p>Carbohidratos: {plan.carbsG ?? '—'} g</p>
      <p>Grasas: {plan.fatG ?? '—'} g</p>
      {plan.pdfUrl && (
        <a href={plan.pdfUrl} target="_blank" rel="noreferrer">
          {plan.pdfName || 'Ver PDF'}
        </a>
      )}

      <h3>Comidas</h3>
      {meals.length === 0 ? (
        <p>Sin comidas asignadas.</p>
      ) : (
        <ul>
          {meals.map((meal) => (
            <li key={meal.id}>
              {meal.mealTime} — {meal.name} ({meal.calories} kcal)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
