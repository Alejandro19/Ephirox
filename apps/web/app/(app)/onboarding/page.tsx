'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getPersonalInfoAccess, type PersonalInfoVariant } from '@/lib/onboarding-client';
import { WizardShell } from '@/components/onboarding/WizardShell';
import LockedOverlay from '@/components/ui/LockedOverlay';

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();
  const [ready, setReady] = useState(false);
  const [variant, setVariant] = useState<PersonalInfoVariant>('none');
  const clientId = user?.id ?? null;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // El módulo 10 (Dispositivos y Laboratorios) y el acceso mismo a este
    // formulario ahora los decide la matriz de "Roles y Perfiles", no un
    // clientType leído del token — ver require-personal-info-access
    // middleware en el backend.
    getPersonalInfoAccess(clientId ?? '')
      .then(setVariant)
      .catch(() => setVariant('none'))
      .finally(() => setReady(true));
  }, [authLoading, isAuthenticated, clientId, router]);

  if (!ready) return null;

  if (variant === 'none') {
    return (
      <LockedOverlay title="Baseline no disponible" subtitle="Este módulo no está disponible para tu tipo de cuenta.">
        <div style={{ minHeight: 240 }} />
      </LockedOverlay>
    );
  }

  return <WizardShell clientId={clientId ?? ''} variant={variant} />;
}
