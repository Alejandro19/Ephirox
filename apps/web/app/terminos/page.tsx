import type { Metadata } from 'next';
import { TERMINOS_CONTENT, TERMS_VERSION } from '../../components/auth/legal-content';
import { LegalDocument } from '../legal/LegalDocument';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Ephirox',
  description: 'Términos y Condiciones de Uso de la plataforma Ephirox.',
};

export default function Page() {
  return <LegalDocument title="Términos y Condiciones de Uso" version={TERMS_VERSION} items={TERMINOS_CONTENT} />;
}
