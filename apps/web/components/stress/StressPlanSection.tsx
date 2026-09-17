'use client';

import type { StressTechnique } from '../../lib/stress-client';

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
    <section className="border p-6 mb-5" style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface)' }}>
      <h2 className="mb-1 font-display text-lg" style={{ color: 'var(--eph-text)' }}>Tu plan de regulación</h2>
      <p className="mb-4 font-body text-xs" style={{ color: 'var(--eph-muted)' }}>
        Entrenamiento proactivo de tu capacidad de regulación — no depende de cómo te sientas hoy.
      </p>
      {techniques.length === 0 ? (
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
    </section>
  );
}
