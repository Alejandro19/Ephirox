'use client';

import { useState } from 'react';
import { createEnterpriseLead } from '../../lib/enterprise-leads-client';

export function LeadForm() {
  const [enviado, setEnviado] = useState(false);
  const [nombre, setNombre] = useState('');
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
        correo: String(data.get('correo') || '').trim(),
        celular: String(data.get('celular') || '').trim(),
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
        <p>En las próximas horas te escribimos para confirmar el horario de tu demo de 20 minutos.</p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <label className="field-full">
        <span>Nombre</span>
        <input name="nombre" required placeholder="Nombre y apellido" />
      </label>
      <label className="field-correo">
        <span>Correo</span>
        <input name="correo" type="email" required placeholder="nombre@empresa.com" />
      </label>
      <label className="field-celular">
        <span>WhatsApp</span>
        <input name="celular" type="tel" required placeholder="+57 300 123 4567" />
      </label>
      {error && <p role="alert" className="field-full" style={{ margin: 0, fontSize: 14, color: '#B0432C' }}>{error}</p>}
      <button type="submit" className="submit-btn field-full" disabled={saving} style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}>
        {saving ? 'Enviando…' : 'Solicitar una demo'}
      </button>
    </form>
  );
}
