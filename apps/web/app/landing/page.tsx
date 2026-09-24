import type { Metadata } from 'next';
import { LandingPage } from './LandingPage';

// Título/descripción de SEO y share-preview — independientes del copy
// visible del hero (LandingPage.tsx): abren con la categoría real
// (bienestar élite con IA) y la audiencia (Founders y C-Levels) en vez de
// repetir el gancho emocional del hero.
const TITLE = 'Ephirox — Bienestar élite con IA para Founders y C-Levels';
const DESCRIPTION =
  'Plataforma de bienestar ejecutivo con inteligencia artificial para líderes de alto impacto que quieren sostener su rendimiento sin sacrificar su salud.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://ephirox.com' },
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
