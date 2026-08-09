'use client';

import { useEffect, useState } from 'react';
import { getSessionToken } from '@/lib/api-client';
import { ClientBlindspotPanel } from '@/components/blindspot/ClientBlindspotPanel';
import { AdminBlindspotPanel } from '@/components/blindspot/AdminBlindspotPanel';
import IdentityHeader from '@/components/ui/IdentityHeader';

function decodeTokenField<T = string>(token: string, field: string): T | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload[field] as T) ?? null;
  } catch {
    return null;
  }
}

export default function BlindspotPage() {
  const [role, setRole] = useState<string | null>(null);
  const [clientType, setClientType] = useState<string | null>(null);

  useEffect(() => {
    const token = getSessionToken();
    if (token) {
      setRole(decodeTokenField(token, 'role'));
      setClientType(decodeTokenField(token, 'clientType'));
    }
  }, []);

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
