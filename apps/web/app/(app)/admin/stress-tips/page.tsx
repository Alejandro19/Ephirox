'use client';

import { StressTipsPanel } from '../../../../components/stress/StressTipsPanel';
import IdentityHeader from '../../../../components/ui/IdentityHeader';

export default function AdminStressTipsPage() {
  return (
    <div>
      <IdentityHeader title="Tips de Stress" subtitle="Banco global de tips educativos mostrados al azar en el módulo de Stress." />
      <div
        style={{
          background: 'var(--eph-surface)', border: '1px solid var(--eph-line)',
          borderRadius: '0', padding: '22px 24px',
        }}
      >
        <StressTipsPanel />
      </div>
    </div>
  );
}
