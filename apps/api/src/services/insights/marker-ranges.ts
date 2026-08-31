// Rangos óptimos de los 32 marcadores del panel de sangre — portados 1:1 de
// Matriz_Reglas_Mentoria_BIO360.md, pestaña "Marcadores Sanguíneos". Los ids
// coinciden exactamente con las claves de `lab_panels.datos` (ver
// apps/web/lib/parse-lab-ocr-text.ts, OCR_FIELD_MAP) — no duplicar esta
// lista, cualquier marcador nuevo se agrega en ambos lados.
//
// No usar un valor fijo único para los 7 marcadores dependientes de
// sexo/edad (MEV-03) — resolverRangoOptimo.ts es el único punto que decide
// cuál banda aplica.

export type MarkerId =
  | 'glucosa' | 'hba1c' | 'ldl' | 'hdl' | 'trigliceridos' | 'insulina' | 'homa_ir'
  | 'pcr' | 'homocisteina' | 'ferritina'
  | 'cortisol' | 'testosterona_total' | 'testosterona_libre' | 'estradiol' | 'dhea' | 'tsh' | 't3' | 't4'
  | 'vitamina_d' | 'b12' | 'magnesio' | 'zinc'
  | 'creatinina' | 'bun' | 'tgo' | 'tgp' | 'ggt' | 'colesterol_total'
  | 'hemoglobina' | 'hematocrito' | 'leucocitos' | 'potasio';

export type Range = { min: number; max: number };

// Marcadores con un solo rango "Todos" — no dependen de género ni edad.
export const FIXED_MARKER_RANGES: Partial<Record<MarkerId, Range>> = {
  glucosa: { min: 70, max: 100 },
  hba1c: { min: 4.0, max: 5.7 },
  ldl: { min: 0, max: 100 },
  hdl: { min: 60, max: Infinity },
  trigliceridos: { min: 0, max: 150 },
  insulina: { min: 0, max: 10 },
  homa_ir: { min: 0, max: 2.5 },
  pcr: { min: 0, max: 1.0 },
  homocisteina: { min: 0, max: 10 },
  ferritina: { min: 70, max: 150 },
  cortisol: { min: 6, max: 18 },
  // TSH: rango funcional (más estrecho que el diagnóstico estándar de
  // 0.4-4.5 — ver TSH_DIAGNOSTIC_RANGE, usado solo para escalar a "Derivar a
  // médico" en vez de "Vigilar" cuando el valor cae fuera de ambos).
  tsh: { min: 0.5, max: 2.5 },
  t3: { min: 2.3, max: 4.2 },
  t4: { min: 0.8, max: 1.8 },
  vitamina_d: { min: 50, max: 80 },
  b12: { min: 400, max: 900 },
  magnesio: { min: 1.7, max: 2.2 },
  zinc: { min: 70, max: 120 },
  bun: { min: 7, max: 25 },
  tgo: { min: 0, max: 40 },
  tgp: { min: 0, max: 56 },
  ggt: { min: 0, max: 48 },
  colesterol_total: { min: 0, max: 200 },
  leucocitos: { min: 4.5, max: 11.0 },
  potasio: { min: 3.5, max: 5.0 },
};

// Rango diagnóstico estándar de TSH — fuera de este rango escala a "Derivar
// a médico" en vez de "Vigilar" (ver cortisol.rules.ts / SUE-04).
export const TSH_DIAGNOSTIC_RANGE: Range = { min: 0.4, max: 4.5 };

// Umbral de NUT-07 (alerta de seguridad hepática): más del doble del límite
// superior óptimo de AST/ALT/GGT.
export const HEPATIC_SAFETY_MULTIPLIER = 2;

export const GENDER_DEPENDENT_MARKERS: readonly MarkerId[] = [
  'testosterona_total', 'testosterona_libre', 'estradiol', 'dhea', 'hemoglobina', 'hematocrito', 'creatinina',
];

// Los 32 marcadores conocidos, combinados — usado para filtrar cualquier
// jsonb de `lab_panels.datos` a solo claves reales antes de reutilizarlo
// (ver mentoring-benchmark.service.ts). Mismo patrón que ALL_MARKERS, ya
// local en punto-ciego.rules.ts — acá queda compartido para no duplicarlo
// una tercera vez.
export const ALL_MARKER_IDS: MarkerId[] = [
  ...(Object.keys(FIXED_MARKER_RANGES) as MarkerId[]),
  ...GENDER_DEPENDENT_MARKERS,
];

export const GENDER_RANGES: Partial<Record<MarkerId, { hombres?: Range; mujeres?: Range }>> = {
  testosterona_total: { hombres: { min: 400, max: 800 }, mujeres: { min: 15, max: 70 } },
  testosterona_libre: { hombres: { min: 9, max: 30 }, mujeres: { min: 0.5, max: 3.5 } },
  hemoglobina: { hombres: { min: 13.5, max: 17.5 }, mujeres: { min: 12.0, max: 15.5 } },
  hematocrito: { hombres: { min: 41, max: 53 }, mujeres: { min: 36, max: 46 } },
  creatinina: { hombres: { min: 0.7, max: 1.3 }, mujeres: { min: 0.6, max: 1.1 } },
};

// Estradiol tiene 3 bandas (hombres, mujeres pre/posmenopáusicas) en vez de
// solo 2 — se resuelve aparte en rango-optimo.ts junto con hormonalStatus.
export const ESTRADIOL_RANGES = {
  hombres: { min: 20, max: 40 },
  mujeresPosmenopausicas: { min: 0, max: 30 },
  mujeresPremenopausicas: { min: 30, max: 400 },
};

// DHEA-S: 3 bandas de edad por sexo.
export const DHEA_RANGES = {
  hombres: [
    { min: 18, max: 30, range: { min: 300, max: 450 } },
    { min: 31, max: 50, range: { min: 150, max: 350 } },
    { min: 51, max: Infinity, range: { min: 70, max: 260 } },
  ],
  mujeres: [
    { min: 18, max: 30, range: { min: 150, max: 300 } },
    { min: 31, max: 50, range: { min: 100, max: 200 } },
    { min: 51, max: Infinity, range: { min: 30, max: 150 } },
  ],
};
