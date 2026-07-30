import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseForm } from '../components/training/ExerciseForm';

describe('ExerciseForm', () => {
  it('shows series/reps and hides duration for a non-cardio category', () => {
    render(<ExerciseForm onSubmit={vi.fn()} submitLabel="Crear" />);
    expect(screen.getByLabelText('Series')).toBeInTheDocument();
    expect(screen.getByLabelText('Repeticiones')).toBeInTheDocument();
    expect(screen.queryByLabelText('Duración')).not.toBeInTheDocument();
  });

  it('shows duration and hides series/reps when category is cardio', () => {
    render(<ExerciseForm onSubmit={vi.fn()} submitLabel="Crear" />);
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'cardio' } });
    expect(screen.getByLabelText('Duración')).toBeInTheDocument();
    expect(screen.queryByLabelText('Series')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Repeticiones')).not.toBeInTheDocument();
  });

  it('applies the same toggle when editing an existing cardio exercise', () => {
    render(
      <ExerciseForm
        initial={{ title: 'Trote', day_number: 2, category: 'cardio', duration: '20:00' }}
        onSubmit={vi.fn()}
        submitLabel="Guardar"
      />
    );
    expect(screen.getByLabelText('Duración')).toBeInTheDocument();
    expect(screen.queryByLabelText('Series')).not.toBeInTheDocument();
  });

  it('calls onSubmit with the current form values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ExerciseForm onSubmit={onSubmit} submitLabel="Crear" />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Sentadilla' } });
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Series'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Repeticiones'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sentadilla', day_number: 2, category: 'strength', series: 4, reps: '10' })
    );
  });
});
