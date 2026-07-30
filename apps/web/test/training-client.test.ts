import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClient from '../lib/api-client';
import { listExercises, createExercise, reorderExercise, confirmSession } from '../lib/training-client';

beforeEach(() => {
  vi.spyOn(apiClient, 'getSessionToken').mockReturnValue('fake-token');
  global.fetch = vi.fn();
});

describe('training-client', () => {
  it('listExercises returns the exercises array on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: true, exercises: [{ id: 'e1', title: 'Sentadilla' }] }),
    });
    const result = await listExercises('client-1');
    expect(result).toEqual([{ id: 'e1', title: 'Sentadilla' }]);
  });

  it('createExercise throws with the server error message on failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: false, error: 'Datos inválidos.' }),
    });
    await expect(
      createExercise('client-1', { title: '', day_number: 1, category: 'strength' })
    ).rejects.toThrow('Datos inválidos.');
  });

  it('reorderExercise sends the direction and returns the updated list', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: true, exercises: [{ id: 'e1', sortOrder: 1 }] }),
    });
    const result = await reorderExercise('client-1', 'e1', 'down');
    expect(result).toEqual([{ id: 'e1', sortOrder: 1 }]);
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ direction: 'down' });
  });

  it('confirmSession returns alreadyConfirmedToday and dayNumber', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: true, alreadyConfirmedToday: false, dayNumber: 2 }),
    });
    const result = await confirmSession('client-1', 'America/Mexico_City');
    expect(result).toEqual({ alreadyConfirmedToday: false, dayNumber: 2 });
  });
});
