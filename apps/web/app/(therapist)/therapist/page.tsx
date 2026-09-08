'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { TherapistShell } from '@/components/blindspot/TherapistShell';

export default function TherapistPage() {
  const { isLoading, isAuthenticated, mustChangePassword } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      window.location.href = '/therapist-login';
      return;
    }
    if (mustChangePassword) {
      window.location.href = '/therapist/set-password';
    }
  }, [isLoading, isAuthenticated, mustChangePassword]);

  if (isLoading || !isAuthenticated || mustChangePassword) return null;
  return <TherapistShell />;
}
