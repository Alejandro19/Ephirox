'use client';

import { useEffect, useState } from 'react';
import {
  getEvolutionData, createCheckin,
  listPersonalRecords,
  type EvolutionData, type PersonalRecord,
} from '../../lib/evolution-client';

type ScoreField = {
  key: 'strength_score' | 'mood_score' | 'confidence_score' | 'security_score' | 'energy_score';
  label: string;
  emoji: string;
};

type CheckinForm = {
  fecha: string;
  strength_score: string;
  mood_score: string;
  confidence_score: string;
  security_score: string;
  energy_score: string;
  sleep_hours: string;
  adherence_pct: string;
  pain_flag: boolean;
  pain_notes: string;
  stress_score: string;
  notes: string;
};

const SCORE_FIELDS: ScoreField[] = [
  { key: 'strength_score', label: 'Fuerza', emoji: '💪' },
  { key: 'mood_score', label: 'Ánimo', emoji: '😊' },
  { key: 'confidence_score', label: 'Confianza', emoji: '🛡️' },
  { key: 'security_score', label: 'Seguridad', emoji: '🧘' },
  { key: 'energy_score', label: 'Energía', emoji: '⚡' },
];

const EMPTY_FORM: CheckinForm = {
  fecha: new Date().toISOString().slice(0, 10),
  strength_score: '', mood_score: '', confidence_score: '',
  security_score: '', energy_score: '', sleep_hours: '',
  adherence_pct: '', pain_flag: false, pain_notes: '',
  stress_score: '', notes: '',
};

function scoreColor(n: number | null): string {
  if (n == null) return '#ccc';
  if (n <= 3) return '#e74c3c';
  if (n <= 6) return '#f39c12';
  return '#27ae60';
}

function formatDate(fecha: string): string {
  try {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return fecha; }
}

