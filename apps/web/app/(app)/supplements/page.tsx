'use client';

import { useAuth } from '@/lib/auth-context';
import { ClientSupplementsPanel } from '@/components/supplements/ClientSupplementsPanel';

export default function SupplementsPage() {
  const { user } = useAuth();
  const clientId = user?.id ?? null;

  return (
    <div>
      <h1>Suplementación</h1>
      {clientId && <ClientSupplementsPanel clientId={clientId} />}
    </div>
  );
}
