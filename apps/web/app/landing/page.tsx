import type { Metadata } from 'next';
import { LandingPage } from './LandingPage';

export const metadata: Metadata = {
  title: 'Ephirox — Diriges tu empresa con el cuerpo que menos cuidas',
  description:
    'Ephirox mide lo que está pasando dentro de ti — antes de que se note en una decisión que ya no puedas deshacer. Programa de optimización de hábitos y rendimiento por cohorte, para founders y C-levels.',
};

export default function Page() {
  return <LandingPage />;
}
