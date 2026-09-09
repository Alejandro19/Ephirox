'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  type AdminEnterpriseLead,
  type EnterpriseLeadEstado,
  listEnterpriseLeads,
  updateEnterpriseLeadEstado,
} from '../../lib/enterprise-leads-admin-client';
import { ENTERPRISE_LEAD_ESTADO_LABELS } from '../../lib/constants';
import { showToast } from '../layout/AppShell';

const ESTADO_ORDER: EnterpriseLeadEstado[] = [
  'nuevo',
  'contactado',
  'preparando_propuesta',
  'propuesta_entregada',
  'cerrado',
];

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '12px 16px', fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  fontSize: 10, fontWeight: 400, color: 'var(--eph-muted)', textTransform: 'uppercase',
  letterSpacing: '0.1em', borderBottom: '1px solid var(--eph-line)',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 13, color: 'var(--eph-text)', verticalAlign: 'middle',
};

const selectStyle: React.CSSProperties = {
  height: 32, borderRadius: 0, border: '1px solid var(--eph-line-2)',
  padding: '0 8px', fontSize: 12, fontWeight: 400, background: 'var(--eph-surface-2)', color: 'var(--eph-text)',
  outline: 'none', cursor: 'pointer',
};

function estadoBadgeStyle(estado: EnterpriseLeadEstado): React.CSSProperties {
  return {
    color: estado === 'cerrado' ? 'var(--eph-muted)' : 'var(--eph-accent)',
  };
}

export function EnterpriseLeadsPanel() {
  const [leads, setLeads] = useState<AdminEnterpriseLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'abiertos'>('abiertos');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLeads(await listEnterpriseLeads());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleEstadoChange(lead: AdminEnterpriseLead, estado: EnterpriseLeadEstado) {
    const previous = leads;
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, estado } : l)));
    try {
      await updateEnterpriseLeadEstado(lead.id, estado);
      showToast('Estado actualizado.', 'success');
    } catch (e) {
      setLeads(previous);
      showToast(e instanceof Error ? e.message : 'Error al actualizar el estado.', 'error');
    }
  }

  const visible = filter === 'all' ? leads : leads.filter((l) => l.estado !== 'cerrado');

  if (loading) return <p style={{ color: 'var(--eph-muted)', fontSize: 13 }}>Cargando…</p>;
  if (error) return <p role="alert" style={{ color: '#D99483', fontSize: 13 }}>{error}</p>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setFilter('abiertos')}
          style={{
            height: 30, padding: '0 14px', borderRadius: 9999,
            fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
            border: filter === 'abiertos' ? '1px solid var(--eph-accent)' : '1px solid var(--eph-line-2)',
            background: filter === 'abiertos' ? 'rgba(201,166,107,.14)' : 'transparent',
            color: filter === 'abiertos' ? 'var(--eph-accent)' : 'var(--eph-muted)',
            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
          }}
        >
          Abiertos
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            height: 30, padding: '0 14px', borderRadius: 9999,
            fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
            border: filter === 'all' ? '1px solid var(--eph-accent)' : '1px solid var(--eph-line-2)',
            background: filter === 'all' ? 'rgba(201,166,107,.14)' : 'transparent',
            color: filter === 'all' ? 'var(--eph-accent)' : 'var(--eph-muted)',
            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
          }}
        >
          Todos
        </button>
      </div>

      {visible.length === 0 ? (
        <p style={{ color: 'var(--eph-muted)', fontSize: 13 }}>No hay leads para mostrar.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Empresa</th>
                <th style={thStyle}>Contacto</th>
                <th style={thStyle}>Rol</th>
                <th style={thStyle}>Correo</th>
                <th style={thStyle}>Celular</th>
                <th style={thStyle}>Equipo</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((lead) => (
                <tr key={lead.id} style={{ borderBottom: '1px solid var(--eph-line)' }}>
                  <td style={tdStyle}>{lead.empresa}</td>
                  <td style={tdStyle}>{lead.nombre}</td>
                  <td style={tdStyle}>{lead.rol}</td>
                  <td style={tdStyle}>{lead.correo || '—'}</td>
                  <td style={tdStyle}>{lead.celular || '—'}</td>
                  <td style={tdStyle}>{lead.tamano || '—'}</td>
                  <td style={tdStyle}>{new Date(lead.createdAt).toLocaleDateString('es-CO')}</td>
                  <td style={tdStyle}>
                    <select
                      style={{ ...selectStyle, ...estadoBadgeStyle(lead.estado) }}
                      value={lead.estado}
                      onChange={(e) => handleEstadoChange(lead, e.target.value as EnterpriseLeadEstado)}
                    >
                      {ESTADO_ORDER.map((estado) => (
                        <option key={estado} value={estado}>
                          {ENTERPRISE_LEAD_ESTADO_LABELS[estado]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
