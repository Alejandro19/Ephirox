'use client';

import { useState } from 'react';
import { createEnterpriseLead } from '../../lib/enterprise-leads-client';
import { EQUIPO_TAMANOS } from './content';

export function LeadForm() {
  const [enviado, setEnviado] = useState(false);
  const [nombre, setNombre] = useState('');
  const [tamano, setTamano] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const nombreValue = String(data.get('nombre') || '').trim();
    setSaving(true);
    setError(null);
    try {
      await createEnterpriseLead({
        nombre: nombreValue,
        empresa: String(data.get('empresa') || '').trim(),
        rol: String(data.get('rol') || '').trim(),
        correo: String(data.get('correo') || '').trim(),
        celular: String(data.get('celular') || '').trim(),
        tamano: tamano || undefined,
        quien: String(data.get('quien') || '').trim() || undefined,
      });
      setNombre(nombreValue);
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar tu solicitud. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  if (enviado) {
    return (
      <div className="form-done">
        <span className="headline">{nombre.split(' ')[0] || 'Listo'}, gracias por tu interés en Ephirox.</span>
        <p>En las próximas 48 horas te llamamos — un par de preguntas para entender el contexto de tu empresa — y con eso armamos la propuesta oficial.</p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <label>
        <span>Nombre</span>
        <input name="nombre" required placeholder="Nombre y apellido" />
      </label>
      <div className="field-row-2">
        <label>
          <span>Correo</span>
          <input name="correo" type="email" required placeholder="nombre@empresa.com" />
        </label>
        <label>
          <span>Celular</span>
          <input name="celular" type="tel" required placeholder="+57 300 123 4567" />
        </label>
      </div>
      <div className="field-row-2">
        <label>
          <span>Empresa</span>
          <input name="empresa" required placeholder="Razón social" />
        </label>
        <label>
          <span>Rol</span>
          <input name="rol" required placeholder="CEO, Founder, CFO" />
        </label>
      </div>
      <div className="team-size-field">
        <span>Equipo a considerar</span>
        <div className="chips">
          {EQUIPO_TAMANOS.map((t) => (
            <button key={t} type="button" className={`chip${tamano === t ? ' selected' : ''}`} onClick={() => setTamano(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <label>
        <span>¿Quién más debería estar en esta conversación?</span>
        <input name="quien" placeholder="Opcional" />
      </label>
      {error && <p role="alert" style={{ margin: 0, fontSize: 14, color: '#E37B5A' }}>{error}</p>}
      <button type="submit" className="submit-btn" disabled={saving} style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}>
        {saving ? 'Enviando…' : 'Preparar la propuesta'}
      </button>
    </form>
  );
}
