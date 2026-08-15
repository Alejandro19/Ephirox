'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ClientRestPanel } from '@/components/rest/ClientRestPanel';
import { AdminRestPanel } from '@/components/rest/AdminRestPanel';
import ClientSwitcher from '@/components/admin/ClientSwitcher';
import IdentityHeader from '@/components/ui/IdentityHeader';

export default function RestPage() {
  // AppShell ya bloquea el render de esta página hasta que useAuth() termina
  // de cargar (ver components/layout/AppShell.tsx) — leer directo de acá evita
  // el doble-render que causaba decodificar el JWT de nuevo en cada page.tsx.
  const { role, user } = useAuth();
  const clientId = user?.id ?? null;
  const [adminClientId, setAdminClientId] = useState<string | null>(null);

  if (role === 'admin') {
    return (
      <div>
        <IdentityHeader title="Hackeando el sueño" subtitle="Escribe el protocolo de sueño y gestiona el banco de herramientas." />
        <div
          style={{
            background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius)', padding: '22px 24px', marginBottom: 18,
          }}
        >
          <ClientSwitcher moduleKey="rest" selectedClientId={adminClientId} onSelect={setAdminClientId} />
        </div>
        {adminClientId ? (
          <AdminRestPanel clientId={adminClientId} />
        ) : (
          <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Selecciona un cliente para gestionar su protocolo.</p>
        )}
      </div>
    );
  }

  return <div>{clientId && <ClientRestPanel clientId={clientId} />}</div>;
}
