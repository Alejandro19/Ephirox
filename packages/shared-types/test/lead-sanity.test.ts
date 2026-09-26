import { describe, it, expect } from 'vitest';
import { isPlausiblePhone, isPlausibleText } from '../src/lead-sanity.js';

describe('isPlausiblePhone', () => {
  it('acepta números reales con indicativo y formato libre', () => {
    expect(isPlausiblePhone('+57 300 123 4567')).toBe(true);
    expect(isPlausiblePhone('+52 55 1234 9876')).toBe(true);
    expect(isPlausiblePhone('(310) 555-8899')).toBe(true);
  });

  it('rechaza números demasiado cortos o largos', () => {
    expect(isPlausiblePhone('+57 300')).toBe(false);
    expect(isPlausiblePhone('1'.repeat(3) + '2'.repeat(3) + '3456789012345678')).toBe(false);
  });

  it('rechaza números de relleno', () => {
    expect(isPlausiblePhone('1111111111')).toBe(false);
    expect(isPlausiblePhone('1212121212')).toBe(false);
    expect(isPlausiblePhone('1234567890')).toBe(false);
    expect(isPlausiblePhone('9876543210')).toBe(false);
    expect(isPlausiblePhone('+57 3000000000')).toBe(false);
  });
});

describe('isPlausibleText', () => {
  it('acepta nombres y empresas normales, con tildes y símbolos', () => {
    expect(isPlausibleText('Ana Ríos')).toBe(true);
    expect(isPlausibleText('Acme & Co. S.A.S.')).toBe(true);
    expect(isPlausibleText('3M')).toBe(true);
  });

  it('rechaza relleno', () => {
    expect(isPlausibleText('a')).toBe(false);
    expect(isPlausibleText('aaaaaaa')).toBe(false);
    expect(isPlausibleText('12345')).toBe(false);
    expect(isPlausibleText('   ')).toBe(false);
  });
});
