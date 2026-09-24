'use client';

import { useEffect } from 'react';
import { LeadForm } from './LeadForm';

export function LeadModal({ correo, celular, onClose }: { correo: string; celular: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="lead-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
        <button type="button" className="lead-modal-close" aria-label="Cerrar" onClick={onClose}>×</button>
        <h2 id="lead-modal-title">Agende una demo personalizada</h2>
        <LeadForm initialCorreo={correo} initialCelular={celular} revealAll submitLabel="Completar registro" />
      </div>
    </div>
  );
}
