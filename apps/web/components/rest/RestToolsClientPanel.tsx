'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { type RestTool, listRestTools } from '../../lib/rest-tools-client';

export function RestToolsClientPanel() {
  const [tools, setTools] = useState<RestTool[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [journalOpenId, setJournalOpenId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [timerToolId, setTimerToolId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [hasCountdown, setHasCountdown] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    listRestTools()
      .then(setTools)
      .catch((e: Error) => setError(e.message));
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setTimerToolId(null);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startTimer(tool: RestTool) {
    stopTimer();
    setPlayingAudioId(null);
    const total = (tool.minutes || 0) * 60 + (tool.seconds || 0);
    setHasCountdown(total > 0);
    setSecondsLeft(total);
    setTimerToolId(tool.id);
    if (total > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            stopTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }

  function toggleJournal(id: string) {
    setJournalOpenId((prev) => (prev === id ? null : id));
  }

  function toggleAudio(id: string) {
    stopTimer();
    setPlayingAudioId((prev) => (prev === id ? null : id));
  }

  if (error) return <p role="alert">{error}</p>;

  return (
    <section>
      <h2>Herramientas para dormir</h2>
      {tools.length === 0 && <p>Aún no hay herramientas.</p>}
      {tools.map((tool) => (
        <div key={tool.id}>
          <strong>{tool.name}</strong>
          <span>{tool.meta}</span>
          {tool.action === 'write' && (
            <button type="button" onClick={() => toggleJournal(tool.id)}>
              Escribir
            </button>
          )}
          {tool.action === 'play' && tool.audioUrl && (
            <button type="button" onClick={() => toggleAudio(tool.id)}>
              {playingAudioId === tool.id ? 'Ocultar' : 'Reproducir'}
            </button>
          )}
          {tool.action === 'play' && !tool.audioUrl && (
            <button type="button" onClick={() => startTimer(tool)}>
              Reproducir
            </button>
          )}
          {playingAudioId === tool.id && tool.audioUrl && <audio controls autoPlay src={tool.audioUrl} />}
          {journalOpenId === tool.id && (
            <div>
              <label htmlFor={`rt-journal-${tool.id}`}>
                Escribe lo que ronda tu cabeza — no se guarda, es solo para vaciar la mente antes de dormir.
              </label>
              <textarea id={`rt-journal-${tool.id}`} rows={4} />
              <button type="button" onClick={() => toggleJournal(tool.id)}>
                Listo
              </button>
            </div>
          )}
          {timerToolId === tool.id && (
            <div>
              {hasCountdown ? (
                <p>
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </p>
              ) : (
                <p>Reproduciendo…</p>
              )}
              <button type="button" onClick={stopTimer}>
                Detener
              </button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
