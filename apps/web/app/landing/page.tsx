import type { Metadata } from 'next';
import { LandingPage } from './LandingPage';

// Mismo titular/subtítulo que el hero de la landing (LandingPage.tsx) —
// si ese texto cambia, actualizar acá también para que el share-preview
// no quede desincronizado. Sin "Ephirox" al inicio del título ni en la
// descripción a propósito: la marca ya aparece en la imagen (isotipo +
// wordmark) y en el dominio del link — repetirla una tercera vez en el
// texto solo resta impacto al gancho.
const TITLE = 'Tu empresa llega hasta donde tu cuerpo te lo permite.';
const DESCRIPTION = 'Mide lo que sucede dentro de ti — antes de que pase factura.';

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
