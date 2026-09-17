import { describe, it, expect } from 'vitest';
import {
  StressTechniqueInputSchema,
  StressCompletionInputSchema,
  StressTipInputSchema,
  StressTipUpdateSchema,
  STRESS_TECHNIQUE_TYPES,
} from '../src/stress.js';

describe('stress technique schema', () => {
  it('accepts a valid technique', () => {
    const result = StressTechniqueInputSchema.safeParse({
      title: 'Respiración 4-7-8',
      type: 'Respiración',
      duration: '5 min',
      duration_minutes: 5,
      description: 'Inhala 4s, sostén 7s, exhala 8s',
      youtube_url: 'https://youtube.com/watch?v=demo',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a technique missing the title', () => {
    const result = StressTechniqueInputSchema.safeParse({ type: 'Respiración' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid type', () => {
    const result = StressTechniqueInputSchema.safeParse({ title: 'X', type: 'Inventado' });
    expect(result.success).toBe(false);
  });

  it('exposes exactly the 7 legacy technique types', () => {
    expect(STRESS_TECHNIQUE_TYPES).toEqual([
      'Respiración', 'Breathwork', 'Meditación', 'Mindfulness',
      'Respiración Vagal', 'Exposición Controlada', 'Recuperación Activa',
    ]);
  });

  it('accepts a technique with no type (optional)', () => {
    const result = StressTechniqueInputSchema.safeParse({ title: 'Técnica libre' });
    expect(result.success).toBe(true);
  });
});

describe('stress completion schema', () => {
  it('accepts an empty body (technique_id optional)', () => {
    expect(StressCompletionInputSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a technique_id', () => {
    expect(StressCompletionInputSchema.safeParse({ technique_id: '11111111-1111-1111-1111-111111111111' }).success).toBe(true);
  });
});

describe('stress tip schemas', () => {
  it('accepts a valid tip', () => {
    expect(StressTipInputSchema.safeParse({ content: 'La respiración lenta baja la activación en minutos.' }).success).toBe(true);
  });

  it('rejects an empty tip', () => {
    expect(StressTipInputSchema.safeParse({ content: '' }).success).toBe(false);
  });

  it('accepts a partial update (content or active alone)', () => {
    expect(StressTipUpdateSchema.safeParse({ active: false }).success).toBe(true);
    expect(StressTipUpdateSchema.safeParse({ content: 'Nuevo texto' }).success).toBe(true);
    expect(StressTipUpdateSchema.safeParse({}).success).toBe(true);
  });
});
