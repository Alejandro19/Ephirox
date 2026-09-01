'use client';

import { useState } from 'react';
import SegmentedControl from '../ui/SegmentedControl';
import Button from '../ui/Button';

const SCALE_OPTIONS = ['1', '2', '3', '4', '5'].map((v) => ({ value: v, label: v }));

function ScaleQuestion({
  question,
  minLabel,
  maxLabel,
  value,
  onChange,
}: {
  question: string;
  minLabel: string;
  maxLabel: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <span className="font-body" style={{ fontSize: 16, color: 'var(--eph-body)' }}>{question}</span>
      <SegmentedControl options={SCALE_OPTIONS} value={value} onChange={onChange} />
      <div className="flex justify-between font-mono" style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eph-faint)' }}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

// Check-in matutino de autorreporte (Prompt 02 §5 parte 1) — 3 preguntas
// 1-5, una vez por día. Reemplaza la fuente inexistente de "Cortisol AM":
// el score derivado (Activación Matutina) alimenta el cálculo de Carga
// Cognitiva. No bloquea la app: es un bloque más de Stress, no un modal
// obligatorio — el cliente puede seguir usando el módulo sin responder.
export function MorningCheckinPrompt({
  onSubmit,
}: {
  onSubmit: (input: { energia: number; tension: number; claridad: number }) => Promise<void>;
}) {
  const [energia, setEnergia] = useState('3');
  const [tension, setTension] = useState('3');
  const [claridad, setClaridad] = useState('3');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ energia: Number(energia), tension: Number(tension), claridad: Number(claridad) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border" style={{ borderColor: 'var(--eph-line)', background: 'var(--eph-surface)', boxShadow: 'var(--eph-shadow)', padding: 'clamp(26px, 3vw, 38px)', display: 'grid', gap: 28 }}>
      <div
        className="font-mono"
        style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--eph-accent)', paddingBottom: 24, borderBottom: '1px solid var(--eph-line)' }}
      >
        Check-in matutino
      </div>
      <ScaleQuestion
        question="¿Cómo sentiste tu energía al despertar hoy?"
        minLabel="Agotado"
        maxLabel="Con energía"
        value={energia}
        onChange={setEnergia}
      />
      <ScaleQuestion
        question="¿Sentiste tensión o ansiedad apenas despertaste?"
        minLabel="Mucha tensión"
        maxLabel="Ninguna"
        value={tension}
        onChange={setTension}
      />
      <ScaleQuestion
        question="¿Qué tan clara sientes tu mente en este momento?"
        minLabel="Nublada"
        maxLabel="Muy clara"
        value={claridad}
        onChange={setClaridad}
      />
      {error && (
        <p role="alert" className="font-body text-sm" style={{ color: 'var(--eph-danger)' }}>{error}</p>
      )}
      <Button type="button" variant="primary" disabled={saving} onClick={handleSubmit}>
        {saving ? 'Guardando…' : 'Guardar check-in'}
      </Button>
    </div>
  );
}
