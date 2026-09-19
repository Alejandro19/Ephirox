'use client';

import type { StressTechnique, StressCompletion } from '../../lib/stress-client';

// "Tus protocolos" (spec 16.5/26.4) — grid con mínimo 3 ítems para que nunca
// se vea vacía. Sin suficientes protocolos reales asignados todavía, se
// completa con sugerencias (antes "Ejemplo" gris/apagado — spec 26.4 pide
// reemplazarlo por un estado "Sugerido para ti" sin perder el color de marca
// ni leerse como deshabilitado).
const SUGGESTED_PROTOCOLS = [
  { title: 'Respiración 4-7-8', duration: '3 min' },
  { title: 'Reset del Sistema Nervioso', duration: '4 min' },
  { title: 'Escaneo corporal breve', duration: '6 min' },
];
const MIN_ITEMS = 3;

// Intercambio de diseño pedido con MorningCheckinSummary: "Tus protocolos"
// toma el tratamiento sobrio/centrado que antes tenía el check-in — fondo
// neutro, borde fino neutro + franja superior de color, sin badge en
// píldora (el estado va como texto centrado bajo el título).
//
// Feedback directo: el borde punteado de "Sugerido" no se distinguía bien
// del activo — ahora la franja es SIEMPRE sólida (nunca punteada) y lo que
// diferencia un estado no-activo es que toda la card se opaca (borde más
// tenue + texto atenuado + opacity reducida), no el estilo del borde.
function protocolCardStyle(active: boolean): React.CSSProperties {
  return {
    background: 'var(--eph-surface-2)',
    border: '1px solid var(--eph-line)',
    borderTop: `3px solid ${active ? 'var(--eph-accent)' : 'color-mix(in srgb, var(--eph-accent) 40%, var(--eph-surface-2))'}`,
    textAlign: 'center',
    opacity: active ? 1 : 0.62,
  };
}

function StatusText({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <p style={{ margin: '6px 0 0', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color }}>
      {children}
    </p>
  );
}

export function StressProtocolLibrary({
  techniques,
  completions,
  onSelect,
}: {
  techniques: StressTechnique[];
  completions: StressCompletion[];
  onSelect: (id: string) => void;
}) {
  const suggestionsNeeded = Math.max(0, MIN_ITEMS - techniques.length);
  const suggestions = SUGGESTED_PROTOCOLS.slice(0, suggestionsNeeded);
  const completedIds = new Set(completions.map((c) => c.techniqueId).filter((id): id is string => id != null));

  return (
    <section className="border p-6 mb-5" style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface)' }}>
      <h2 className="mb-4 font-display text-lg" style={{ color: 'var(--eph-text)' }}>Tus protocolos</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {techniques.map((t) => {
          const completed = completedIds.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className="p-4"
              style={protocolCardStyle(!completed)}
            >
              <div className="eph-num font-display text-base" style={{ color: completed ? 'var(--eph-muted)' : 'var(--eph-text)' }}>{t.title}</div>
              <div className="eph-num-mono mt-1 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--eph-muted)' }}>{t.duration}</div>
              {completed ? (
                <StatusText color="var(--eph-muted)">Completado</StatusText>
              ) : (
                <StatusText color="var(--eph-accent)">Activo ahora</StatusText>
              )}
            </button>
          );
        })}
        {suggestions.map((s) => (
          <div key={s.title} className="p-4" style={protocolCardStyle(false)}>
            <div className="eph-num font-display text-base" style={{ color: 'var(--eph-muted)' }}>{s.title}</div>
            <div className="eph-num-mono mt-1 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--eph-muted)' }}>{s.duration}</div>
            <StatusText color="var(--eph-muted)">Sugerido para ti</StatusText>
          </div>
        ))}
      </div>
    </section>
  );
}
