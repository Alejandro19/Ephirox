'use client';

import { useEffect } from 'react';

const OPTIONS = [
  { key: 'cliente', icon: '💡', label: 'Soy cliente y tengo una duda', text: 'Hola, soy cliente de Ephirox y tengo una duda.' },
  { key: 'vendedor', icon: '⚡', label: 'Contactar a un vendedor', text: 'Hola, quiero hablar con alguien del equipo comercial de Ephirox.' },
  { key: 'soporte', icon: '🛟', label: 'Contactar a soporte', text: 'Hola, necesito soporte con Ephirox.' },
];

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.1c-1.5 0-2.9-.4-4.1-1.1l-.3-.2-3.1.9.9-3-.2-.3a8.1 8.1 0 1 1 6.8 3.7Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-1.5-.7-2.5-1.3-3.4-2.9-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.7 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

export function ChatWidget({ open, onToggle, whatsappNumber }: { open: boolean; onToggle: (open: boolean) => void; whatsappNumber: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggle(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onToggle]);

  const link = (text: string) => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;

  return (
    <>
      {open && (
        <div className="wa-panel" role="dialog" aria-label="Chatea con nosotros">
          <div className="wa-panel-head">
            <span className="wa-avatar" aria-hidden="true">E</span>
            <div>
              <strong>Ephirox</strong>
              <span>Tu contacto directo con el equipo</span>
            </div>
            <button type="button" className="wa-panel-close" aria-label="Cerrar" onClick={() => onToggle(false)}>×</button>
          </div>
          <div className="wa-panel-body">
            <p className="wa-greeting">Hola, elegí una opción y te llevamos directo a WhatsApp.</p>
            {OPTIONS.map((o) => (
              <a key={o.key} className="wa-option" href={link(o.text)} target="_blank" rel="noopener noreferrer">
                <span className="wa-option-icon" aria-hidden="true">{o.icon}</span>
                <span className="wa-option-label">{o.label}</span>
                <span aria-hidden="true">›</span>
              </a>
            ))}
            <a className="wa-interested" href={link('Hola, estoy interesado/a en Ephirox para mi empresa.')} target="_blank" rel="noopener noreferrer">
              Estoy interesado/a en… <span aria-hidden="true">➤</span>
            </a>
          </div>
        </div>
      )}
      <button type="button" className="wa-float" aria-expanded={open} onClick={() => onToggle(!open)}>
        <WhatsAppIcon />
        <span>Chatea con nosotros</span>
      </button>
    </>
  );
}
