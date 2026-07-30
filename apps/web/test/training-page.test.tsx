import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TrainingPage from '../app/training/page';
import * as apiClient from '../lib/api-client';
import * as trainingClient from '../lib/training-client';
import { confirmSession } from '../lib/training-client';
import { clearPendingAction } from '../lib/deep-link';

vi.mock('../lib/training-client');

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

describe('TrainingPage', () => {
  beforeEach(() => {
    pushMock.mockClear();
    clearPendingAction();
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

  it('executes the NFC confirmation immediately when m/a query params are present and a session exists', async () => {
    vi.spyOn(apiClient, 'getSessionToken').mockReturnValue('fake-token');
    vi.mocked(trainingClient.confirmSession).mockResolvedValue({
      alreadyConfirmedToday: false,
      dayNumber: 1,
      streak: { streakWeeks: 1, sessionsDoneThisWeek: 1, sessionsRequiredThisWeek: 1, protectorAvailable: true, protectorUsedThisWeek: false, atRisk: false },
      phrase: null,
    });
    window.history.pushState({}, '', '/training?m=entrenamiento&a=confirmar');

    render(<TrainingPage />);

    await waitFor(() => expect(trainingClient.confirmSession).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'nfc'));
    expect(await screen.findByText('¡Sesión confirmada!')).toBeInTheDocument();
  });

  it('consumes a pending action from localStorage (no query params) when a session exists', async () => {
    vi.spyOn(apiClient, 'getSessionToken').mockReturnValue('fake-token');
    vi.mocked(trainingClient.confirmSession).mockResolvedValue({
      alreadyConfirmedToday: false,
      dayNumber: 1,
      streak: { streakWeeks: 1, sessionsDoneThisWeek: 1, sessionsRequiredThisWeek: 1, protectorAvailable: true, protectorUsedThisWeek: false, atRisk: false },
      phrase: null,
    });
    window.localStorage.setItem('lt_pending_action', JSON.stringify({ m: 'entrenamiento', a: 'confirmar' }));
    window.history.pushState({}, '', '/training');

    render(<TrainingPage />);

    await waitFor(() => expect(trainingClient.confirmSession).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'nfc'));
    expect(window.localStorage.getItem('lt_pending_action')).toBeNull();
  });
});
