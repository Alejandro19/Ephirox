'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken } from '@/lib/api-client';
import { confirmSession, type TrainingStreak } from '@/lib/training-client';
import { captureIncomingDeepLink, getPendingAction, clearPendingAction, isTrainingConfirmAction } from '@/lib/deep-link';
import { TrainingShell } from '@/components/training/TrainingShell';
import { SessionConfirmedScreen } from '@/components/training/SessionConfirmedScreen';
import { AdminExercisePanel } from '@/components/training/AdminExercisePanel';
import ClientSwitcher from '@/components/admin/ClientSwitcher';

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

function decodeRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.role === 'string' ? payload.role : null;
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
  const [role, setRole] = useState<string | null>(null);
  const [adminClientId, setAdminClientId] = useState<string | null>(null);
  const [nfcResult, setNfcResult] = useState<{ streak: TrainingStreak; phrase: string | null } | null>(null);
  const [nfcAlreadyConfirmed, setNfcAlreadyConfirmed] = useState(false);

  useEffect(() => {
    const token = getSessionToken();

    if (!token) {
      router.push('/login');
      return;
    }

    const id = decodeClientIdFromToken(token);
    setClientId(id);

    // Un admin no tiene ficha de cliente propia — este módulo se convierte en
    // "elige un cliente y gestiona su entrenamiento" en vez del deep-link/NFC
    // que solo aplica al flujo de auto-servicio de un cliente real.
    if (decodeRoleFromToken(token) === 'admin') {
      setRole('admin');
      setReady(true);
      return;
    }
    setRole('cliente');

    captureIncomingDeepLink(window.location.search);
    // Se lee una sola vez y se limpia de inmediato si existe (consumir-o-descartar):
    // cualquier acción pendiente, reconocida o no, no debe quedar viva para una
    // próxima visita.
    const pending = getPendingAction();
    if (pending) clearPendingAction();
    const hasNfcAction = isTrainingConfirmAction(pending);

    if (hasNfcAction) {
      router.replace('/training');
      confirmSession(id ?? '', clientTz(), 'nfc')
        .then((result) => {
          if (result.alreadyConfirmedToday) {
            setNfcAlreadyConfirmed(true);
          } else {
            setNfcResult({ streak: result.streak, phrase: result.phrase });
          }
        })
        .catch((e: Error) => {
          // El deep-link nunca bloquea el login normal: si falla al consumirse
          // (red, permisos, cliente sin training_days), se descarta silenciosamente
          // y el cliente cae al flujo normal de /training.
          console.error('[training] NFC confirm-session failed (non-fatal):', e);
        })
        .finally(() => setReady(true));
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) return null;

  if (role === 'admin') {
    return (
      <div>
        <h1>Entrenamiento</h1>
        <ClientSwitcher moduleKey="training" selectedClientId={adminClientId} onSelect={setAdminClientId} />
        {adminClientId ? (
          <AdminExercisePanel clientId={adminClientId} />
        ) : (
          <p>Selecciona un cliente para gestionar su entrenamiento.</p>
        )}
      </div>
    );
  }

  if (nfcAlreadyConfirmed) {
    return <p>Ya confirmaste tu sesión de hoy — vuelve mañana para el siguiente día.</p>;
  }
  if (nfcResult) {
    return (
      <SessionConfirmedScreen
        streak={nfcResult.streak}
        phrase={nfcResult.phrase}
        clientId={clientId ?? ''}
        onClose={() => setNfcResult(null)}
      />
    );
  }

  return <TrainingShell clientId={clientId ?? ''} />;
}
