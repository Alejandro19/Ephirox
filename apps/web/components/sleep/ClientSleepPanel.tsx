'use client';

import { useEffect, useState } from 'react';
import { getProtocol, getTodayLog, logSleep, type SleepProtocol, type SleepLog } from '../../lib/sleep-client';

export function ClientSleepPanel({ clientId }: { clientId: string }) {
  const [protocol, setProtocol] = useState<SleepProtocol>(null);
  const [todayLog, setTodayLog] = useState<SleepLog | null>(null);
  const [hours, setHours] = useState('');
  const [quality, setQuality] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProtocol(clientId), getTodayLog(clientId)])
      .then(([p, log]) => {
        setProtocol(p);
        setTodayLog(log);
        if (log) {
          setHours(String(log.hours));
          setQuality(String(log.quality));
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  async function handleLogSleep() {
    if (!hours || !quality) return;
    try {
      const log = await logSleep(clientId, { hours: Number(hours), quality: Number(quality) });
      setTodayLog(log);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p>Cargando tu protocolo de sueño...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <div>
      {protocol ? (
        <div>
          {protocol.protocolText && <p>{protocol.protocolText}</p>}
          {protocol.sleepWindow && <p>Ventana de sueño: {protocol.sleepWindow}</p>}
          {protocol.supplement && <p>Suplemento: {protocol.supplement}</p>}
        </div>
      ) : (
        <p>Todavía no tienes un protocolo de sueño asignado.</p>
      )}

      <h3>Registro de hoy</h3>
      <label htmlFor="sleep-hours">Horas dormidas</label>
      <input id="sleep-hours" type="number" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
      <label htmlFor="sleep-quality">Calidad (1-5)</label>
      <select id="sleep-quality" value={quality} onChange={(e) => setQuality(e.target.value)}>
        <option value="">Selecciona</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
      <button type="button" onClick={handleLogSleep}>
        Guardar registro de hoy
      </button>
    </div>
  );
}
