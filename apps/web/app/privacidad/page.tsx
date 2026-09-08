import type { Metadata } from 'next';
import { DATOS_CONTENT, DATA_POLICY_VERSION } from '../../components/auth/legal-content';
import { LegalDocument } from '../legal/LegalDocument';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Ephirox',
  description: 'Política de Tratamiento de Datos Personales de la plataforma Ephirox.',
};

export default function Page() {
  return <LegalDocument title="Política de Tratamiento de Datos Personales" version={DATA_POLICY_VERSION} items={DATOS_CONTENT} />;
}
