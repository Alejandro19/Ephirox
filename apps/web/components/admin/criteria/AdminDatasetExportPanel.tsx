'use client';

import { useState } from 'react';
import { exportCasesCsvUrl } from '../../../lib/labeled-cases-client';
import { LABELED_CASE_MODULES_FOR_CRITERIA } from '@latribu/shared-types';

const MODULE_LABEL: Record<string, string> = { stress: 'Stress', training: 'Workout', nutrition: 'Nutrition', rest: 'Sleep' };

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace', fontSize: 10,
  textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 400, color: 'var(--eph-muted)', marginBottom: 6,
};
const fieldStyle: React.CSSProperties = {
  width: '100%', height: 34, borderRadius: 0, border: '1px solid var(--eph-line-2)',
  padding: '0 10px', fontSize: 14, background: 'var(--eph-surface-2)', color: 'var(--eph-text)', outline: 'none',
};
const primaryLinkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 18px', borderRadius: 0,
  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  background: 'var(--eph-accent)', color: 'var(--eph-ink)', fontSize: 11, textTransform: 'uppercase',
  letterSpacing: '0.14em', textDecoration: 'none', marginTop: 16,
};

// Exportación del dataset de casos etiquetados (punto 24/6-del-pitch) — solo
// incluye casos con consentimiento de investigación confirmado y sin
// checkpoints vencidos sin registrar (misma regla de calidad que la
// efectividad por protocolo).
export function AdminDatasetExportPanel() {
  const [module, setModule] = useState('');
  const [onlyCompleted, setOnlyCompleted] = useState(true);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div>
          <label style={labelStyle} htmlFor="export-module">Módulo</label>
          <select id="export-module" style={fieldStyle} value={module} onChange={(e) => setModule(e.target.value)}>
            <option value="">Todos los módulos</option>
            {LABELED_CASE_MODULES_FOR_CRITERIA.map((m) => <option key={m} value={m}>{MODULE_LABEL[m] ?? m}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="export-status">Estado del caso</label>
          <select id="export-status" style={fieldStyle} value={onlyCompleted ? 'completed' : 'all'} onChange={(e) => setOnlyCompleted(e.target.value === 'completed')}>
            <option value="completed">Solo completados</option>
            <option value="all">Todos (incluye activos)</option>
          </select>
        </div>
      </div>
      <a href={exportCasesCsvUrl(module || undefined, onlyCompleted)} target="_blank" rel="noreferrer" style={primaryLinkStyle}>
        Exportar CSV
      </a>
    </div>
  );
}
