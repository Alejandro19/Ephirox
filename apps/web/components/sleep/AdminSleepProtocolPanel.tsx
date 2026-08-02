'use client';

import { useEffect, useState } from 'react';
import { getProtocol, saveProtocol } from '../../lib/sleep-client';

export function AdminSleepProtocolPanel({ clientId }: { clientId: string }) {
  const [protocolText, setProtocolText] = useState('');
  const [sleepWindow, setSleepWindow] = useState('');
  const [supplement, setSupplement] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProtocol(clientId)
      .then((protocol) => {
        setProtocolText(protocol?.protocolText || '');
        setSleepWindow(protocol?.sleepWindow || '');
        setSupplement(protocol?.supplement || '');
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  async function handleSave() {
    try {
      await saveProtocol(clientId, {
        protocol_text: protocolText || null,
        sleep_window: sleepWindow || null,
        supplement: supplement || null,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p>Cargando protocolo de sueño...</p>;

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="sleep-protocol-text">Protocolo</label>
      <textarea id="sleep-protocol-text" value={protocolText} onChange={(e) => setProtocolText(e.target.value)} />
      <label htmlFor="sleep-window">Ventana de sueño</label>
      <input id="sleep-window" value={sleepWindow} onChange={(e) => setSleepWindow(e.target.value)} placeholder="22:30 - 06:30" />
      <label htmlFor="sleep-supplement">Suplemento</label>
      <input id="sleep-supplement" value={supplement} onChange={(e) => setSupplement(e.target.value)} />
      <button type="button" onClick={handleSave}>
        Guardar protocolo
      </button>
    </div>
  );
}
