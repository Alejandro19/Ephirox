'use client';

import { useState } from 'react';
import { AdminStressProtocolsPanel } from '@/components/admin/stress/AdminStressProtocolsPanel';
import { AdminStressCasesPanel } from '@/components/admin/stress/AdminStressCasesPanel';
import IdentityHeader from '@/components/ui/IdentityHeader';

const subtabButtonStyle = (active: boolean): React.CSSProperties => ({
  border: 'none', background: 'transparent', cursor: 'pointer',
  padding: '8px 4px', marginRight: 20, position: 'relative',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  fontSize: 12, fontWeight: 700, color: active ? 'var(--eph-accent)' : 'var(--eph-muted)',
});

// Submódulo "Crear protocolo" / "Casos Etiquetados" (punto 25.2) — separa el
// armado de la librería del seguimiento detallado de cada caso asignado.
export default function AdminStressProtocolsPage() {
  const [sub, setSub] = useState<'crear' | 'casos'>('crear');

  return (
    <div>
      <IdentityHeader title="Protocolos" subtitle="Librería reutilizable — el admin arma un protocolo una vez, se asigna a muchos clientes." />

      <div style={{ display: 'flex', borderBottom: '1px solid var(--eph-line)', marginBottom: 24 }}>
        <button type="button" style={subtabButtonStyle(sub === 'crear')} onClick={() => setSub('crear')}>
          Crear protocolo
          {sub === 'crear' && <span style={{ position: 'absolute', left: 0, right: 20, bottom: -1, height: 2, background: 'var(--eph-accent)' }} />}
        </button>
        <button type="button" style={subtabButtonStyle(sub === 'casos')} onClick={() => setSub('casos')}>
          Casos Etiquetados
          {sub === 'casos' && <span style={{ position: 'absolute', left: 0, right: 20, bottom: -1, height: 2, background: 'var(--eph-accent)' }} />}
        </button>
      </div>

      {sub === 'crear' ? <AdminStressProtocolsPanel /> : <AdminStressCasesPanel />}
    </div>
  );
}
