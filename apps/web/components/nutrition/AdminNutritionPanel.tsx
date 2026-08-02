'use client';

import { useEffect, useState } from 'react';
import { getNutrition, saveNutritionPlan, uploadNutritionPdf, createMeal, deleteMeal, type NutritionPlan, type Meal } from '../../lib/nutrition-client';

export function AdminNutritionPanel({ clientId }: { clientId: string }) {
  const [plan, setPlan] = useState<NutritionPlan>({});
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dailyCals, setDailyCals] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [fatG, setFatG] = useState('');
  const [notes, setNotes] = useState('');
  const [mealTime, setMealTime] = useState('');
  const [mealName, setMealName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refetch() {
    const result = await getNutrition(clientId);
    setPlan(result.plan);
    setMeals(result.meals);
    setDailyCals(result.plan.dailyCals != null ? String(result.plan.dailyCals) : '');
    setProteinG(result.plan.proteinG != null ? String(result.plan.proteinG) : '');
    setCarbsG(result.plan.carbsG != null ? String(result.plan.carbsG) : '');
    setFatG(result.plan.fatG != null ? String(result.plan.fatG) : '');
    setNotes(result.plan.notes || '');
  }

  useEffect(() => {
    refetch()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  async function handleSavePlan() {
    try {
      await saveNutritionPlan(clientId, {
        daily_cals: dailyCals ? Number(dailyCals) : undefined,
        protein_g: proteinG ? Number(proteinG) : undefined,
        carbs_g: carbsG ? Number(carbsG) : undefined,
        fat_g: fatG ? Number(fatG) : undefined,
        notes: notes || null,
      });
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleUploadPdf(file: File) {
    try {
      await uploadNutritionPdf(clientId, file);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleAddMeal() {
    if (!mealTime.trim() || !mealName.trim()) return;
    try {
      await createMeal(clientId, { meal_time: mealTime.trim(), name: mealName.trim() });
      setMealTime('');
      setMealName('');
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDeleteMeal(mealId: string) {
    try {
      await deleteMeal(clientId, mealId);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p>Cargando plan de nutrición...</p>;

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="nutrition-daily-cals">Calorías diarias</label>
      <input id="nutrition-daily-cals" type="number" value={dailyCals} onChange={(e) => setDailyCals(e.target.value)} />
      <label htmlFor="nutrition-protein">Proteína (g)</label>
      <input id="nutrition-protein" type="number" value={proteinG} onChange={(e) => setProteinG(e.target.value)} />
      <label htmlFor="nutrition-carbs">Carbohidratos (g)</label>
      <input id="nutrition-carbs" type="number" value={carbsG} onChange={(e) => setCarbsG(e.target.value)} />
      <label htmlFor="nutrition-fat">Grasas (g)</label>
      <input id="nutrition-fat" type="number" value={fatG} onChange={(e) => setFatG(e.target.value)} />
      <label htmlFor="nutrition-notes">Notas</label>
      <textarea id="nutrition-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button type="button" onClick={handleSavePlan}>
        Guardar plan
      </button>

      <label htmlFor="nutrition-pdf">PDF del plan</label>
      <input
        id="nutrition-pdf"
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadPdf(file);
        }}
      />
      {plan.pdfUrl && (
        <a href={plan.pdfUrl} target="_blank" rel="noreferrer">
          {plan.pdfName || 'Ver PDF'}
        </a>
      )}

      <h3>Comidas</h3>
      <label htmlFor="meal-time">Momento</label>
      <input id="meal-time" value={mealTime} onChange={(e) => setMealTime(e.target.value)} />
      <label htmlFor="meal-name">Nombre de la comida</label>
      <input id="meal-name" value={mealName} onChange={(e) => setMealName(e.target.value)} />
      <button type="button" onClick={handleAddMeal}>
        Agregar comida
      </button>

      {meals.length === 0 ? (
        <p>Sin comidas asignadas.</p>
      ) : (
        <ul>
          {meals.map((meal) => (
            <li key={meal.id}>
              {meal.mealTime} — {meal.name} ({meal.calories} kcal)
              <button type="button" onClick={() => handleDeleteMeal(meal.id)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
