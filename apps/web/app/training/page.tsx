'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken } from '../../lib/api-client';
import { confirmSession, type TrainingStreak } from '../../lib/training-client';
import { captureIncomingDeepLink, getPendingAction, clearPendingAction, isTrainingConfirmAction } from '../../lib/deep-link';
import { TrainingShell } from '../../components/training/TrainingShell';
import { SessionConfirmedScreen } from '../../components/training/SessionConfirmedScreen';

// Mismo patrón que apps/web/app/onboarding/page.tsx: el JWT ya trae el id del
// cliente en su payload — decodificarlo evita un round-trip solo para saber
// "quién soy". La autorización real de cada llamada la sigue haciendo el
// backend (ownerOrAdmin + requirePermission) sin importar este valor local.
function decodeClientIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.id === 'string' ? payload.id : null;
  } catch {
    return null;
  }
}

function clientTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export default function TrainingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [nfcResult, setNfcResult] = useState<{ streak: TrainingStreak; phrase: string | null } | null>(null);
  const [nfcError, setNfcError] = useState<string | null>(null);

  useEffect(() => {
    const token = getSessionToken();

    captureIncomingDeepLink(window.location.search);
    const pending = getPendingAction();
    const hasNfcAction = isTrainingConfirmAction(pending);

    if (!token) {
      router.push('/login');
      return;
    }

    const id = decodeClientIdFromToken(token);
    setClientId(id);

    if (hasNfcAction) {
      clearPendingAction();
      router.replace('/training');
      confirmSession(id ?? '', clientTz(), 'nfc')
        .then((result) => setNfcResult({ streak: result.streak, phrase: result.phrase }))
        .catch((e: Error) => setNfcError(e.message))
        .finally(() => setReady(true));
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) return null;
  if (nfcError) return <p role="alert">{nfcError}</p>;
  if (nfcResult) {
    return <SessionConfirmedScreen streak={nfcResult.streak} phrase={nfcResult.phrase} onClose={() => setNfcResult(null)} />;
  }

  return <TrainingShell clientId={clientId ?? ''} />;
}
