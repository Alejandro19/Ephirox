'use client';

import type { StressTechnique } from '../../lib/stress-client';
import type { ActiveCaseView, ClosedCaseSummary } from '../../lib/labeled-cases-client';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// "Historial de protocolos" (spec 23.3, Vista Cliente): filas simples
// nombre + rango de fechas — sin estado clínico ni resultado detallado, eso
// vive solo en la vista admin.
function ProtocolHistoryList({ closedCases }: { closedCases: ClosedCaseSummary[] }) {
  if (closedCases.length === 0) return null;
  return (
    <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--eph-line)' }}>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--eph-muted)' }}>Historial de protocolos</p>
      {closedCases.map((c, i) => (
        <div key={c.id} className={`flex items-center justify-between py-2 ${i === 0 ? '' : 'border-t border-[var(--eph-line)]'}`}>
          <span className="font-body text-sm" style={{ color: 'var(--eph-text)' }}>{c.protocolName}</span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--eph-faint)' }}>
            {formatDate(c.assignedAt)} – {c.closedAt ? formatDate(c.closedAt) : 'presente'}
          </span>
        </div>
      ))}
    </div>
  );
}

function currentCycleWeek(assignedAt: string, cycleWeeks: number): number {
  const elapsedMs = Date.now() - new Date(assignedAt).getTime();
  const elapsedWeeks = Math.floor(elapsedMs / (7 * 24 * 60 * 60 * 1000));
  return Math.min(cycleWeeks, Math.max(1, elapsedWeeks + 1));
}

// Botón por tipo de recurso (spec 23.3: "un botón distinto según si es
// reproducir/escribir/marcar hecho") — los 4 tipos del spec 18 todavía no
// tienen una interacción propia construida (timer de respiración, editor de
// journal), así que el botón de cada uno dispara el mismo marcado de
// práctica diaria ya existente (markCompletion) — mismo mecanismo real, solo
// cambia la etiqueta para que el lenguaje coincida con lo que se le pide
// hacer, en vez de fabricar una interacción que no existe todavía.
const RESOURCE_ACTION_LABEL: Record<string, string> = {
  'Técnica de respiración': 'Empezar',
  'Meditación guiada': 'Reproducir',
  'Journal de descarga': 'Escribir',
  'Actividad específica': 'Marcar hecho',
};

function MentorAvatar({ name }: { name: string }) {
  return (
    <div
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-display text-sm"
      style={{ background: 'var(--eph-surface-2)', border: '1px solid var(--eph-line)', color: 'var(--eph-accent)' }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Superficie 1 del spec punto 17 (vista cliente) — cuando ya existe un caso
// etiquetado activo, se muestra el protocolo real asignado por el mentor
// (nombre + mecanismo + recursos), no la lista genérica de técnicas legacy.
function ActiveCaseCard({
  activeCase,
  onComplete,
  TechniqueIcon,
}: {
  activeCase: ActiveCaseView;
  onComplete: () => void;
  TechniqueIcon: (props: { type: string | null }) => React.ReactNode;
}) {
  const week = currentCycleWeek(activeCase.labeledCase.assignedAt, activeCase.labeledCase.cycleWeeks);
  const nextCheckpoint = activeCase.checkpoints.find((c) => c.status === 'pendiente' && c.weekNumber >= week);
  const cyclePct = Math.round((week / activeCase.labeledCase.cycleWeeks) * 100);

  return (
    <div>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--eph-accent)' }}>Tu protocolo activo</p>
      <h3 className="mb-1 font-display text-lg" style={{ color: 'var(--eph-text)' }}>{activeCase.protocol?.name}</h3>
      {activeCase.protocol?.mechanism && (
        <p className="mb-3 font-body text-sm" style={{ color: 'var(--eph-muted)' }}>{activeCase.protocol.mechanism}</p>
      )}
      <div className="mt-2">
        {activeCase.resources.map((r, i) => (
          <div key={r.id} className={`py-3 ${i === 0 ? '' : 'border-t border-[var(--eph-line)]'}`}>
            <div className="flex items-center gap-3">
              <TechniqueIcon type={r.type} />
              <div className="flex-1">
                <div className="font-body text-sm font-medium" style={{ color: 'var(--eph-text)' }}>{r.title}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--eph-muted)' }}>
                  {[r.type, r.durationMinutes != null ? `${r.durationMinutes} min` : null].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button
                type="button"
                onClick={onComplete}
                className="inline-flex items-center justify-center gap-2 min-h-[36px] rounded-none font-mono text-[10px] font-normal uppercase tracking-[0.18em] border px-4"
                style={{ borderColor: 'var(--eph-line-2)', color: 'var(--eph-body)', background: 'transparent' }}
              >
                {RESOURCE_ACTION_LABEL[r.type] ?? 'Empezar'}
              </button>
            </div>
            {r.audioUrl && <audio controls src={r.audioUrl} className="mt-2 w-full" />}
          </div>
        ))}
      </div>
      <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--eph-line)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {activeCase.mentor && <MentorAvatar name={activeCase.mentor.name} />}
            <span className="font-body text-xs" style={{ color: 'var(--eph-muted)' }}>
              {activeCase.mentor ? `Asignado por ${activeCase.mentor.name}, tu mentor` : 'Caso etiquetado activo'}
            </span>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: 'var(--eph-accent)' }}>
              Semana {week} de {activeCase.labeledCase.cycleWeeks}
            </div>
            {nextCheckpoint && (
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--eph-faint)' }}>
                Próxima medición: semana {nextCheckpoint.weekNumber}
              </div>
            )}
          </div>
        </div>
        <div className="mt-2" style={{ height: 4, background: 'var(--eph-line-2)' }}>
          <div style={{ height: '100%', width: `${cyclePct}%`, background: 'var(--eph-accent)' }} />
        </div>
      </div>
    </div>
  );
}

