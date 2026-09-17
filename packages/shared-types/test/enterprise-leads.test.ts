import { describe, it, expect } from 'vitest';
import { isCorporateEmail, EnterpriseLeadInputSchema } from '../src/enterprise-leads.js';

describe('isCorporateEmail (punto 12.1 — correo de trabajo corporativo)', () => {
  it('rejects known free/personal email domains', () => {
    expect(isCorporateEmail('alguien@gmail.com')).toBe(false);
    expect(isCorporateEmail('alguien@hotmail.com')).toBe(false);
    expect(isCorporateEmail('alguien@outlook.com')).toBe(false);
    expect(isCorporateEmail('alguien@yahoo.com')).toBe(false);
    expect(isCorporateEmail('alguien@icloud.com')).toBe(false);
    expect(isCorporateEmail('alguien@protonmail.com')).toBe(false);
  });

  it('accepts a corporate-looking domain', () => {
    expect(isCorporateEmail('nombre@empresa.com')).toBe(true);
    expect(isCorporateEmail('ana@acme.co')).toBe(true);
  });

  it('is case-insensitive on the domain', () => {
    expect(isCorporateEmail('alguien@GMAIL.com')).toBe(false);
  });

  it('rejects malformed input without a domain', () => {
    expect(isCorporateEmail('sin-arroba')).toBe(false);
    expect(isCorporateEmail('')).toBe(false);
  });
});

describe('EnterpriseLeadInputSchema — validación de correo corporativo', () => {
  const base = { nombre: 'Ana Ríos', celular: '+57 300 123 4567' };

  it('fails with the exact spec error message for a personal email domain', () => {
    const result = EnterpriseLeadInputSchema.safeParse({ ...base, correo: 'ana@gmail.com' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Introduce un correo electrónico corporativo válido.');
    }
  });

  it('passes with a corporate email and the new pais/sitioWeb fields', () => {
    const result = EnterpriseLeadInputSchema.safeParse({ ...base, correo: 'ana@acme.com', pais: 'Colombia', sitioWeb: 'acme.com' });
    expect(result.success).toBe(true);
  });

  it('validates rol against the fixed LEAD_CARGOS enum, not free text', () => {
    const result = EnterpriseLeadInputSchema.safeParse({ ...base, correo: 'ana@acme.com', rol: 'Vendedor Estrella' });
    expect(result.success).toBe(false);
  });
});
