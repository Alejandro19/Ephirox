import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrainingPage from '../app/training/page';
import * as apiClient from '../lib/api-client';
import * as trainingClient from '../lib/training-client';

vi.mock('../lib/training-client');

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('TrainingPage', () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(trainingClient.getClientTrainingDays).mockResolvedValue(0);
    vi.mocked(trainingClient.listExercises).mockResolvedValue([]);
    vi.mocked(trainingClient.listTrainingCompletions).mockResolvedValue([]);
  });

  it('redirects to /login when there is no session token', () => {
    vi.spyOn(apiClient, 'getSessionToken').mockReturnValue(null);
    render(<TrainingPage />);
    expect(pushMock).toHaveBeenCalledWith('/login');
  });

  it('renders the training home once a session token is present', async () => {
    vi.spyOn(apiClient, 'getSessionToken').mockReturnValue('fake-token');
    render(<TrainingPage />);
    await screen.findByText('Entrenamiento');
  });
});