function TechniqueList({
  techniques,
  playingAudioId,
  setPlayingAudioId,
  setActiveId,
  TechniqueIcon,
  Button,
}: {
  techniques: StressTechnique[];
  playingAudioId: string | null;
  setPlayingAudioId: (updater: (prev: string | null) => string | null) => void;
  setActiveId: (id: string) => void;
  TechniqueIcon: (props: { type: string | null }) => React.ReactNode;
  Button: (props: { type: 'button'; variant: 'secondary'; onClick: () => void; children: React.ReactNode }) => React.ReactNode;
}) {
  return (
    <div>
      {techniques.map((t, i) => {
        const hasVideo = !!(t.youtubeUrl || t.videoUrl);
        const hasAudio = !!t.audioUrl;
        const isPlayingAudio = playingAudioId === t.id;
        return (
          <div key={t.id} className={`py-3 ${i === 0 ? '' : 'border-t border-[var(--eph-line)]'}`}>
            <div className="flex items-center gap-3">
              <TechniqueIcon type={t.type} />
              <div className="flex-1">
                <div className="font-body text-sm font-medium" style={{ color: 'var(--eph-text)' }}>{t.title}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--eph-muted)' }}>{t.duration}</div>
              </div>
              {hasVideo && <Button type="button" variant="secondary" onClick={() => setActiveId(t.id)}>Reproducir</Button>}
              {!hasVideo && hasAudio && (
                <Button type="button" variant="secondary" onClick={() => setPlayingAudioId((prev) => (prev === t.id ? null : t.id))}>
                  {isPlayingAudio ? 'Ocultar' : 'Reproducir'}
                </Button>
              )}
            </div>
            {isPlayingAudio && hasAudio && <audio controls autoPlay src={t.audioUrl ?? undefined} className="mt-2.5 w-full" />}
          </div>
        );
      })}
    </div>
  );
}

// "Tu plan de regulación" (spec 16.4, renombrado de "Regulación del Sistema
// Nervioso") — el módulo nunca debe verse vacío. Sin protocolos asignados
// todavía, se muestra el mentor real diseñando el plan (placeholder honesto:
// no existe todavía una asignación real de mentor — ver Fase 3 del plan,
// "labeled_cases"/"mentors" — así que no se inventa un nombre) + un
// protocolo de arranque por defecto, siempre presente.
const DEFAULT_STARTER_PROTOCOL = { title: 'Respiración 4-7-8', duration: '3 min' };

export function StressPlanSection({
  activeCase,
  onCompleteActiveResource,
  closedCases = [],
  techniques,
  playingAudioId,
  setPlayingAudioId,
  setActiveId,
  TechniqueIcon,
  Button,
}: {
  activeCase?: ActiveCaseView | null;
  onCompleteActiveResource: () => void;
  closedCases?: ClosedCaseSummary[];
  techniques: StressTechnique[];
  playingAudioId: string | null;
  setPlayingAudioId: (updater: (prev: string | null) => string | null) => void;
  setActiveId: (id: string) => void;
  TechniqueIcon: (props: { type: string | null }) => React.ReactNode;
  Button: (props: { type: 'button'; variant: 'secondary'; onClick: () => void; children: React.ReactNode }) => React.ReactNode;
}) {
  return (
    <section className="border p-6 mb-5" style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface)' }}>
      <h2 className="mb-1 font-display text-lg" style={{ color: 'var(--eph-text)' }}>Tu plan de regulación</h2>
      <p className="mb-4 font-body text-xs" style={{ color: 'var(--eph-muted)' }}>
        Entrenamiento proactivo de tu capacidad de regulación — no depende de cómo te sientas hoy.
      </p>
      {activeCase ? (
        <ActiveCaseCard activeCase={activeCase} onComplete={onCompleteActiveResource} TechniqueIcon={TechniqueIcon} />
      ) : techniques.length === 0 ? (
        <div>
          <p className="font-body text-sm" style={{ color: 'var(--eph-text)' }}>
            Tu mentor está diseñando tu plan personalizado.
          </p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--eph-muted)' }}>
            Mientras tanto, este es tu punto de partida:
          </p>
          <div className="mt-2 flex items-center gap-3 border-t pt-3" style={{ borderColor: 'var(--eph-line)' }}>
            <TechniqueIcon type={null} />
            <div>
              <div className="font-body text-sm font-medium" style={{ color: 'var(--eph-text)' }}>{DEFAULT_STARTER_PROTOCOL.title}</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--eph-muted)' }}>{DEFAULT_STARTER_PROTOCOL.duration} · inhala 4s, sostén 7s, exhala 8s</div>
            </div>
          </div>
        </div>
      ) : (
        <TechniqueList
          techniques={techniques}
          playingAudioId={playingAudioId}
          setPlayingAudioId={setPlayingAudioId}
          setActiveId={setActiveId}
          TechniqueIcon={TechniqueIcon}
          Button={Button}
        />
      )}
      <ProtocolHistoryList closedCases={closedCases} />
    </section>
  );
}
