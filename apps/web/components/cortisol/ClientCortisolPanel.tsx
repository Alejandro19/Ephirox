'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  listTechniques,
  listCompletions,
  markCompletion,
  getTodayCheckin,
  postCheckin,
  getTipOfTheDay,
  type CortisolTechnique,
  type CortisolCompletion,
} from '../../lib/cortisol-client';
import { youtubeEmbedUrl } from '../../lib/training-timer-logic';
import { CORTISOL_EMOTIONS, CORTISOL_RECOMMENDATIONS, calculateCortisolWeeklyStats } from '../../lib/cortisol-logic';
import { PermissionDeniedError } from '../../lib/api-client';
import IdentityHeader from '../ui/IdentityHeader';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import RingProgress from '../ui/RingProgress';
import ProgressBar from '../ui/ProgressBar';
import LockedBenefit from '../ui/LockedBenefit';

const TECHNIQUE_ICON_PATHS: Record<string, React.ReactNode> = {
  respiración: <path d="M3 10c2.5-3 4.5-3 7 0s4.5 3 7 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />,
  breathwork: <path d="M3 10c2.5-3 4.5-3 7 0s4.5 3 7 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />,
  meditación: <path d="M10 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-6 12c1-3.5 3.5-5.5 6-5.5s5 2 6 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />,
  mindfulness: (
    <>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx="10" cy="10" r="2" fill="currentColor" />
    </>
  ),
  base: (
    <>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M10 6.5v4l2.6 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
};

function TechniqueIcon({ type }: { type: string | null }) {
  const key = (type || '').toLowerCase();
  const path = TECHNIQUE_ICON_PATHS[key] || TECHNIQUE_ICON_PATHS.base;
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--page-bg)]" style={{ color: 'var(--hero-espresso-accent)' }}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        {path}
      </svg>
    </div>
  );
}

