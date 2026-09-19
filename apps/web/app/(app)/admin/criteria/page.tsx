'use client';

import { useState } from 'react';
import { AdminCriteriaLibraryPanel } from '@/components/admin/criteria/AdminCriteriaLibraryPanel';
import { AdminMetricsCatalogPanel } from '@/components/admin/criteria/AdminMetricsCatalogPanel';
import { AdminDatasetExportPanel } from '@/components/admin/criteria/AdminDatasetExportPanel';
import IdentityHeader from '@/components/ui/IdentityHeader';

const subtabButtonStyle = (active: boolean): React.CSSProperties => ({
  border: 'none', background: 'transparent', cursor: 'pointer',
  padding: '8px 4px', marginRight: 20, position: 'relative',
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  fontSize: 12, fontWeight: 700, color: active ? 'var(--eph-accent)' : 'var(--eph-muted)',
});

type Sub = 'reglas' | 'marcadores' | 'export';

const SUB_LABEL: Record<Sub, string> = {
  reglas: 'Reglas',
  marcadores: 'Catálogo de marcadores',
  export: 'Exportar dataset',
};

// Mismo patrón de sub-navegación que Protocolos (Crear protocolo / Casos
// Etiquetados, punto 25.2) — Reglas, Catálogo de marcadores y Exportar
// dataset pasan de 3 secciones apiladas a 3 pestañas.
export default function AdminCriteriaPage() {
  const [sub, setSub] = useState<Sub>('reglas');

  return (
    <div>
      <IdentityHeader
        title="Reglas y Marcadores"
        subtitle="Reglas de asignación reutilizables para Stress, Workout, Nutrition y Sleep."
      />

      <div style={{ display: 'flex', borderBottom: '1px solid var(--eph-line)', marginBottom: 24 }}>
        {(['reglas', 'marcadores', 'export'] as Sub[]).map((key) => (
          <button key={key} type="button" style={subtabButtonStyle(sub === key)} onClick={() => setSub(key)}>
            {SUB_LABEL[key]}
            {sub === key && <span style={{ position: 'absolute', left: 0, right: 20, bottom: -1, height: 2, background: 'var(--eph-accent)' }} />}
          </button>
        ))}
      </div>

      {sub === 'reglas' && (
        <section>
          <p style={{ fontSize: 13, color: 'var(--eph-muted)', margin: '0 0 12px', maxWidth: 640 }}>
            Se crean una sola vez acá y se seleccionan — no se reconstruyen — al crear un protocolo en cualquier módulo.
          </p>
          <AdminCriteriaLibraryPanel />
        </section>
      )}

      {sub === 'marcadores' && (
        <section>
          <p style={{ fontSize: 13, color: 'var(--eph-muted)', margin: '0 0 12px', maxWidth: 640 }}>
            Cada marcador se define una sola vez y queda disponible en el selector &quot;Métrica&quot; de cualquier regla nueva, en cualquier módulo.
          </p>
          <AdminMetricsCatalogPanel />
        </section>
      )}

      {sub === 'export' && (
        <section>
          <p style={{ fontSize: 13, color: 'var(--eph-muted)', margin: '0 0 12px', maxWidth: 640 }}>
            Descarga los casos etiquetados con su snapshot de baseline, protocolo, checkpoints y resultado final. Solo incluye casos con consentimiento de datos confirmado y sin checkpoints vencidos sin registrar.
          </p>
          <AdminDatasetExportPanel />
        </section>
      )}
    </div>
  );
}
