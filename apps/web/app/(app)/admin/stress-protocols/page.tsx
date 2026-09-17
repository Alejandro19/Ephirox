'use client';

import { AdminStressProtocolsPanel } from '@/components/admin/stress/AdminStressProtocolsPanel';
import IdentityHeader from '@/components/ui/IdentityHeader';

export default function AdminStressProtocolsPage() {
  return (
    <div>
      <IdentityHeader title="Protocolos de Stress" subtitle="Librería reutilizable — el admin arma un protocolo una vez, se asigna a muchos clientes." />
      <AdminStressProtocolsPanel />
    </div>
  );
}
