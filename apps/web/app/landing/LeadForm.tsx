'use client';

import { useState } from 'react';
import { createEnterpriseLead } from '../../lib/enterprise-leads-client';
import { EMPRESA_TAMANOS, isCorporateEmail } from '@latribu/shared-types';

const CORREO_ERROR = 'Introduce un correo electrónico corporativo válido.';

// Formulario completo que se abre desde el Hero — correo y WhatsApp llegan ya
// capturados; acá se pide el resto: empresa, tamaño de cohorte y sitio web.
// El backend exige un `nombre` de contacto; como este formulario ya no lo
// pide, se envía el nombre de la empresa (el correo identifica a la persona).
export function LeadForm({
  initialCorreo = '',
  initialCelular = '+57 ',
  submitLabel = 'Completar registro',
}: {
  initialCorreo?: string;
  initialCelular?: string;
  submitLabel?: string;
} = {}) {
  const [enviado, setEnviado] = useState(false);
  const [empresa, setEmpresa] = useState('');
  const [correo, setCorreo] = useState(initialCorreo);
  const [correoError, setCorreoError] = useState<string | null>(null);
  const [celular, setCelular] = useState(initialCelular);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateCorreo(value: string): boolean {
    if (!value || !value.includes('@') || !isCorporateEmail(value)) {
      setCorreoError(CORREO_ERROR);
      return false;
    }
    setCorreoError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const correoValue = correo.trim();
    if (!validateCorreo(correoValue)) return;

    const empresaValue = empresa.trim();
    if (!empresaValue) {
      setError('Indica el nombre de la empresa.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createEnterpriseLead({
        nombre: empresaValue,
        correo: correoValue,
        celular: celular.trim(),
        empresa: empresaValue,
        tamano: String(data.get('tamano') || '').trim() || undefined,
        sitioWeb: String(data.get('sitioWeb') || '').trim() || undefined,
      });
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
        <span className="headline">Gracias por tu interés en Ephirox.</span>
        <p>En las próximas horas te escribimos para confirmar el horario de tu demo de 20 minutos.</p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <label className="field-full">
        <span>Nombre de la empresa</span>
        <input name="empresa" placeholder="Nombre de tu empresa" value={empresa} onChange={(e) => { setEmpresa(e.target.value); if (error) setError(null); }} />
      </label>
      <label className="field-half">
        <span>Correo de trabajo</span>
        <input
          name="correo"
          type="email"
          placeholder="nombre@empresa.com"
          value={correo}
          onChange={(e) => { setCorreo(e.target.value); if (correoError) setCorreoError(null); }}
          onBlur={(e) => e.target.value && validateCorreo(e.target.value)}
          aria-invalid={correoError ? 'true' : undefined}
          aria-describedby={correoError ? 'correo-error' : undefined}
        />
      </label>
      <label className="field-half">
        <span>WhatsApp</span>
        <input name="celular" type="tel" placeholder="+57 300 123 4567" value={celular} onChange={(e) => setCelular(e.target.value)} />
      </label>
      {correoError && <p id="correo-error" role="alert" className="field-full field-error">{correoError}</p>}
      <label className="field-half">
        <span>Tamaño de cohorte</span>
        <select name="tamano" defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {EMPRESA_TAMANOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label className="field-half">
        <span>Sitio web de la empresa</span>
        <input name="sitioWeb" placeholder="empresa.com" />
      </label>

      {error && <p role="alert" className="field-full field-error">{error}</p>}
      <button type="submit" className="submit-btn field-full" disabled={saving} style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}>
        {saving ? 'Enviando…' : submitLabel}
      </button>
    </form>
  );
}
