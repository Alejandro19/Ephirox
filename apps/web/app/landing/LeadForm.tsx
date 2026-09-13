'use client';

import { useState } from 'react';
import { createEnterpriseLead } from '../../lib/enterprise-leads-client';
import { EQUIPO_TAMANOS } from './content';

export function LeadForm() {
  const [enviado, setEnviado] = useState(false);
  const [nombre, setNombre] = useState('');
  const [tamano, setTamano] = useState<string>(EQUIPO_TAMANOS[1]);
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
      <label className="field-full">
        <span>Nombre</span>
        <input name="nombre" required placeholder="Nombre y apellido" />
      </label>
      <label className="field-180">
        <span>Correo</span>
        <input name="correo" type="email" required placeholder="nombre@empresa.com" />
      </label>
      <label className="field-150">
        <span>Celular</span>
        <input name="celular" type="tel" required placeholder="+57 300 123 4567" />
      </label>
      <label className="field-180">
        <span>Empresa</span>
        <input name="empresa" required placeholder="Razón social" />
      </label>
      <label className="field-150">
        <span>Rol</span>
        <input name="rol" required placeholder="CEO, Founder, CFO" />
      </label>
      <div className="team-size-field field-full">
        <span>Equipo a considerar</span>
        <div className="chips">
          {EQUIPO_TAMANOS.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip${tamano === t ? ' selected' : ''}`}
              aria-pressed={tamano === t}
              onClick={() => setTamano(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <label className="field-full">
        <span>¿Quién más debería estar en esta conversación?</span>
        <input name="quien" placeholder="Opcional" />
      </label>
      {error && <p role="alert" className="field-full" style={{ margin: 0, fontSize: 14, color: '#B0432C' }}>{error}</p>}
      <button type="submit" className="submit-btn field-full" disabled={saving} style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}>
        {saving ? 'Enviando…' : 'Preparar la propuesta'}
      </button>
    </form>
  );
}
