'use client';

import { useEffect, useState } from 'react';
import {
  EXECUTIVE_CATEGORIES,
  EXECUTIVE_CATEGORY_LABELS,
  EXECUTIVE_PERSONAS,
  EXECUTIVE_QUESTIONS,
  EXECUTIVE_SCALE,
  FORTALEZAS,
  RIESGOS,
  SEGMENTO_INFO,
  computeExecutiveResult,
  type ExecutiveEvaluation,
} from '@latribu/shared-types';
import { COACH_WHATSAPP_NUMBER } from '@/lib/constants';
import { LeadForm } from './LeadForm';
import { generateExecutivePdf } from './executive-score-pdf';

type Step = 'intro' | 'preguntas' | 'negocio' | 'contacto' | 'resultado';
type Negocio = { personas: (typeof EXECUTIVE_PERSONAS)[number] | null; equipoDirectivo: boolean | null; evaluarEquipo: boolean | null };

// Executive Performance Score™ — auditoría breve de rendimiento ejecutivo.
// Flujo: intro discreta → 15 preguntas (una por pantalla) → 3 preguntas de
// contexto empresarial → captura de contacto (el resultado es la recompensa,
// así que el lead queda guardado ANTES de verlo) → resultado en lenguaje
// ejecutivo → "Solicitar revisión ejecutiva" (abre WhatsApp para agendar).
// Nunca "compra ahora".
export function ExecutiveScoreModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('intro');
  const [index, setIndex] = useState(0);
  const [respuestas, setRespuestas] = useState<number[]>([]);
  const [negocio, setNegocio] = useState<Negocio>({ personas: null, equipoDirectivo: null, evaluarEquipo: null });
  const [contacto, setContacto] = useState<{ nombre: string; empresa: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const total = EXECUTIVE_QUESTIONS.length;
  const negocioCompleto = negocio.personas !== null && negocio.equipoDirectivo !== null && negocio.evaluarEquipo !== null;

  function answer(value: number) {
    const next = [...respuestas];
    next[index] = value;
    setRespuestas(next);
    if (index + 1 < total) setIndex(index + 1);
    else setStep('negocio');
  }

  function back() {
    if (step === 'negocio') { setStep('preguntas'); setIndex(total - 1); return; }
    if (step === 'contacto') { setStep('negocio'); return; }
    if (index > 0) setIndex(index - 1);
    else setStep('intro');
  }

  const evaluacion: ExecutiveEvaluation | null = negocioCompleto
    ? { respuestas, personas: negocio.personas!, equipoDirectivo: negocio.equipoDirectivo!, evaluarEquipo: negocio.evaluarEquipo! }
    : null;

  return (
    <div className="lead-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lead-modal score-modal" role="dialog" aria-modal="true" aria-label="Executive Performance Score">
        <button type="button" className="lead-modal-close" aria-label="Cerrar" onClick={onClose}>×</button>

        {step === 'intro' && (
          <div className="score-intro">
            <span className="score-kicker">Executive Performance Score™</span>
            <h2>Descubre si estás operando a tu máximo nivel de rendimiento ejecutivo.</h2>
            <p>Responde algunas preguntas para identificar riesgos ocultos que pueden afectar tu energía, claridad mental y capacidad de liderazgo.</p>
            <span className="score-meta">3–5 minutos · {total} preguntas</span>
            <button type="button" className="score-primary" onClick={() => setStep('preguntas')}>Comenzar evaluación</button>
          </div>
        )}

        {step === 'preguntas' && (
          <div className="score-question">
            <div className="score-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + 1} aria-label="Avance de la evaluación">
              <div style={{ width: `${((index + 1) / total) * 100}%` }} />
            </div>
            <span className="score-kicker">{EXECUTIVE_CATEGORY_LABELS[EXECUTIVE_QUESTIONS[index].category]} · {index + 1} de {total}</span>
            <h2>{EXECUTIVE_QUESTIONS[index].texto}</h2>
            <div className="score-options" role="group" aria-label="Frecuencia">
              {EXECUTIVE_SCALE.map((label, value) => (
                <button key={label} type="button" className={`score-option${respuestas[index] === value ? ' is-selected' : ''}`} onClick={() => answer(value)}>
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="score-back" onClick={back}>← Atrás</button>
          </div>
        )}

        {step === 'negocio' && (
          <div className="score-negocio">
            <span className="score-kicker">Contexto de liderazgo</span>
            <h2>Tres datos para contextualizar tu resultado.</h2>
            <fieldset>
              <legend>¿Cuántas personas dependen directamente de tus decisiones?</legend>
              <div className="score-chips">
                {EXECUTIVE_PERSONAS.map((p) => (
                  <button key={p} type="button" className={`score-chip${negocio.personas === p ? ' is-selected' : ''}`} onClick={() => setNegocio({ ...negocio, personas: p })}>{p}</button>
                ))}
              </div>
            </fieldset>
            <YesNo legend="¿Tienes equipo directivo?" value={negocio.equipoDirectivo} onChange={(v) => setNegocio({ ...negocio, equipoDirectivo: v })} />
            <YesNo legend="¿Te interesaría evaluar también a tu equipo de liderazgo?" value={negocio.evaluarEquipo} onChange={(v) => setNegocio({ ...negocio, evaluarEquipo: v })} />
            <div className="score-actions">
              <button type="button" className="score-back" onClick={back}>← Atrás</button>
              <button type="button" className="score-primary" disabled={!negocioCompleto} onClick={() => setStep('contacto')}>Continuar</button>
            </div>
          </div>
        )}

        {step === 'contacto' && evaluacion && (
          <div className="score-contacto">
            <span className="score-kicker">Tu resultado está listo</span>
            <h2>Déjanos tus datos para mostrarte tu perfil ejecutivo.</h2>
            <LeadForm
              compact
              evaluacion={evaluacion}
              submitLabel="Ver mi resultado"
              onSubmitted={(info) => { setContacto(info); setStep('resultado'); }}
            />
            <button type="button" className="score-back" onClick={back}>← Atrás</button>
          </div>
        )}

        {step === 'resultado' && evaluacion && contacto && <Resultado evaluacion={evaluacion} contacto={contacto} />}
      </div>
    </div>
  );
}

function YesNo({ legend, value, onChange }: { legend: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="score-chips">
        <button type="button" className={`score-chip${value === true ? ' is-selected' : ''}`} onClick={() => onChange(true)}>Sí</button>
        <button type="button" className={`score-chip${value === false ? ' is-selected' : ''}`} onClick={() => onChange(false)}>No</button>
      </div>
    </fieldset>
  );
}

function Resultado({ evaluacion, contacto }: { evaluacion: ExecutiveEvaluation; contacto: { nombre: string; empresa: string } }) {
  const result = computeExecutiveResult(evaluacion.respuestas);
  const segmento = SEGMENTO_INFO[result.segmento];
  const fortaleza = FORTALEZAS[result.fortaleza];
  const riesgo = RIESGOS[result.riesgo];
  const whatsappUrl = `https://wa.me/${COACH_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, hice el Executive Performance Score (${result.score}/100) y quiero solicitar mi revisión ejecutiva.`)}`;

  function handleDescargarInforme() {
    generateExecutivePdf({ nombre: contacto.nombre, empresa: contacto.empresa, result, segmento, fortaleza, riesgo });
  }

  return (
    <div className="score-result">
      <span className="score-kicker">Executive Performance Score™</span>
      <span className="score-card-label score-riesgo-kicker">Riesgo ejecutivo</span>
      <div className="score-number" aria-label={`${result.score} de 100`}>
        <strong>{result.score}</strong><span>/100</span>
      </div>
      <p className="score-segmento"><b>{segmento.label}.</b> {segmento.mensaje}</p>

      <div className="score-cards">
        <div className="score-card">
          <span className="score-card-label">Fortaleza principal</span>
          <strong>{fortaleza.titulo}</strong>
          <p>{fortaleza.texto}</p>
        </div>
        <div className="score-card">
          <span className="score-card-label">Principal riesgo</span>
          <strong>{riesgo.titulo}</strong>
          <p>{riesgo.texto}</p>
        </div>
      </div>

      <div className="score-impact">
        <span className="score-card-label">Impacto potencial</span>
        <p>Si esta tendencia continúa, puede afectar:</p>
        <ul>{riesgo.impactos.map((i) => <li key={i}>{i}</li>)}</ul>
      </div>

      <div className="score-bars" aria-label="Perfil por dimensión">
        {EXECUTIVE_CATEGORIES.map((c) => (
          <div key={c} className="score-bar-row">
            <span>{EXECUTIVE_CATEGORY_LABELS[c]}</span>
            <div className="score-bar"><div style={{ width: `${Math.max(6, result.categorias[c])}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="score-final">
        <h3>Tu rendimiento actual tiene oportunidades de mejora.</h3>
        <p>Tus resultados sugieren que existen factores invisibles que podrían afectar tu energía, claridad mental y capacidad de liderazgo.</p>
        <p>Agenda una sesión estratégica para revisar tus resultados y determinar si calificas para el Executive Program.</p>
        <a className="score-primary score-link" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Solicitar revisión ejecutiva</a>
        <button type="button" className="score-secondary" onClick={handleDescargarInforme}>Recibir mi Informe Ejecutivo</button>
        <span className="score-disclaimer">Indicador orientativo de rendimiento ejecutivo; no constituye diagnóstico ni tratamiento médico.</span>
      </div>
    </div>
  );
}
