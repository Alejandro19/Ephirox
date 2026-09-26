// Controles de plausibilidad para los datos que la gente deja en los
// formularios públicos de leads. No prueban que un dato sea real (eso lo hace
// la verificación del correo), pero descartan de entrada lo obviamente falso:
// teléfonos tipo 1111111111 / 1234567890 y textos de relleno ("aaaaa", "123").
// Viven en shared-types para que el formulario avise al instante y el
// backend aplique exactamente la misma regla.

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

const SEQUENCE = '01234567890123456789';
const REVERSE_SEQUENCE = '98765432109876543210';

export function isPlausiblePhone(value: string): boolean {
  const digits = phoneDigits(value);
  if (digits.length < 8 || digits.length > 15) return false;
  if (new Set(digits).size <= 2) return false; // 1111111111, 1212121212
  if (/(\d)\1{5,}/.test(digits)) return false; // 3000000000: seis o más dígitos iguales seguidos
  if (SEQUENCE.includes(digits) || REVERSE_SEQUENCE.includes(digits)) return false; // 1234567890
  return true;
}

export function isPlausibleText(value: string, minLength = 2): boolean {
  const text = value.trim();
  if (text.length < minLength) return false;
  if (!/\p{L}/u.test(text)) return false; // solo números o símbolos
  if (/(.)\1{4,}/u.test(text)) return false; // "aaaaa", "xxxxxx"
  return true;
}

export const PHONE_ERROR = 'Introduce un número de WhatsApp válido, con indicativo de país.';
export const TEXT_ERROR = 'Revisa este dato: parece incompleto o inválido.';

// Verificación del correo (código de 6 dígitos): el correo es el dato que
// identifica al lead, así que se prueba que la persona lo controla.
export const LEAD_CODE_LENGTH = 6;
