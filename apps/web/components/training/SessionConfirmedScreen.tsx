'use client';

import { useState, useRef } from 'react';
import type { TrainingStreak } from '../../lib/training-client';
import { getPhraseByContext } from '../../lib/training-client';
import { drawInstagramCard } from '../../lib/training-card';
import { shareCanvasAsImage } from '../../lib/share-card';

export type SessionConfirmedScreenProps = {
  streak: TrainingStreak;
  phrase: string | null;
  clientId: string;
  onClose: () => void;
};

export function SessionConfirmedScreen({ streak, phrase, clientId, onClose }: SessionConfirmedScreenProps) {
  const dots = Array.from({ length: streak.sessionsRequiredThisWeek }, (_, i) => i + 1);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  async function handleShare() {
    setSharing(true);
    setShareError(null);
    try {
      let cardPhrase: string | null = null;
      try {
        cardPhrase = await getPhraseByContext(clientId, 'instagram');
      } catch {
        cardPhrase = null;
      }

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = 1080;
        canvasRef.current.height = 1920;
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) drawInstagramCard(ctx, { streakWeeks: streak.streakWeeks, phrase: cardPhrase });

      await shareCanvasAsImage(canvas, 'la-tribu-racha.png');
    } catch (e) {
      setShareError('No pudimos generar la tarjeta. Intenta de nuevo.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div>
      <h1>¡Sesión confirmada!</h1>
      <p>
        {streak.sessionsDoneThisWeek}/{streak.sessionsRequiredThisWeek} esta semana
      </p>
      <div>
        {dots.map((n) => (
          <span key={n}>{n <= streak.sessionsDoneThisWeek ? '✓' : n}</span>
        ))}
      </div>
      <p>
        {streak.streakWeeks} {streak.streakWeeks === 1 ? 'semana seguida' : 'semanas seguidas'}
      </p>
      {phrase && <p>&quot;{phrase}&quot;</p>}
      {shareError && <p role="alert">{shareError}</p>}
      <button type="button" onClick={onClose}>
        Cerrar
      </button>
      <button type="button" onClick={handleShare} disabled={sharing}>
        Compartir
      </button>
    </div>
  );
}
