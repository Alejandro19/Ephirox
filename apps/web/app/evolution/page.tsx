'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken } from '../../lib/api-client';
import { ClientEvolutionPanel } from '../../components/evolution/ClientEvolutionPanel';

// Mismo patrón que apps/web/app/community/page.tsx: el JWT ya trae el id del
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

export default function EvolutionPage() {
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
      <h1>Mi Evolución</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        Registra tus check-ins semanales, monitorea tu progreso y visualiza tus
        mediciones antropométricas y de InBody.
      </p>
      <ClientEvolutionPanel clientId={clientId} />
    </div>
  );
}
