import type { Metadata } from 'next';
import { LandingPage } from './LandingPage';

// Título/descripción de SEO y share-preview — independientes del copy
// visible del hero (LandingPage.tsx): abren con la categoría real
// (plataforma de bienestar élite) y la audiencia (founders/C-levels/top
// sellers) en vez de repetir el gancho emocional del hero.
const TITLE = 'Ephirox — Bienestar Élite para Founders y C-Levels';
const DESCRIPTION =
  'Para el talento de alto impacto — founders, C-levels y top sellers: salud, rendimiento y prevención del burnout, con tecnología de IA.';

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
