'use client';

import { useState } from 'react';
import { createEnterpriseLead } from '../../lib/enterprise-leads-client';
import { EMPRESA_TAMANOS, LEAD_CARGOS, isCorporateEmail } from '@latribu/shared-types';
import { COUNTRIES } from './countries';

const CORREO_ERROR = 'Introduce un correo electrónico corporativo válido.';
const DEFAULT_COUNTRY = COUNTRIES[0]; // Colombia
const COUNTRY_BY_NAME = new Map(COUNTRIES.map((c) => [c.name, c]));

// Cambiar de país reemplaza el indicativo del campo WhatsApp por el nuevo,
// sin borrar lo que la persona ya haya escrito después del indicativo viejo.
function applyDialCode(current: string, oldCode: string, newCode: string): string {
  let rest = current.trim();
  if (oldCode && rest.startsWith(oldCode)) rest = rest.slice(oldCode.length).trimStart();
  return rest ? `${newCode} ${rest}` : `${newCode} `;
}

export function LeadForm() {
  const [enviado, setEnviado] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [correoError, setCorreoError] = useState<string | null>(null);
  const [pais, setPais] = useState(DEFAULT_COUNTRY.name);
  const [celular, setCelular] = useState(`${DEFAULT_COUNTRY.dialCode} `);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePaisChange(newPaisName: string) {
    const oldCode = COUNTRY_BY_NAME.get(pais)?.dialCode ?? '';
    const newCode = COUNTRY_BY_NAME.get(newPaisName)?.dialCode ?? '';
    setPais(newPaisName);
    setCelular((current) => applyDialCode(current, oldCode, newCode));
  }

  // Revelado progresivo (punto 12.1): el Paso 2 aparece en cuanto Nombre y
  // Apellido tienen contenido real — mismo mecanismo en web y en mobile, no
  // depende del ancho de pantalla.
  const showStep2 = nombre.trim().length > 0 && apellido.trim().length > 0;

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
    const form = e.currentTarget;
    const data = new FormData(form);
    const correoValue = String(data.get('correo') || '').trim();
    if (!validateCorreo(correoValue)) return;

    const nombreValue = String(data.get('nombre') || '').trim();
    const apellidoValue = String(data.get('apellido') || '').trim();
    const nombreCompleto = [nombreValue, apellidoValue].filter(Boolean).join(' ');

    setSaving(true);
    setError(null);
    try {
      await createEnterpriseLead({
        nombre: nombreCompleto,
        correo: correoValue,
        celular: celular.trim(),
        empresa: String(data.get('empresa') || '').trim() || undefined,
        rol: String(data.get('rol') || '').trim() || undefined,
        tamano: String(data.get('tamano') || '').trim() || undefined,
        pais: pais.trim() || undefined,
        sitioWeb: String(data.get('sitioWeb') || '').trim() || undefined,
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
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <label className="field-correo">
        <span>Correo de trabajo</span>
        <input
          name="correo"
          type="email"
          required
          placeholder="nombre@empresa.com"
          value={correo}
          onChange={(e) => {
            setCorreo(e.target.value);
            if (correoError) setCorreoError(null);
          }}
          onBlur={(e) => e.target.value && validateCorreo(e.target.value)}
          aria-invalid={correoError ? 'true' : undefined}
          aria-describedby={correoError ? 'correo-error' : undefined}
        />
      </label>
      {correoError && <p id="correo-error" role="alert" className="field-full field-error">{correoError}</p>}

      <label className="field-half">
        <span>Nombre</span>
        <input name="nombre" required placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label className="field-half">
        <span>Apellido</span>
        <input name="apellido" required placeholder="Tu apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} />
      </label>

      {showStep2 && (
        <div className="step2-fields">
          <label className="field-full">
            <span>Empresa</span>
            <input name="empresa" placeholder="Nombre de tu empresa" />
          </label>
          <label className="field-half">
            <span>Cargo</span>
            <select name="rol" defaultValue="">
              <option value="" disabled>Selecciona…</option>
              {LEAD_CARGOS.map((cargo) => <option key={cargo} value={cargo}>{cargo}</option>)}
            </select>
          </label>
          <label className="field-half">
            <span>Tamaño de cohorte</span>
            <select name="tamano" defaultValue="">
              <option value="" disabled>Selecciona…</option>
              {EMPRESA_TAMANOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="field-half">
            <span>Sede / país</span>
            <select name="pais" value={pais} onChange={(e) => handlePaisChange(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </label>
          <label className="field-half">
            <span>Sitio web de la empresa</span>
            <input name="sitioWeb" placeholder="empresa.com" />
          </label>
          <label className="field-full">
            <span>WhatsApp</span>
            <input
              name="celular"
              type="tel"
              required
              placeholder="+57 300 123 4567"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
            />
          </label>
        </div>
      )}

      {error && <p role="alert" className="field-full" style={{ margin: 0, fontSize: 14, color: '#B0432C' }}>{error}</p>}
      <button type="submit" className="submit-btn field-full" disabled={saving} style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}>
        {saving ? 'Enviando…' : 'Solicitar una demo'}
      </button>
    </form>
  );
}
