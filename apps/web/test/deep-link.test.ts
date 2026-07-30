import { describe, it, expect, beforeEach } from 'vitest';
import { captureIncomingDeepLink, getPendingAction, clearPendingAction, isTrainingConfirmAction } from '../lib/deep-link';

describe('deep-link', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('captures m and a query params into localStorage', () => {
    captureIncomingDeepLink('?m=entrenamiento&a=confirmar');
    expect(getPendingAction()).toEqual({ m: 'entrenamiento', a: 'confirmar' });
  });

  it('does nothing when m or a is missing', () => {
    captureIncomingDeepLink('?m=entrenamiento');
    expect(getPendingAction()).toBeNull();
  });

  it('clearPendingAction removes the stored action', () => {
    captureIncomingDeepLink('?m=entrenamiento&a=confirmar');
    clearPendingAction();
    expect(getPendingAction()).toBeNull();
  });

  it('isTrainingConfirmAction recognizes the entrenamiento:confirmar action only', () => {
    expect(isTrainingConfirmAction({ m: 'entrenamiento', a: 'confirmar' })).toBe(true);
    expect(isTrainingConfirmAction({ m: 'otro', a: 'confirmar' })).toBe(false);
    expect(isTrainingConfirmAction(null)).toBe(false);
  });
});
