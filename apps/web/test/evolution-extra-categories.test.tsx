import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StressEvolutionSection, SleepEvolutionSection, RecoveryEvolutionSection } from '../components/evolution/EvolutionExtraCategories';
import type { WearableMetrica } from '../lib/wearable-client';
import type { StressCompletion } from '../lib/stress-client';

function metrica(overrides: Partial<WearableMetrica>): WearableMetrica {
  return {
    id: `m-${overrides.fecha}`, dispositivo: 'oura', fecha: '2026-09-01',
    fcReposo: null, hrvNocturno: null, suenoTotalMinutos: null, suenoProfundoMinutos: null,
    suenoRemMinutos: null, suenoLigeroMinutos: null, suenoDespiertoMinutos: null, suenoScore: null,
    tasaRespiratoria: null, temperaturaPiel: null, horaDormir: null, horaDespertar: null,
    recoveryScore: null, readinessScore: null, pasos: null, caloriasActivas: null,
    ...overrides,
  };
}

describe('StressEvolutionSection', () => {
  it('shows an empty state with no regulation-capacity data and no completions', () => {
    render(<StressEvolutionSection regulationCapacity={null} completions={[]} />);
    expect(screen.getByText(/Aún no hay suficientes datos de Stress/)).toBeInTheDocument();
  });

  it('shows today\'s capacity value and the weekly adherence KPI', () => {
    const completions: StressCompletion[] = [{ id: 'c1', techniqueId: 't1', completedDate: new Date().toISOString().slice(0, 10) }];
    render(
      <StressEvolutionSection
        regulationCapacity={{ enabled: true, today: 78, trend: [{ fecha: '2026-08-01', score: 60 }, { fecha: '2026-09-01', score: 78 }], baseline: null }}
        completions={completions}
      />
    );
    expect(screen.getByText('Capacidad de regulación')).toBeInTheDocument();
    expect(screen.getAllByText('78').length).toBeGreaterThan(0);
    expect(screen.getByText('Adherencia al protocolo activo')).toBeInTheDocument();
  });
});

describe('SleepEvolutionSection', () => {
  it('shows an empty state with no wearable data', () => {
    render(<SleepEvolutionSection metrics={[]} />);
    expect(screen.getByText(/Aún no hay datos de tu wearable para Sleep/)).toBeInTheDocument();
  });

  it('shows the sleep score, total sleep and the sleep-stages proportion bar', () => {
    const metrics = [
      metrica({ fecha: '2026-08-30', suenoScore: 70 }),
      metrica({
        fecha: '2026-08-31', suenoScore: 82, suenoTotalMinutos: 450, horaDormir: '2026-08-30T23:00:00.000Z',
        suenoRemMinutos: 90, suenoProfundoMinutos: 80, suenoLigeroMinutos: 250, suenoDespiertoMinutos: 30,
        horaDespertar: '2026-08-31T07:00:00.000Z',
      }),
    ];
    render(<SleepEvolutionSection metrics={metrics} />);
    expect(screen.getByText('Sleep score')).toBeInTheDocument();
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('Etapas de sueño — última noche')).toBeInTheDocument();
    expect(screen.getByText('REM')).toBeInTheDocument();
  });

  // Regresión: horaDormir/horaDespertar son timestamptz completos (hora de
  // inicio/fin de sesión de sueño), nunca un string "HH:MM" — un parseo
  // ingenuo con regex dejaba "Hora de dormir" mostrando el ISO crudo y la
  // tendencia de "Hora de despertar" siempre vacía con datos reales.
  it('formats horaDormir as a clock time, never the raw ISO string', () => {
    const metrics = [metrica({ fecha: '2026-08-31', horaDormir: '2026-08-30T23:15:00.000Z' })];
    render(<SleepEvolutionSection metrics={metrics} />);
    expect(screen.queryByText('2026-08-30T23:15:00.000Z')).not.toBeInTheDocument();
    expect(screen.getByText('Hora de dormir')).toBeInTheDocument();
  });

  it('plots the hora de despertar trend from ISO wake-up timestamps', () => {
    const metrics = Array.from({ length: 3 }, (_, i) =>
      metrica({ fecha: `2026-08-2${i}`, horaDespertar: `2026-08-2${i}T07:30:00.000Z` })
    );
    render(<SleepEvolutionSection metrics={metrics} />);
    expect(screen.getByText('Hora de despertar — últimos 8 días')).toBeInTheDocument();
    expect(screen.queryByText('Necesitas más días de datos wearable para ver tu tendencia.')).not.toBeInTheDocument();
  });
});

describe('RecoveryEvolutionSection', () => {
  it('shows an empty state with no wearable data', () => {
    render(<RecoveryEvolutionSection metrics={[]} />);
    expect(screen.getByText(/Aún no hay datos de tu wearable para Recuperación/)).toBeInTheDocument();
  });

  it('classifies recovery-score days as well-recovered using the same 66 threshold the backend uses', () => {
    const metrics = [
      metrica({ fecha: '2026-08-30', hrvNocturno: 40, fcReposo: 60, recoveryScore: 70 }), // bien
      metrica({ fecha: '2026-08-31', hrvNocturno: 42, fcReposo: 58, recoveryScore: 50 }), // sub-recuperado
    ];
    render(<RecoveryEvolutionSection metrics={metrics} />);
    expect(screen.getByText('HRV basal')).toBeInTheDocument();
    expect(screen.getByText('Balance de recuperación — últimas 2 semanas')).toBeInTheDocument();
  });
});
