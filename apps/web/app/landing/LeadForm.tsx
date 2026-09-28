'use client';

import { useEffect, useState } from 'react';
import { createEnterpriseLead, requestLeadVerification, confirmLeadVerification } from '../../lib/enterprise-leads-client';
import { EMPRESA_TAMANOS, LEAD_CODE_LENGTH, PHONE_ERROR, TEXT_ERROR, isCorporateEmail, isPlausiblePhone, isPlausibleText, type ExecutiveEvaluation } from '@latribu/shared-types';

const CORREO_ERROR = 'Introduce un correo electrónico corporativo válido.';

// Formulario completo que se abre desde el Hero — correo y WhatsApp llegan ya
// capturados; acá se pide el resto: empresa, tamaño de cohorte y sitio web.
// El backend exige un `nombre` de contacto; como este formulario ya no lo
// pide, se envía el nombre de la empresa (el correo identifica a la persona).
export function LeadForm({
  initialCorreo = '',
  initialCelular = '+57 ',
  submitLabel = 'Completar registro',
  compact = false,
  evaluacion,
  onSubmitted,
  onCodeStepChange,
}: {
  initialCorreo?: string;
  initialCelular?: string;
  submitLabel?: string;
  // Modo del Executive Performance Score: pide Nombre + Empresa + contacto
  // (sin tamaño de cohorte ni sitio web) y adjunta las respuestas del score.
  compact?: boolean;
  evaluacion?: ExecutiveEvaluation;
  // Si se pasa, al guardar el lead se llama esto en vez de mostrar el
  // "gracias" propio (el Executive Score sigue con su pantalla de resultado,
  // que necesita nombre/empresa para el PDF descargable).
  onSubmitted?: (info: { nombre: string; empresa: string }) => void;
  // El paso de código de verificación trae su propia frase explicativa ("Te
  // enviamos un código..."); el padre puede usar esto para ocultar un título
  // suyo que solo tiene sentido antes de pedir el código (ver ExecutiveScoreModal).
  onCodeStepChange?: (inCodeStep: boolean) => void;
} = {}) {
  const [enviado, setEnviado] = useState(false);
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [correo, setCorreo] = useState(initialCorreo);
  const [correoError, setCorreoError] = useState<string | null>(null);
  const [celular, setCelular] = useState(initialCelular);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Verificación del correo: se pide un código antes de guardar el lead, para
  // asegurar que el correo existe y es de quien lo escribe.
  const [codeStep, setCodeStep] = useState(false);
  const [code, setCode] = useState('');
  const [hp, setHp] = useState('');
  const [verified, setVerified] = useState<{ correo: string; token: string } | null>(null);
  const [extra, setExtra] = useState<{ tamano?: string; sitioWeb?: string }>({});

  useEffect(() => {
    onCodeStepChange?.(codeStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeStep]);

  function validateCorreo(value: string): boolean {
    if (!value || !value.includes('@') || !isCorporateEmail(value)) {
      setCorreoError(CORREO_ERROR);
      return false;
    }
    setCorreoError(null);
    return true;
  }

  async function saveLead(token: string) {
    const empresaValue = empresa.trim();
    await createEnterpriseLead({
      nombre: compact ? nombre.trim() : empresaValue,
      correo: correo.trim(),
      celular: celular.trim(),
      empresa: empresaValue,
      tamano: extra.tamano,
      sitioWeb: extra.sitioWeb,
      ...(evaluacion ? { evaluacion } : {}),
      verificationToken: token,
      hp,
    });
    if (onSubmitted) onSubmitted({ nombre: compact ? nombre.trim() : empresaValue, empresa: empresaValue });
    else setEnviado(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const correoValue = correo.trim();
    if (!validateCorreo(correoValue)) return;

    if (!isPlausibleText(empresa)) {
      setError(empresa.trim() ? TEXT_ERROR : 'Indica el nombre de la empresa.');
      return;
    }
    if (compact && !isPlausibleText(nombre)) {
      setError(nombre.trim() ? TEXT_ERROR : 'Indica tu nombre.');
      return;
    }
    if (!isPlausiblePhone(celular)) {
      setError(PHONE_ERROR);
      return;
    }

    setExtra({
      tamano: String(data.get('tamano') || '').trim() || undefined,
      sitioWeb: String(data.get('sitioWeb') || '').trim() || undefined,
    });
    setSaving(true);
    setError(null);
    try {
      // Correo ya verificado en esta sesión: se guarda directo. Si no, se
      // manda el código y se pide antes de guardar.
      if (verified && verified.correo === correoValue.toLowerCase()) {
        await saveLead(verified.token);
      } else {
        await requestLeadVerification(correoValue);
        setCode('');
        setCodeStep(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar tu solicitud. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmCode() {
    setSaving(true);
    setError(null);
    try {
      const token = await confirmLeadVerification(correo.trim(), code.trim());
      setVerified({ correo: correo.trim().toLowerCase(), token });
      await saveLead(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos verificar el código. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResend() {
    setSaving(true);
    setError(null);
    try {
      await requestLeadVerification(correo.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos reenviar el código.');
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

  if (codeStep) {
    return (
      <div className="contact-form code-step">
        <p className="field-full" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
          Te enviamos un código de {LEAD_CODE_LENGTH} dígitos a <strong>{correo.trim()}</strong>. Escríbelo para confirmar tu correo.
        </p>
        <label className="field-full">
          <span>Código de verificación</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={LEAD_CODE_LENGTH}
            placeholder="000000"
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); if (error) setError(null); }}
          />
        </label>
        {error && <p role="alert" className="field-full field-error">{error}</p>}
        <button type="button" className="submit-btn field-full" disabled={saving || code.length !== LEAD_CODE_LENGTH} onClick={handleConfirmCode} style={{ opacity: saving || code.length !== LEAD_CODE_LENGTH ? 0.6 : 1 }}>
          {saving ? 'Verificando…' : 'Verificar y continuar'}
        </button>
        <div className="field-full" style={{ display: 'flex', gap: 18, fontSize: 13 }}>
          <button type="button" onClick={handleResend} disabled={saving} style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Reenviar código</button>
          <button type="button" onClick={() => { setCodeStep(false); setError(null); }} style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Cambiar correo</button>
        </div>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      {/* Honeypot: fuera de pantalla y sin foco; una persona no lo ve, un bot sí lo llena. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />
      {compact && (
        <label className="field-full">
          <span>Nombre y apellido</span>
          <input name="nombre" placeholder="Tu nombre" value={nombre} onChange={(e) => { setNombre(e.target.value); if (error) setError(null); }} />
        </label>
      )}
      <label className="field-full">
        <span>Nombre de la empresa</span>
        <input name="empresa" placeholder="Nombre de tu empresa" value={empresa} onChange={(e) => { setEmpresa(e.target.value); if (error) setError(null); }} />
      </label>
      <label className="field-half">
        <span>Email</span>
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
      {!compact && (
        <>
      <label className="field-half">
          <span>Cantidad de cohorte</span>
          <select name="tamano" defaultValue="">
            <option value="" disabled>Elija una opción</option>
            {EMPRESA_TAMANOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="field-half">
          <span>Sitio web de la empresa</span>
          <input name="sitioWeb" placeholder="empresa.com" />
        </label>
        </>
      )}

      {error && <p role="alert" className="field-full field-error">{error}</p>}
      <button type="submit" className="submit-btn field-full" disabled={saving} style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}>
        {saving ? 'Enviando…' : submitLabel}
      </button>
      {/* El correo se manda por una API externa (Resend) — el viaje de ida y
          vuelta real toma un par de segundos. Sin este texto, el formulario
          se queda quieto con un botón atenuado y da la sensación de que algo
          se colgó en vez de estar progresando. */}
      {saving && <p className="field-full" style={{ margin: 0, fontSize: 13, opacity: 0.65 }}>Confirmando tu correo, un momento…</p>}
    </form>
  );
}
