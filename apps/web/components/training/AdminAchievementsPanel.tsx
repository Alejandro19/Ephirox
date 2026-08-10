'use client';

import { useEffect, useState } from 'react';
import { getAchievements, getStreak, type Achievement } from '../../lib/training-client';
import { computeAchievements } from '../../lib/training-card';
import RingProgress from '../ui/RingProgress';
import { IconTrophy, IconMedal } from '../ui/icons';

const cardStyle: React.CSSProperties = {
  borderTop: '1px solid var(--border-hairline)', paddingTop: 20, paddingBottom: 20,
};
const cardTitleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 16px',
};

function clientTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AdminAchievementsPanel({ clientId }: { clientId: string }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streakWeeks, setStreakWeeks] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getAchievements(clientId),
      getStreak(clientId, clientTz()).catch(() => null),
    ])
      .then(([list, streak]) => {
        setAchievements(list);
        setStreakWeeks(streak?.streakWeeks ?? null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div style={cardStyle}><p style={{ color: 'var(--ink-secondary)', margin: 0 }}>Cargando medallas y trofeos…</p></div>;
  if (error) return <div style={cardStyle}><p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p></div>;

  const { medalsInCurrentCycle, trophiesEarned } = computeAchievements(streakWeeks ?? 0);
  const sorted = [...achievements].sort((a, b) => (a.earnedAt < b.earnedAt ? 1 : -1));

  return (
    <div style={cardStyle}>
      <h3 style={cardTitleStyle}>Medallas y trofeos</h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
        <RingProgress value={(medalsInCurrentCycle / 4) * 100} size={64} color="piedra">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{medalsInCurrentCycle}/4</span>
          </div>
        </RingProgress>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: 'var(--ink-secondary)' }}>
            Medallas del ciclo actual
          </p>
          <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink)' }}>
            <IconTrophy size={14} style={{ color: 'var(--ring-accent)' }} /> {trophiesEarned} copa{trophiesEarned === 1 ? '' : 's'} en total — las copas nunca se resetean.
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p style={{ color: 'var(--ink-secondary)', fontSize: 13, margin: 0 }}>
          Aún no ha ganado medallas ni trofeos.
        </p>
      ) : (
        <div>
          {sorted.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--border-hairline)',
              }}
            >
              <span style={{ display: 'flex', color: 'var(--ring-accent)' }}>
                {a.type === 'copa' ? <IconTrophy size={16} /> : <IconMedal size={16} />}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  {a.type === 'copa' ? 'Copa' : 'Medalla'} · semana {a.weekNumber}
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>{formatDate(a.earnedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
