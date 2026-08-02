'use client';

import { useEffect, useState } from 'react';
import { getSessionToken } from '../../lib/api-client';
import { ClientCortisolPanel } from '../../components/cortisol/ClientCortisolPanel';

function decodeClientIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.id === 'string' ? payload.id : null;
  } catch {
    return null;
  }
}

export default function CortisolPage() {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    const token = getSessionToken();
    if (token) setClientId(decodeClientIdFromToken(token));
  }, []);

  return (
    <div>
      <h1>Gestión de Cortisol</h1>
      {clientId && <ClientCortisolPanel clientId={clientId} />}
    </div>
  );
}
