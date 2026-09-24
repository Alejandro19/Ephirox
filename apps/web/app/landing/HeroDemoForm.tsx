'use client';

import { useState } from 'react';
import { isCorporateEmail } from '@latribu/shared-types';

const CORREO_ERROR = 'Introduce un correo electrónico corporativo válido.';
const WHATSAPP_ERROR = 'Introduce tu número de WhatsApp.';

export function HeroDemoForm({ onContinue }: { onContinue: (correo: string, celular: string) => void }) {
  const [correo, setCorreo] = useState('');
  const [celular, setCelular] = useState('+57 ');
  const [error, setError] = useState<string | null>(null);
  const [continued, setContinued] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const correoValue = correo.trim();
    if (!correoValue.includes('@') || !isCorporateEmail(correoValue)) {
      setError(CORREO_ERROR);
      return;
    }
    if (celular.replace(/\D/g, '').length < 7) {
      setError(WHATSAPP_ERROR);
      return;
    }
    setError(null);
    setContinued(true);
    onContinue(correoValue, celular.trim());
  }

  return (
    <form className="hero-demo-form" onSubmit={handleSubmit} noValidate>
      <div className="hero-demo-row">
        <label>
          <span>Email</span>
          <input
            name="hero-correo"
            type="email"
            placeholder="su@empresa.com"
            value={correo}
            onChange={(e) => { setCorreo(e.target.value); if (error) setError(null); }}
            aria-invalid={error === CORREO_ERROR ? 'true' : undefined}
          />
        </label>
        <label>
          <span>WhatsApp</span>
          <input
            name="hero-celular"
            type="tel"
            placeholder="+57 300 123 4567"
            value={celular}
            onChange={(e) => { setCelular(e.target.value); if (error) setError(null); }}
            aria-invalid={error === WHATSAPP_ERROR ? 'true' : undefined}
          />
        </label>
        <button type="submit" className="hero-demo-btn">Solicite una demo en vivo</button>
      </div>
      {error && <p role="alert" className="hero-demo-msg is-error">{error}</p>}
      {!error && continued && <p role="status" className="hero-demo-msg">Gracias, ahora cuéntenos un poco más sobre su negocio.</p>}
    </form>
  );
}