export function ClientEvolutionPanel({ clientId }: { clientId: string }) {
  const [data, setData] = useState<EvolutionData | null>(null);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<CheckinForm>({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);

  async function loadData() {
    try {
      const [evo, recs] = await Promise.all([
        getEvolutionData(clientId),
        listPersonalRecords(clientId),
      ]);
      setData(evo);
      setRecords(recs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [clientId]);

  async function handleCreateCheckin() {
    try {
      const payload: Record<string, unknown> = { fecha: form.fecha };
      for (const f of SCORE_FIELDS) {
        const val = form[f.key];
        if (val !== '') payload[f.key] = Number(val);
      }
      if (form.sleep_hours !== '') payload.sleep_hours = Number(form.sleep_hours);
      if (form.adherence_pct !== '') payload.adherence_pct = Number(form.adherence_pct);
      if (form.pain_flag) payload.pain_flag = true;
      if (form.pain_notes) payload.pain_notes = form.pain_notes;
      if (form.stress_score !== '') payload.stress_score = Number(form.stress_score);
      if (form.notes) payload.notes = form.notes;

      await createCheckin(clientId, payload as Parameters<typeof createCheckin>[1]);
      setForm({ ...EMPTY_FORM, fecha: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const cardStyle: React.CSSProperties = {
    padding: '1.5rem',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    background: '#fff',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.8rem',
    border: '1px solid #d0d0d0', borderRadius: '8px',
    fontSize: '0.95rem', marginBottom: '0.75rem',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '0.6rem 1.5rem', background: '#2c3e50', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem',
  };

  const btnSecondary: React.CSSProperties = {
    padding: '0.5rem 1.2rem', background: '#f0f0f0', color: '#333',
    border: '1px solid #d0d0d0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem',
  };

  if (loading) return <p style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Cargando tu evolución...</p>;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {error && (
        <div role="alert" style={{
          background: '#ffeaea', color: '#c0392b', padding: '0.75rem 1rem',
          borderRadius: '8px', marginBottom: '1rem',
        }}>
          {error}
          <button onClick={() => setError(null)} style={{
            marginLeft: '1rem', cursor: 'pointer', background: 'none',
            border: 'none', color: '#c0392b', textDecoration: 'underline',
          }}>Cerrar</button>
        </div>
      )}

      {/* ── Header + Botón nuevo check-in ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>📊 Mis Check-ins</h2>
        {!showForm && (
          <button style={btnPrimary} onClick={() => setShowForm(true)}>
            + Nuevo check-in
          </button>
        )}
      </div>

      {/* ── Formulario de check-in ── */}
      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Registrar check-in</h3>

          <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Fecha</label>
          <input type="date" value={form.fecha}
            onChange={e => setForm(s => ({ ...s, fecha: e.target.value }))}
            style={inputStyle} />

          <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Puntajes (1-10)
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.5rem', marginBottom: '1rem',
          }}>
            {SCORE_FIELDS.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '0.85rem', color: '#555' }}>
                  {f.emoji} {f.label}
                </label>
                <input type="number" min={1} max={10} placeholder="1-10"
                  value={form[f.key]}
                  onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 0 }} />
              </div>
            ))}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
          }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#555' }}>Estrés (1-10)</label>
              <input type="number" min={1} max={10} placeholder="1-10"
                value={form.stress_score}
                onChange={e => setForm(s => ({ ...s, stress_score: e.target.value }))}
                style={{ ...inputStyle, marginBottom: 0 }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#555' }}>Horas de sueño</label>
              <input type="number" min={0} max={24} step={0.5} placeholder="Ej: 7.5"
                value={form.sleep_hours}
                onChange={e => setForm(s => ({ ...s, sleep_hours: e.target.value }))}
                style={{ ...inputStyle, marginBottom: 0 }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#555' }}>Adherencia %</label>
              <input type="number" min={0} max={100} placeholder="0-100"
                value={form.adherence_pct}
                onChange={e => setForm(s => ({ ...s, adherence_pct: e.target.value }))}
                style={{ ...inputStyle, marginBottom: 0 }} />
            </div>
          </div>


          <div style={{ marginTop: '0.75rem' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              cursor: 'pointer', fontSize: '0.9rem',
            }}>
              <input type="checkbox" checked={form.pain_flag}
                onChange={e => setForm(s => ({ ...s, pain_flag: e.target.checked }))} />
              ¿Dolor o molestia?
            </label>
            {form.pain_flag && (
              <input type="text" placeholder="Describe el dolor..." value={form.pain_notes}
                onChange={e => setForm(s => ({ ...s, pain_notes: e.target.value }))}
                style={{ ...inputStyle, marginTop: '0.5rem' }} />
            )}
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#555' }}>Notas</label>
            <textarea rows={3} placeholder="¿Cómo te sentiste esta semana?"
              value={form.notes}
              onChange={e => setForm(s => ({ ...s, notes: e.target.value }))}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button style={btnPrimary} onClick={handleCreateCheckin}>
              Guardar check-in
            </button>
            <button style={btnSecondary} onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Check-ins ── */}
      {data && data.checkins.length === 0 ? (
        <p style={{ color: '#888', textAlign: 'center', padding: '2rem 0' }}>
          Aún no tienes check-ins registrados. ¡Crea el primero!
        </p>
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem',
        }}>
          {data?.checkins.map(checkin => (
            <div key={checkin.id} style={cardStyle}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '0.75rem',
              }}>
                <strong>{formatDate(checkin.fecha)}</strong>
                {checkin.sleepHours != null && (
                  <span style={{ fontSize: '0.85rem', color: '#888' }}>
                    😴 {checkin.sleepHours}h
                  </span>
                )}
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                gap: '0.5rem',
              }}>
                {SCORE_FIELDS.map(f => {
                  const valMap: Record<string, number | null> = {
                    strength_score: checkin.strengthScore,
                    mood_score: checkin.moodScore,
                    confidence_score: checkin.confidenceScore,
                    security_score: checkin.securityScore,
                    energy_score: checkin.energyScore,
                  };
                  const val = valMap[f.key];
                  return (
                    <div key={f.key} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem' }}>{f.emoji}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: scoreColor(val) }}>
                        {val ?? '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>{f.label}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                display: 'flex', gap: '1.5rem', marginTop: '0.75rem',
                fontSize: '0.85rem', color: '#666',
              }}>
                {checkin.stressScore != null && <span>😰 Estrés: {checkin.stressScore}/10</span>}
                {checkin.adherencePct != null && <span>📋 Adherencia: {checkin.adherencePct}%</span>}
                {checkin.painFlag && <span style={{ color: '#e74c3c' }}>⚠️ Dolor reportado</span>}
              </div>

              {(checkin.painNotes || checkin.notes) && (
                <div style={{
                  marginTop: '0.5rem', padding: '0.5rem',
                  background: '#f8f8f8', borderRadius: '6px', fontSize: '0.85rem',
                }}>
                  {checkin.painNotes && <p style={{ margin: 0, color: '#c0392b' }}>🩺 {checkin.painNotes}</p>}
                  {checkin.notes && <p style={{ margin: '0.25rem 0 0', color: '#555' }}>📝 {checkin.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}


      {/* ── Récords Personales ── */}
      <h2 style={{ fontSize: '1.5rem', marginTop: '2.5rem' }}>🏆 Mis Récords</h2>
      {records.length === 0 ? (
        <p style={{ color: '#888', textAlign: 'center', padding: '1rem 0' }}>
          Aún no tienes récords personales registrados.
        </p>
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem',
        }}>
          {records.map(rec => (
            <div key={rec.id} style={{
              ...cardStyle, display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <strong>{rec.exerciseName}</strong>
                {rec.initialValue && (
                  <span style={{ fontSize: '0.85rem', color: '#888', marginLeft: '0.5rem' }}>
                    Inicial: {rec.initialValue}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50' }}>
                {rec.currentValue || '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Antropometría + InBody ── */}
      {data && (data.anthropometrics.length > 0 || data.inbody.length > 0) && (
        <>
          <h2 style={{ fontSize: '1.5rem', marginTop: '2.5rem' }}>📏 Mediciones</h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem', marginTop: '1rem',
          }}>
            {data.anthropometrics.length > 0 && (
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>📐 Antropometría</h3>
                {data.anthropometrics.slice(-3).reverse().map(a => (
                  <div key={a.id} style={{
                    padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0',
                    fontSize: '0.9rem',
                  }}>
                    <strong>{formatDate(a.fecha)}</strong>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr',
                      gap: '0.25rem', marginTop: '0.25rem', color: '#666',
                    }}>
                      {a.peso && <span>Peso: {a.peso} kg</span>}
                      {a.cintura && <span>Cintura: {a.cintura} cm</span>}
                      {a.brazos && <span>Brazos: {a.brazos} cm</span>}
                      {a.hombros && <span>Hombros: {a.hombros} cm</span>}
                      {a.piernas && <span>Piernas: {a.piernas} cm</span>}
                      {a.gluteo && <span>Glúteo: {a.gluteo} cm</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.inbody.length > 0 && (
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>🔬 InBody</h3>
                {data.inbody.slice(-3).reverse().map(b => (
                  <div key={b.id} style={{
                    padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0',
                    fontSize: '0.9rem',
                  }}>
                    <strong>{b.fecha ? formatDate(b.fecha) : 'Sin fecha'}</strong>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr',
                      gap: '0.25rem', marginTop: '0.25rem', color: '#666',
                    }}>
                      {b.pesoTotal && <span>Peso: {b.pesoTotal} kg</span>}
                      {b.smm && <span>Músculo: {b.smm} kg</span>}
                      {b.grasaPct && <span>% Grasa: {b.grasaPct}%</span>}
                      {b.imc && <span>IMC: {b.imc}</span>}
                      {b.grasaVisceral && <span>Grasa visc.: {b.grasaVisceral}</span>}
                      {b.bmr && <span>BMR: {b.bmr} kcal</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


