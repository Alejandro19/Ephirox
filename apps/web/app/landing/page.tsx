import type { Metadata } from 'next';
import { LandingPage } from './LandingPage';

// Título = tagline de marca (igual al panel de /login); descripción =
// subtítulo + descripción del hero de la landing (LandingPage.tsx)
// combinados en una sola frase — si ese texto cambia, actualizar acá
// también para que el share-preview no quede desincronizado.
const TITLE = 'Ephirox — Redefining limits.';
const DESCRIPTION =
  'Tu empresa llega hasta donde tu cuerpo te lo permite. Ephirox mide lo que sucede dentro de ti — antes de que pase factura.';

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
