import { z } from 'zod';

// "Executive Performance Score™" — auditoría breve de rendimiento ejecutivo
// para founders/CEOs/C-Levels (CTA del Hero de la landing). NO es un test de
// bienestar ni un diagnóstico: existe para generar leads cualificados y
// segmentarlos entre Executive Program y Corporate Program. Vive en
// shared-types porque el frontend calcula el resultado que muestra y el
// backend lo recalcula desde las respuestas (nunca confía en un score que
// mande el cliente).

export const EXECUTIVE_CATEGORIES = ['energia', 'claridad', 'resiliencia', 'recuperacion', 'riesgo'] as const;
export type ExecutiveCategory = (typeof EXECUTIVE_CATEGORIES)[number];

// Escala única de frecuencia (0–4): todas las afirmaciones están redactadas
// en positivo, así que más alto = mejor desempeño.
export const EXECUTIVE_SCALE = ['Nunca', 'Rara vez', 'A veces', 'Casi siempre', 'Siempre'] as const;

export type ExecutiveQuestion = { id: string; category: ExecutiveCategory; texto: string };

// 15 preguntas, 3 por categoría, en orden de aparición.
export const EXECUTIVE_QUESTIONS: readonly ExecutiveQuestion[] = [
  { id: 'e1', category: 'energia', texto: 'Mantengo un nivel de energía estable durante toda mi jornada.' },
  { id: 'e2', category: 'energia', texto: 'Termino el día sin sensación de agotamiento.' },
  { id: 'e3', category: 'energia', texto: 'Me recupero rápido después de semanas de alta exigencia.' },
  { id: 'c1', category: 'claridad', texto: 'Me concentro en tareas complejas sin dispersarme.' },
  { id: 'c2', category: 'claridad', texto: 'Tomo decisiones críticas con claridad, incluso al final del día.' },
  { id: 'c3', category: 'claridad', texto: 'Recuerdo con facilidad datos, nombres y compromisos importantes.' },
  { id: 's1', category: 'resiliencia', texto: 'Mantengo la serenidad cuando la presión es alta.' },
  { id: 's2', category: 'resiliencia', texto: 'Respondo con calma ante imprevistos o desacuerdos.' },
  { id: 's3', category: 'resiliencia', texto: 'Me recupero emocionalmente con rapidez tras un día o evento difícil.' },
  { id: 'r1', category: 'recuperacion', texto: 'Duermo de forma continua, sin despertares que interrumpan mi descanso.' },
  { id: 'r2', category: 'recuperacion', texto: 'Me levanto sintiéndome recuperado.' },
  { id: 'r3', category: 'recuperacion', texto: 'Mi descanso se mantiene aun en periodos de viaje o alta carga.' },
  { id: 'k1', category: 'riesgo', texto: 'Realizo actividad física estructurada al menos tres veces por semana.' },
  { id: 'k2', category: 'riesgo', texto: 'Conozco mis biomarcadores clave, medidos en los últimos 12 meses.' },
  { id: 'k3', category: 'riesgo', texto: 'Mis antecedentes personales y familiares no me generan preocupación por mi rendimiento a largo plazo.' },
];

// Nombres cara al usuario: lenguaje ejecutivo, nunca "estrés 6/10" ni "sueño malo".
export const EXECUTIVE_CATEGORY_LABELS: Record<ExecutiveCategory, string> = {
  energia: 'Capacidad de energía',
  claridad: 'Rendimiento cognitivo',
  resiliencia: 'Resiliencia bajo presión',
  recuperacion: 'Recuperación',
  riesgo: 'Base fisiológica',
};

const WEIGHTS: Record<ExecutiveCategory, number> = {
  energia: 0.2,
  claridad: 0.25,
  resiliencia: 0.2,
  recuperacion: 0.2,
  riesgo: 0.15,
};

export const FORTALEZAS: Record<ExecutiveCategory, { titulo: string; texto: string }> = {
  energia: { titulo: 'Sostén de energía', texto: 'Mantienes un nivel de energía consistente incluso en jornadas de alta exigencia.' },
  claridad: { titulo: 'Claridad de decisión', texto: 'Conservas foco y criterio para decidir cuando más se necesita.' },
  resiliencia: { titulo: 'Capacidad de ejecución', texto: 'Mantienes un alto nivel de desempeño incluso bajo presión.' },
  recuperacion: { titulo: 'Recuperación', texto: 'Tu descanso sostiene tu desempeño de un día al siguiente.' },
  riesgo: { titulo: 'Base preventiva', texto: 'Cuidas los hábitos y el seguimiento que sostienen tu rendimiento a largo plazo.' },
};

