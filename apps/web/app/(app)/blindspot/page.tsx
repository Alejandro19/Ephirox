'use client';

import { useAuth } from '@/lib/auth-context';
import { ClientBlindspotPanel } from '@/components/blindspot/ClientBlindspotPanel';
import { AdminBlindspotPanel } from '@/components/blindspot/AdminBlindspotPanel';
import IdentityHeader from '@/components/ui/IdentityHeader';

export default function BlindspotPage() {
  // AppShell ya bloquea el render de esta página hasta que useAuth() termina
  // de cargar (ver components/layout/AppShell.tsx) — leer directo de acá evita
  // el doble-render que causaba decodificar el JWT de nuevo en cada page.tsx.
  const { role, clientType } = useAuth();

  if (role === 'admin') {
    return (
      <div>
        <IdentityHeader title="Punto Ciego" subtitle="Evaluación, referidos y seguimiento — exclusivo Mentoría." />
        <AdminBlindspotPanel />
      </div>
    );
  }

  return (
    <div>
      <IdentityHeader title="Punto Ciego" subtitle="Tu auditoría interna con seguimiento de un terapeuta especializado." />
      <ClientBlindspotPanel clientType={clientType} />
    </div>
  );
}
