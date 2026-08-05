'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSessionToken } from '../../lib/api-client';

// Mismo patrón que apps/web/app/training/page.tsx: el JWT ya trae el id del
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

export default function CommunityPage() {
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
      <h1>Comunidad</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        Conecta con otros miembros de La Tribu — eventos presenciales y terapias exclusivas con aliados.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <Link
          href="/community/events"
          style={{
            display: 'block',
            padding: '2rem',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'box-shadow 0.2s, border-color 0.2s',
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>📅 Eventos</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '0.95rem' }}>
            Sesiones grupales, talleres y encuentros presenciales. Reserva tu cupo y asiste.
          </p>
        </Link>

        <Link
          href="/community/therapies"
          style={{
            display: 'block',
            padding: '2rem',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'box-shadow 0.2s, border-color 0.2s',
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>💆 Terapias</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '0.95rem' }}>
            Terapias con aliados de La Tribu. Descuentos exclusivos para miembros activos.
          </p>
        </Link>
      </div>
    </div>
  );
}