export const RIESGOS: Record<ExecutiveCategory, { titulo: string; texto: string; impactos: string[] }> = {
  energia: {
    titulo: 'Fatiga acumulativa',
    texto: 'Tu perfil muestra señales compatibles con deterioro progresivo de recuperación y claridad mental.',
    impactos: ['Velocidad de decisión', 'Energía estratégica', 'Capacidad de liderazgo'],
  },
  claridad: {
    titulo: 'Pérdida de claridad',
    texto: 'Tu perfil muestra señales de dispersión que pueden limitar la calidad de tus decisiones críticas.',
    impactos: ['Calidad de las decisiones', 'Foco estratégico', 'Capacidad de anticipación'],
  },
  resiliencia: {
    titulo: 'Desgaste bajo presión',
    texto: 'Tu perfil sugiere una respuesta a la presión que puede erosionar tu criterio y tu liderazgo.',
    impactos: ['Consistencia de tu liderazgo', 'Clima de tu equipo', 'Criterio en momentos críticos'],
  },
  recuperacion: {
    titulo: 'Recuperación insuficiente',
    texto: 'Tu perfil indica un descanso que podría no estar reponiendo tu capacidad de un día al siguiente.',
    impactos: ['Energía al iniciar el día', 'Foco sostenido', 'Resistencia a la carga'],
  },
  riesgo: {
    titulo: 'Exposición sin monitoreo',
    texto: 'Tu perfil indica factores fisiológicos sin seguimiento que podrían afectar tu rendimiento a largo plazo.',
    impactos: ['Sostenibilidad de tu rendimiento', 'Continuidad de tu liderazgo', 'Decisiones preventivas tardías'],
  },
};

export const EXECUTIVE_SEGMENTOS = ['optimizacion', 'riesgo_moderado', 'riesgo_elevado'] as const;
export type ExecutiveSegmento = (typeof EXECUTIVE_SEGMENTOS)[number];

export const SEGMENTO_INFO: Record<ExecutiveSegmento, { label: string; mensaje: string }> = {
  optimizacion: {
    label: 'Optimización',
    mensaje: 'Estás funcionando bien, pero existen oportunidades para mejorar rendimiento y longevidad.',
  },
  riesgo_moderado: {
    label: 'Riesgo moderado',
    mensaje: 'Existen señales tempranas de deterioro que justifican una intervención personalizada.',
  },
  riesgo_elevado: {
    label: 'Riesgo elevado',
    mensaje: 'Tu perfil muestra factores asociados a pérdida significativa de rendimiento ejecutivo.',
  },
};

export const EXECUTIVE_PROGRAMAS = ['executive', 'executive_prioritario', 'corporate'] as const;
export type ExecutivePrograma = (typeof EXECUTIVE_PROGRAMAS)[number];

export const PROGRAMA_LABELS: Record<ExecutivePrograma, string> = {
  executive: 'Executive Program',
  executive_prioritario: 'Executive Program (prioritario)',
  corporate: 'Corporate Program',
};

// Segmentación empresarial.
export const EXECUTIVE_PERSONAS = ['Menos de 10', '10 – 50', '50 – 200', 'Más de 200'] as const;

export const ExecutiveEvaluationSchema = z.object({
  respuestas: z.array(z.number().int().min(0).max(4)).length(EXECUTIVE_QUESTIONS.length),
  personas: z.enum(EXECUTIVE_PERSONAS),
  equipoDirectivo: z.boolean(),
  evaluarEquipo: z.boolean(),
});
export type ExecutiveEvaluation = z.infer<typeof ExecutiveEvaluationSchema>;

export type ExecutiveResult = {
  score: number;
  categorias: Record<ExecutiveCategory, number>;
  fortaleza: ExecutiveCategory;
  riesgo: ExecutiveCategory;
  segmento: ExecutiveSegmento;
};

export function segmentFor(score: number): ExecutiveSegmento {
  if (score >= 80) return 'optimizacion';
  if (score >= 60) return 'riesgo_moderado';
  return 'riesgo_elevado';
}

// Corporate Program gana si quiere evaluar también a su equipo; si no,
// Executive Program (prioritario cuando el riesgo es elevado).
export function programFor(segmento: ExecutiveSegmento, evaluarEquipo: boolean): ExecutivePrograma {
  if (evaluarEquipo) return 'corporate';
  return segmento === 'riesgo_elevado' ? 'executive_prioritario' : 'executive';
}

export function computeExecutiveResult(respuestas: number[]): ExecutiveResult {
  const sums = Object.fromEntries(EXECUTIVE_CATEGORIES.map((c) => [c, { total: 0, max: 0 }])) as Record<ExecutiveCategory, { total: number; max: number }>;
  EXECUTIVE_QUESTIONS.forEach((q, i) => {
    sums[q.category].total += respuestas[i] ?? 0;
    sums[q.category].max += 4;
  });
  const categorias = Object.fromEntries(
    EXECUTIVE_CATEGORIES.map((c) => [c, Math.round((sums[c].total / sums[c].max) * 100)])
  ) as Record<ExecutiveCategory, number>;

  const score = Math.round(EXECUTIVE_CATEGORIES.reduce((s, c) => s + (sums[c].total / sums[c].max) * 100 * WEIGHTS[c], 0));

  // Empates: gana la primera categoría en el orden de EXECUTIVE_CATEGORIES.
  const fortaleza = EXECUTIVE_CATEGORIES.reduce((best, c) => (categorias[c] > categorias[best] ? c : best));
  const riesgo = EXECUTIVE_CATEGORIES.reduce((worst, c) => (categorias[c] < categorias[worst] ? c : worst));
  return { score, categorias, fortaleza, riesgo, segmento: segmentFor(score) };
}