function CortisolPlayer({
  technique,
  doneToday,
  onComplete,
  onBack,
}: {
  technique: CortisolTechnique;
  doneToday: boolean;
  onComplete: () => void;
  onBack: () => void;
}) {
  const embedUrl = youtubeEmbedUrl(technique.youtubeUrl);
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 inline-block bg-transparent p-0 text-xs font-semibold text-[var(--ink-secondary)] hover:underline">
        ← Gestión de Cortisol
      </button>
      <h1 className="mb-1 font-serif text-2xl font-bold text-[var(--ink)]">{technique.title}</h1>
      <p className="mb-5 text-sm text-[var(--ink-secondary)]">{[technique.type, technique.duration].filter(Boolean).join(' · ')}</p>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-[26px]">
        {embedUrl ? (
          <div className="relative overflow-hidden rounded-[14px] bg-black pt-[56.25%]">
            <iframe
              src={embedUrl}
              title={technique.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ) : technique.audioUrl ? (
          <div className="rounded-[14px] bg-[#F1EAF7] p-6 text-center">
            <audio src={technique.audioUrl} controls className="w-full" />
          </div>
        ) : (
          <div className="py-10 text-center text-[var(--ink-secondary)]">Sin video ni audio asignado.</div>
        )}

        {technique.description && <p className="mt-4 text-sm leading-relaxed text-[var(--ink)]">{technique.description}</p>}

        <div className="mt-5 flex justify-center gap-2.5">
          {doneToday ? (
            <button type="button" disabled className="h-11 cursor-default rounded-full border border-[var(--border-hairline)] px-6 text-sm font-semibold text-[var(--ink-secondary)]">
              Completado hoy ✓
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="h-11 rounded-full px-6 text-sm font-semibold"
              style={{ background: 'var(--hero-espresso-accent)', color: 'var(--hero-espresso)' }}
            >
              Marcar completado
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="h-11 rounded-full px-6 text-sm font-semibold"
            style={{ background: 'var(--hero-espresso)', color: 'var(--hero-espresso-text)' }}
          >
            Finalizar
          </button>
        </div>
      </div>
    </div>
  );
}

async function fetchCortisolBundle(clientId: string) {
  const [techniques, completions, tip, checkin] = await Promise.all([
    listTechniques(clientId),
    listCompletions(clientId).catch(() => [] as CortisolCompletion[]),
    getTipOfTheDay(clientId),
    getTodayCheckin(clientId),
  ]);
  return { techniques, completions, tip, checkin };
}

export function ClientCortisolPanel({ clientId }: { clientId: string }) {
  const { data, error, isLoading, mutate } = useSWR(['cortisol-bundle', clientId], () =>
    fetchCortisolBundle(clientId),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  async function handleSelectEmotion(key: string) {
    try {
      const saved = await postCheckin(clientId, key);
      await mutate((current) => (current ? { ...current, checkin: saved } : current), { revalidate: false });
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  async function handleComplete(techniqueId: string) {
    try {
      await markCompletion(clientId);
      const completionList = await listCompletions(clientId).catch(() => data?.completions ?? []);
      await mutate((current) => (current ? { ...current, completions: completionList } : current), { revalidate: false });
    } catch (e) {
      setActionError((e as Error).message);
    }
    void techniqueId;
  }

  const header = <IdentityHeader title="Gestión de Cortisol" subtitle="Es momento de bajar el ritmo." />;

  if (isLoading) {
    return (
      <div>
        {header}
        <p className="text-sm text-[var(--ink-secondary)]">Cargando técnicas de cortisol…</p>
      </div>
    );
  }
  if (error && error instanceof PermissionDeniedError) {
    return (
      <div>
        {header}
        <LockedBenefit variant="upgrade" benefit="tu gestión de cortisol" />
      </div>
    );
  }
  const errorMessage = actionError || (error ? (error as Error).message : null);
  if (errorMessage) {
    return (
      <div>
        {header}
        <p role="alert" className="text-[var(--danger)]">{errorMessage}</p>
      </div>
    );
  }
  if (!data) return null;

  const { techniques, completions, tip, checkin } = data;
  const active = activeId ? techniques.find((t) => t.id === activeId) : null;
  if (active) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const doneToday = completions.some((c) => c.completedDate === todayStr);
    return (
      <div>
        {header}
        <CortisolPlayer
          technique={active}
          doneToday={doneToday}
          onBack={() => setActiveId(null)}
          onComplete={() => handleComplete(active.id)}
        />
      </div>
    );
  }

  const emotion = checkin ? checkin.emotion : null;
  // El admin asigna, por cliente, qué técnica corresponde a cada emoción
  // (CortisolTechnique.emotion) — esa asignación explícita manda sobre el
  // texto genérico de CORTISOL_RECOMMENDATIONS, que solo queda como
  // fallback para cuando ninguna técnica tiene esa emoción asignada.
  const matched = (emotion && techniques.find((t) => t.emotion === emotion)) || techniques[0] || null;
  const fallback = (emotion && CORTISOL_RECOMMENDATIONS[emotion]) || CORTISOL_RECOMMENDATIONS.cansado;
  const recommended = emotion && matched && matched.emotion === emotion
    ? { title: matched.title, desc: matched.description || fallback.desc }
    : fallback;
  const weeklyStats = calculateCortisolWeeklyStats(completions);

  return (
    <div>
      {header}

      <div className="mb-5 rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6">
        <p className="mb-2.5 text-xs font-bold text-[var(--ink)]">¿Cómo te sientes ahora mismo?</p>
        <div className="grid grid-cols-3 gap-2">
          {CORTISOL_EMOTIONS.map((o) => {
            const selected = emotion === o.key;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => handleSelectEmotion(o.key)}
                className="rounded-xl border px-2.5 py-2.5 text-center transition-colors"
                style={selected
                  ? { borderColor: 'var(--hero-espresso-accent)', background: 'var(--hero-espresso-accent)' }
                  : { borderColor: 'var(--border-input)', background: 'var(--page-bg)' }}
              >
                <span
                  className="block text-[11.5px] font-bold leading-tight"
                  style={{ color: selected ? 'var(--hero-espresso)' : 'var(--ink-secondary)' }}
                >
                  {o.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="relative mt-8 mb-5 overflow-hidden rounded-[var(--radius-hero)] p-7 text-center"
        style={{ background: 'var(--hero-espresso)', color: 'var(--hero-espresso-text)' }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(217,183,126,.18) 0%, transparent 70%)' }}
        />
        <p className="relative z-10 mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--hero-espresso-accent)' }}>
          Recomendada para ti ahora
        </p>
        <h3 className="relative z-10 mb-1 font-serif text-lg font-bold">{recommended.title}</h3>
        <p className="relative z-10 mb-3 text-sm" style={{ color: 'var(--hero-espresso-text-muted)' }}>{recommended.desc}</p>
        {matched && (
          <button
            type="button"
            onClick={() => setActiveId(matched.id)}
            className="relative z-10 h-11 rounded-full px-6 text-sm font-semibold"
            style={{ background: 'var(--hero-espresso-accent)', color: 'var(--hero-espresso)' }}
          >
            Empezar técnica
          </button>
        )}
      </div>

      <section className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6 mb-5">
        <h2 className="mb-4 font-serif text-lg font-bold text-[var(--ink)]">Tus técnicas</h2>
        {techniques.length === 0 ? (
          <EmptyState message="Aún no tienes técnicas asignadas." />
        ) : (
          <div>
            {techniques.map((t, i) => {
              const hasVideo = !!(t.youtubeUrl || t.videoUrl);
              const hasAudio = !!t.audioUrl;
              const isPlayingAudio = playingAudioId === t.id;
              return (
                <div key={t.id} className={`py-3 ${i === 0 ? '' : 'border-t border-[var(--border-hairline)]'}`}>
                  <div className="flex items-center gap-3">
                    <TechniqueIcon type={t.type} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[var(--ink)]">
                        {t.title} {t.type && <Badge label={t.type} />}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--ink-secondary)]">{t.duration}</div>
                    </div>
                    {hasVideo && (
                      <button type="button" onClick={() => setActiveId(t.id)} className="rounded-full border border-[var(--border-input)] px-3.5 py-1.5 text-xs font-semibold text-[var(--ink)]">
                        Reproducir
                      </button>
                    )}
                    {!hasVideo && hasAudio && (
                      <button
                        type="button"
                        onClick={() => setPlayingAudioId((prev) => (prev === t.id ? null : t.id))}
                        className="rounded-full border border-[var(--border-input)] px-3.5 py-1.5 text-xs font-semibold text-[var(--ink)]"
                      >
                        {isPlayingAudio ? 'Ocultar' : 'Reproducir'}
                      </button>
                    )}
                  </div>
                  {isPlayingAudio && hasAudio && (
                    <audio controls autoPlay src={t.audioUrl ?? undefined} className="mt-2.5 w-full" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {techniques.length > 0 && (
        <section className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--paper)] p-6 mb-5">
          <h2 className="mb-4 font-serif text-lg font-bold text-[var(--ink)]">Momento de regulación</h2>
          <div className="flex items-center gap-4">
            <RingProgress value={weeklyStats.pct} size={48} color="espresso" />
            <div className="flex-1">
              <ProgressBar done={weeklyStats.count} total={7} label="Esta semana" />
            </div>
          </div>
        </section>
      )}

      {tip && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-hairline)] bg-[var(--page-bg)] p-[18px_20px]">
          <p className="m-0 text-xs text-[var(--ink-secondary)]">
            <strong className="text-[var(--ink)]">Sabías que</strong> {tip.content}
          </p>
        </div>
      )}
    </div>
  );
}
