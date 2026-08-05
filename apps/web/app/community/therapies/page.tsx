'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken } from '../../../lib/api-client';
import { ClientTherapiesPanel } from '../../../components/community/ClientTherapiesPanel';

// Same pattern as apps/web/app/training/page.tsx: the JWT already contains the
// client ID in its payload - decoding it avoids a round-trip just to know "who am I".
// The actual authorization of each call is still handled by the backend (ownerOrAdmin + requirePermission).
function decodeClientIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.id === 'string' ? payload.id : null;
  } catch {
    return null;
  }
}

export default function CommunityTherapiesPage() {
  const router = useRouter();
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getSessionToken();

    if (!token) {
      router.push('/login');
      return;
    }

    const id = decodeClientIdFromToken(token);
    setClientId(id);
    setLoading(false);
  }, [router]);

  if (loading) return null;
  if (!clientId) return <p>Cargando...</p>;

  return (
    <div>
      <h1>Terapias de Comunidad</h1>
      <ClientTherapiesPanel clientId={clientId} />
    </div>
  );
}