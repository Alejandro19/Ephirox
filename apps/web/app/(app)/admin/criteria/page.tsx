'use client';

import { AdminCriteriaLibraryPanel } from '@/components/admin/criteria/AdminCriteriaLibraryPanel';
import { AdminMetricsCatalogPanel } from '@/components/admin/criteria/AdminMetricsCatalogPanel';
import { AdminDatasetExportPanel } from '@/components/admin/criteria/AdminDatasetExportPanel';
import IdentityHeader from '@/components/ui/IdentityHeader';

export default function AdminCriteriaPage() {
  return (
    <div>
      <IdentityHeader
        title="Reglas y Marcadores"
        subtitle="Reglas de asignación reutilizables para Stress, Workout, Nutrition y Sleep."
      />
      <section style={{ marginBottom: 34 }}>
        <h2 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 18, fontWeight: 400, color: 'var(--eph-text)', margin: '0 0 4px' }}>
          Reglas de asignación guardadas
        </h2>
        <p style={{ fontSize: 13, color: 'var(--eph-muted)', margin: '0 0 4px', maxWidth: 640 }}>
          Se crean una sola vez acá y se seleccionan — no se reconstruyen — al crear un protocolo en cualquier módulo.
        </p>
        <AdminCriteriaLibraryPanel />
      </section>
      <section>
        <h2 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 18, fontWeight: 400, color: 'var(--eph-text)', margin: '0 0 4px' }}>
          Catálogo de marcadores
        </h2>
        <p style={{ fontSize: 13, color: 'var(--eph-muted)', margin: '0 0 4px', maxWidth: 640 }}>
          Cada marcador se define una sola vez y queda disponible en el selector &quot;Métrica&quot; de cualquier regla nueva, en cualquier módulo.
        </p>
        <AdminMetricsCatalogPanel />
      </section>
      <section>
        <h2 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 18, fontWeight: 400, color: 'var(--eph-text)', margin: '0 0 4px' }}>
          Exportar dataset de casos etiquetados
        </h2>
        <p style={{ fontSize: 13, color: 'var(--eph-muted)', margin: '0 0 12px', maxWidth: 640 }}>
          Descarga los casos etiquetados con su snapshot de baseline, protocolo, checkpoints y resultado final. Solo incluye casos con consentimiento de datos confirmado y sin checkpoints vencidos sin registrar.
        </p>
        <AdminDatasetExportPanel />
      </section>
    </div>
  );
}
