import type { Metadata } from 'next';
import { LandingPage } from './LandingPage';

const TITLE = 'Ephirox — Redefining limits.';
const DESCRIPTION =
  'Diriges tu empresa con el cuerpo que menos cuidas. Ephirox mide lo que pasa dentro de ti — antes de que se note en una decisión que ya no puedas deshacer.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Ephirox',
    url: 'https://ephirox.com',
    type: 'website',
    locale: 'es_CO',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function Page() {
  return <LandingPage />;
}
