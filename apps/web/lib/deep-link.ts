const PENDING_ACTION_KEY = 'lt_pending_action';

export type PendingAction = { m: string; a: string };

export function captureIncomingDeepLink(search: string): void {
  const params = new URLSearchParams(search);
  const m = params.get('m');
  const a = params.get('a');
  if (!m || !a) return;
  window.localStorage.setItem(PENDING_ACTION_KEY, JSON.stringify({ m, a }));
}

export function getPendingAction(): PendingAction | null {
  const raw = window.localStorage.getItem(PENDING_ACTION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAction;
  } catch {
    return null;
  }
}

export function clearPendingAction(): void {
  window.localStorage.removeItem(PENDING_ACTION_KEY);
}

export function isTrainingConfirmAction(action: PendingAction | null): boolean {
  return action !== null && action.m === 'entrenamiento' && action.a === 'confirmar';
}
