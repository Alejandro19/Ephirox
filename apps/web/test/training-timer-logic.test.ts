import { describe, it, expect } from 'vitest';
import { parseTimeToSeconds } from '../lib/training-timer-logic';

describe('parseTimeToSeconds', () => {
  it('parses mm:ss', () => {
    expect(parseTimeToSeconds('01:30')).toBe(90);
    expect(parseTimeToSeconds('02:00')).toBe(120);
  });
  it('parses a bare number as seconds', () => {
    expect(parseTimeToSeconds('45')).toBe(45);
  });
  it('falls back to 30 for null, empty, or unparseable input', () => {
    expect(parseTimeToSeconds(null)).toBe(30);
    expect(parseTimeToSeconds('')).toBe(30);
    expect(parseTimeToSeconds('abc')).toBe(30);
  });
  it('falls back to 30 for zero or negative values', () => {
    expect(parseTimeToSeconds('00:00')).toBe(30);
    expect(parseTimeToSeconds('-5')).toBe(30);
  });
});
