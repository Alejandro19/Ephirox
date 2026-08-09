'use client';

import { getSessionToken, decodeTokenPayload, clearSession } from '@/lib/api-client';

export type TherapistModuleKey =
  | 'perfil'
  | 'casos'
  | 'clientes'
  | 'agenda'
  | 'recursos'
  | 'comunidad'
  | 'dashboards';

export const THERAPIST_NAV: { key: TherapistModuleKey; label: string }[] = [
  { key: 'perfil', label: 'Mi perfil' },
  { key: 'casos', label: 'Mis casos' },
  { key: 'clientes', label: 'Mis clientes' },
  { key: 'agenda', label: 'Mi agenda' },
  { key: 'recursos', label: 'Recursos clínicos' },
  { key: 'comunidad', label: 'Comunidad de terapeutas' },
  { key: 'dashboards', label: 'Dashboards' },
];

function navItemStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: 12,
    color: active ? 'var(--terracota)' : 'var(--ink-soft)',
    fontWeight: 600,
    fontSize: 14,
    marginBottom: 4,
    background: active ? 'var(--terracota-soft)' : 'none',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.2s ease, color 0.2s ease',
  };
}

export default function TherapistSidebar({
  activeModule,
  onNavigate,
}: {
  activeModule: TherapistModuleKey;
  onNavigate: (key: TherapistModuleKey) => void;
}) {
  const token = getSessionToken();
  const name = (token && decodeTokenPayload<{ name?: string }>(token)?.name) || 'Terapeuta';
  const initial = name.charAt(0).toUpperCase();

  function handleLogout() {
    clearSession();
    window.location.href = '/therapist-login';
  }

  return (
    <aside
      style={{
        width: 250,
        background: 'var(--paper)',
        borderRight: '1px solid var(--line)',
        padding: '28px 18px',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--ink)',
          margin: '0 8px 4px',
          fontFamily: 'Fraunces, Georgia, serif',
        }}
      >
        La Tribu
      </div>

      <div style={{ textAlign: 'center', margin: '4px 0 22px' }}>
        <svg viewBox="0 0 100 100" width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--ring-morning)" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="0" opacity={0.5} />
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--ring-afternoon)" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="-83.8" opacity={0.5} />
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--ring-evening)" strokeWidth="8" strokeLinecap="round" strokeDasharray="76 176" strokeDashoffset="-167.6" opacity={0.5} />
        </svg>
        <div
          style={{
            fontSize: 10.5,
            color: 'var(--ink-soft)',
            textAlign: 'center',
            marginTop: 8,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Punto Ciego
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        {THERAPIST_NAV.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            style={navItemStyle(activeModule === item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--line)',
            background: 'var(--cream)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--terracota-soft)',
              color: 'var(--terracota)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 1 }}>Terapeuta</div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            background: 'none',
            border: '1px solid var(--line)',
            borderRadius: 9999,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--ink-soft)',
            cursor: 'pointer',
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
