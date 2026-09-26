import { describe, it, expect } from 'vitest';
import { computeExecutiveResult, segmentFor, programFor, EXECUTIVE_QUESTIONS, EXECUTIVE_CATEGORIES } from '@latribu/shared-types';

describe('Executive Performance Score', () => {
  it('tiene 15 preguntas, 3 por categoría', () => {
    expect(EXECUTIVE_QUESTIONS).toHaveLength(15);
    for (const c of EXECUTIVE_CATEGORIES) expect(EXECUTIVE_QUESTIONS.filter((q) => q.category === c)).toHaveLength(3);
  });

  it('todo en el máximo da 100 y todo en cero da 0', () => {
    expect(computeExecutiveResult(Array(15).fill(4)).score).toBe(100);
    expect(computeExecutiveResult(Array(15).fill(0)).score).toBe(0);
  });

  it('identifica la fortaleza y el riesgo principal por categoría', () => {
    // energía (0-2) y claridad (3-5) al máximo; recuperación (9-11) en cero.
    const r = [4, 4, 4, 4, 4, 4, 2, 2, 2, 0, 0, 0, 2, 2, 2];
    const result = computeExecutiveResult(r);
    expect(result.fortaleza).toBe('energia'); // empate con claridad: gana la primera
    expect(result.riesgo).toBe('recuperacion');
    expect(result.categorias.recuperacion).toBe(0);
  });

  it('segmenta en los cortes 80 / 60 del spec', () => {
    expect(segmentFor(100)).toBe('optimizacion');
    expect(segmentFor(80)).toBe('optimizacion');
    expect(segmentFor(79)).toBe('riesgo_moderado');
    expect(segmentFor(60)).toBe('riesgo_moderado');
    expect(segmentFor(59)).toBe('riesgo_elevado');
  });

  it('el programa es Corporate si evalúa a su equipo; si no, prioritario solo con riesgo elevado', () => {
    expect(programFor('optimizacion', true)).toBe('corporate');
    expect(programFor('riesgo_elevado', true)).toBe('corporate');
    expect(programFor('riesgo_elevado', false)).toBe('executive_prioritario');
    expect(programFor('riesgo_moderado', false)).toBe('executive');
    expect(programFor('optimizacion', false)).toBe('executive');
  });
});
