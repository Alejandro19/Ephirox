'use client';

import type { StressTechnique, StressCompletion } from '../../lib/stress-client';

// "Tus protocolos" (spec 16.5/26.4) — grid con mínimo 3 ítems para que nunca
// se vea vacía. Sin suficientes protocolos reales asignados todavía, se
// completa con sugerencias (antes "Ejemplo" gris/apagado — spec 26.4 pide
// reemplazarlo por un estado "Sugerido para ti" con borde punteado dorado,
// sin perder el color de marca ni leerse como deshabilitado).
const SUGGESTED_PROTOCOLS = [
  { title: 'Respiración 4-7-8', duration: '3 min' },
  { title: 'Reset del Sistema Nervioso', duration: '4 min' },
  { title: 'Escaneo corporal breve', duration: '6 min' },
];
const MIN_ITEMS = 3;

// Mismo degradado cálido + borde dorado que la tile de baseline destacada
// (punto 25.5), reutilizado acá para el estado "Activo ahora".
const activeCardStyle: React.CSSProperties = {
  background: 'linear-gradient(160deg, color-mix(in srgb, var(--eph-accent) 16%, var(--eph-surface-2)) 0%, var(--eph-surface-2) 100%)',
  border: '1.5px solid var(--eph-accent)',
  boxShadow: '0 0 0 1px color-mix(in srgb, var(--eph-accent) 30%, transparent), 0 12px 26px -10px color-mix(in srgb, var(--eph-accent) 45%, transparent)',
};
const completedCardStyle: React.CSSProperties = { background: 'var(--eph-surface-2)', border: '1px solid var(--eph-line)' };
const suggestedCardStyle: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--eph-accent) 6%, transparent)',
  border: '1.5px dashed var(--eph-accent)',
};

// "Activo ahora" pide etiqueta SÓLIDA dorada (spec 26.4) — única excepción al
// contorno-siempre de Badge.tsx (ese bronce sólido queda reservado ahí al CTA
// primario de cada pantalla); se justifica acá porque es el estado más
// prominente de la grilla, no un CTA.
function ActiveTag() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
      background: 'var(--eph-accent)', color: 'var(--eph-ink)', borderRadius: 999, padding: '3px 10px',
    }}>
      Activo ahora
    </span>
  );
}
// "Completado" pide outline verde en el spec — no existe un token verde
// dedicado en tema.css (solo dorado/acento y terracota/danger), así que se
// reutiliza el outline dorado que Badge.tsx ya usa para su variante
// "success" en el resto de la app.
function CompletedTag() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
      background: 'transparent', border: '1px solid var(--eph-accent)', color: 'var(--eph-accent)', borderRadius: 999, padding: '3px 10px',
    }}>
      Completado
    </span>
  );
}
function SuggestedTag() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
      color: 'color-mix(in srgb, var(--eph-accent) 75%, var(--eph-muted))',
    }}>
      Sugerido para ti
    </span>
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
              className="border p-4 text-left"
              style={completed ? completedCardStyle : activeCardStyle}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-base" style={{ color: 'var(--eph-text)' }}>{t.title}</div>
                {completed ? <CompletedTag /> : <ActiveTag />}
              </div>
              <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--eph-muted)' }}>{t.duration}</div>
            </button>
          );
        })}
        {suggestions.map((s) => (
          <div key={s.title} className="border p-4" style={suggestedCardStyle}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-base" style={{ color: 'var(--eph-text)' }}>{s.title}</div>
              <SuggestedTag />
            </div>
            <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--eph-muted)' }}>{s.duration}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
