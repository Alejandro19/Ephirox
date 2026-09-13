// Copy y datos de la landing pública (ephirox.com/landing), puerto 1:1 de
// docs/ephirox-landing.html — mismo texto, mismas fuentes, mismos números.

export const HERO_STATS = [
  { cifra: '1 de 3', texto: 'Trabajadores en Colombia enfrenta hoy desafíos de salud mental que afectan su desempeño.', fuente: 'FUENTE: SURA / COMPENSAR, 2025' },
  { cifra: '37%', texto: 'Más probabilidad de problemas cognitivos después de los 45 si vives con estrés alto sostenido.', fuente: 'FUENTE: JAMA NETWORK OPEN, 2023 (24.448 PERSONAS)' },
  { cifra: '65%', texto: 'De los altos ejecutivos en Latinoamérica prioriza bienestar y beneficios personalizados por encima de un aumento de salario.', fuente: 'FUENTE: MERCER, GLOBAL TALENT TRENDS 2023' },
] as const;
export const HERO_INTERVAL_MS = 6200;

// Chips tachados de "ya lo intentaste" en la sección oscura del tramo
// (.diagnostico-chips en LandingPage.tsx).
export const YA_INTENTASTE = ['el gimnasio', 'la dieta', 'el programa de tu empresa'] as const;

// Usado por el grid de escritorio (.costos-grid en LandingPage.tsx) y por
// el carrusel mobile (CostosMobileCarousel.tsx) — mismo diseño con foto en
// los dos, solo cambia estático/grid vs. scroll-snap/carrusel.
export const COSTOS = [
  { num: '5X', texto: 'Un ejecutivo en burnout cuesta hasta 5x más que un empleado promedio (US$20.683 vs. US$4.257/año), y reemplazarlo, hasta el 50% de su salario anual.', src: 'AM. J. OF PREVENTIVE MEDICINE, 2025', img: '/landing/costo-burnout.jpg', alt: 'Ejecutivo agotado, cabeza entre las manos' },
  { num: '10 – 40 %', texto: 'Más riesgo cardiovascular por tensión laboral sostenida en cargos de alta exigencia — 27 estudios, +600.000 personas.', src: 'KIVIMÄKI & KAWACHI, 2015', img: '/landing/costo-ecg.jpg', alt: 'Monitor de ritmo cardíaco (ECG)' },
  { num: '10X', texto: 'Un líder que nunca se ausenta, pero rinde por debajo de su capacidad, le cuesta a la empresa 10 veces más que uno que sí se ausenta.', src: 'GLOBAL CORPORATE CHALLENGE / OMS (HPQ)', img: '/landing/costo-senior.jpg', alt: 'Ejecutivo agotado en su oficina' },
] as const;

export const PASOS = [
  { ord: '01', titulo: 'Se mide, no se supone.', texto: 'Sueño, recuperación y estrés leídos desde tu mano, todos los días. Basta una noche de mal sueño para que tu cerebro procese el riesgo de forma distinta — por eso esto no se mide una vez al año.', img: '/landing/wearable.png', alt: 'Wearable en la mano' },
  { ord: '02', titulo: 'Lo que el wearable no ve, se analiza en sangre.', texto: 'Biomarcadores de laboratorio que dan la parte de la película que ningún dispositivo alcanza.', img: '/landing/vial.png', alt: 'Vial de laboratorio' },
  { ord: '03', titulo: 'Todo cruzado en un solo lugar.', texto: 'Tu estado real, en un tablero del que puedes hablar con datos, no con sensaciones.', img: '/landing/dashboard-preview.png', alt: 'Vista previa del tablero Evolution' },
] as const;

// Cards con foto de "Con tu estado ya medido..." (.opt-grid en
// LandingPage.tsx) — mismo patrón visual que COSTOS (foto + overlay +
// texto), grid estático en desktop y carrusel en mobile
// (OptimizacionMobileCarousel.tsx).
export const OPTIMIZACION = [
  { label: 'ENTRENAMIENTO', texto: 'Diseñado para tu agenda y tu cuerpo, no una rutina de gimnasio genérica.', img: '/landing/opt-entrenamiento.jpg', alt: 'Entrenamiento' },
  { label: 'NUTRICIÓN', texto: 'Ajustada a tus propios biomarcadores y estilo de vida, no una dieta estándar.', img: '/landing/opt-nutricion.jpg', alt: 'Nutrición' },
  { label: 'GESTIÓN DEL ESTRÉS', texto: 'Herramientas de Neuro-Wellness para regular tu sistema nervioso.', img: '/landing/opt-estres.jpg', alt: 'Gestión del estrés' },
  { label: 'SUEÑO', texto: 'Protocolos de biohacking ajustados a tu cronotipo, no una app de meditación más.', img: '/landing/opt-sueno.jpg', alt: 'Sueño' },
] as const;

type CompareRow = {
  indicador: string;
  trad: string;
  tradMobile?: string;
  eph: string;
  dif: string;
  mobileHide?: boolean;
};

export const COMPARACION: CompareRow[] = [
  {
    indicador: 'Detección temprana de riesgo',
    trad: 'Encuestas de clima o evaluaciones puntuales, sin señales tempranas ni seguimiento individual.',
    eph: 'Biomarcadores sanguíneos + wearable + comportamiento, + edad biológica como señal de riesgo antes del síntoma.',
    dif: 'Sistema preventivo, no reactivo',
  },
  {
    indicador: 'Costo de ausentismo por salud',
    trad: 'El ausentismo por ansiedad o estrés le cuesta a las empresas cerca de 10 días por trabajador al año — y se sabe solo cuando ya ocurrió.',
    tradMobile: 'El ausentismo por ansiedad o estrés le cuesta a las empresas cerca de 10 días por trabajador al año — y se sabe solo cuando ya ocurrió.',
    eph: 'Stress + Sleep con monitoreo continuo por wearable y check-ins sobre datos reales del ejecutivo.',
    dif: 'Intervención antes de que se traduzca en ausencia',
  },
  {
    indicador: 'Personalización',
    trad: 'El mismo plan de wellness para toda la nómina.',
    eph: 'Protocolos personalizados en entrenamiento, nutrición, gestión del estrés y sueño — por ciclo y por persona.',
    dif: '100 % personalizado, no por población.',
    mobileHide: true,
  },
  {
    indicador: 'Validación',
    trad: 'Ninguna, o subjetiva — apps de autoayuda sin respaldo clínico.',
    eph: 'Cada protocolo es revisado por un especialista humano antes de llegar al cliente.',
    dif: 'Respaldo humano, no solo algoritmo.',
    mobileHide: true,
  },
  {
    indicador: 'Acceso',
    trad: 'Abierto a cualquiera, beneficio genérico de nómina.',
    eph: 'Reservado por cohorte ejecutiva, dentro de la empresa (founders y C-levels).',
    dif: 'Élite, no es masivo',
    mobileHide: true,
  },
];

export const SHIFTS = [
  { antes: 'Entreno si tengo tiempo, y como por intuición.', despues: 'Sé exactamente cómo entrenar y comer para potenciar mi salud y vitalidad — con datos, no por intuición.' },
  { antes: 'Decido sin saber si estoy en mi mejor momento mental.', despues: 'Sé con datos cuándo mi juicio está en su punto más alto, y agendo ahí lo que importa.' },
  { antes: 'El descanso se siente como tiempo perdido.', despues: 'Cada hora de sueño está calibrada para sostener mi ventaja.' },
  { antes: 'Estoy solo en esto.', despues: 'Pertenezco a un círculo de pares que entienden esta presión.' },
] as const;

export const HITOS = [
  { titulo: 'Piensas con la misma nitidez a las 4pm que a las 8am.', detalle: 'Menos caídas de foco, con el registro que lo respalda.' },
  { titulo: 'El día ya no se te acaba a media tarde.', detalle: 'Entrenamiento y nutrición ajustados a tu propio gasto energético, no a una rutina estándar.' },
  { titulo: 'Sabes en qué estado tomaste cada decisión crítica — y puedes repetirlo a voluntad.', detalle: 'Sueño, recuperación y estrés, registrados — tu mejor día, listo para repetirse.' },
  { titulo: 'Diriges tu capacidad, en vez de improvisar con lo que te queda de ella.', detalle: 'Lo que antes era tu punto ciego, ahora tiene alertas — antes del agotamiento, no explicaciones después de la caída.' },
] as const;

export type JuntaBarra = { label: string; value: string; width: number; gold: boolean };

export type JuntaPunto = {
  num: string;
  kicker: string;
  titulo: string;
  texto: string;
  cifra: string;
  glosa: string;
  pie: string;
} & (
  | { chart: 'cohorte'; barras: number[]; highlight: number[] }
  | { chart: 'barras'; filas: JuntaBarra[] }
  | { chart: 'timeline'; fill: number; leftLabel: string; rightLabel: string }
  | { chart: 'ciclos'; total: number; activos: number }
);

// Sección "El reporte que le llevas a tu Junta" — cada punto tiene su propia
// forma de gráfico (cohorte/barras/timeline/ciclos), no la misma serie
// repintada. Ver JuntaChart.tsx.
export const JUNTA_PUNTOS: JuntaPunto[] = [
  {
    num: '01',
    kicker: 'VISIBILIDAD',
    titulo: 'Ver el riesgo, no intuirlo',
    texto: 'El punto ciego que hoy tiene tu Junta sobre el talento crítico se vuelve visibilidad agregada y anónima — antes de que se traduzca en una salida inesperada.',
    cifra: '0 nombres',
    glosa: 'expuestos: todo se reporta por cohorte.',
    pie: '12 directivos de una misma cohorte. Dos se apartan del patrón: eso es lo que hoy nadie ve.',
    chart: 'cohorte',
    barras: [0.30, 0.34, 0.28, 0.36, 0.32, 0.90, 0.30, 0.34, 0.28, 0.82, 0.32, 0.30],
    highlight: [5, 9],
  },
  {
    num: '02',
    kicker: 'COSTE EVITADO',
    titulo: 'Retorno que se paga solo',
    texto: 'Una sola salida evitada en el comité directivo cubre el programa completo del año. El resto del efecto — decisiones mejor tomadas — no aparece en la factura.',
    cifra: '1 : 1',
    glosa: 'un reemplazo evitado cubre el año.',
    pie: 'Una sola salida evitada cubre el año. Escala relativa, ilustrativa.',
    chart: 'barras',
    filas: [
      { label: 'Reemplazar a un directivo', value: '30–50% del salario anual', width: 100, gold: true },
      { label: 'Programa anual, cohorte completa', value: 'una fracción de esa cifra', width: 22, gold: false },
    ],
  },
  {
    num: '03',
    kicker: 'ANTICIPACIÓN',
    titulo: 'Antes del riesgo, no después',
    texto: 'Las señales aparecen meses antes del evento. Se interviene mientras todavía es reversible, no cuando ya hay una baja médica sobre la mesa.',
    cifra: '−6 meses',
    glosa: 'de aviso frente al chequeo anual.',
    pie: 'La ventana dorada es el margen en que todavía es reversible. El chequeo anual llega al final de la línea.',
    chart: 'timeline',
    fill: 62,
    leftLabel: 'Primeras señales',
    rightLabel: 'Evento / baja médica',
  },
  {
    num: '04',
    kicker: 'PERMANENCIA',
    titulo: 'Ventaja de retención',
    texto: 'El beneficio que retiene al ejecutivo que ningún aumento retiene: cuidado real de su capacidad, no una prima más en el paquete.',
    cifra: '6.9 años',
    glosa: 'dura hoy un CEO en el cargo. El programa trabaja sobre esa cifra.',
    pie: '28 ciclos de 90 días caben en un mandato medio de 6.9 años. El programa trabaja sobre todos, no sobre el primero.',
    chart: 'ciclos',
    total: 28,
    activos: 4,
  },
  {
    num: '05',
    kicker: 'GOBIERNO',
    titulo: 'Riesgo de capital humano',
    texto: 'Datos agregados y anónimos por cohorte, listos para reportarse a la Junta como parte del riesgo que ya se espera que gobiernen — sin exposición individual ni legal.',
    cifra: '100%',
    glosa: 'agregado: sin dato individual identificable.',
    pie: 'Lo que sube al acta y lo que nunca sale de la relación médico–paciente.',
    chart: 'barras',
    filas: [
      { label: 'Reportable a la Junta', value: '100% agregado por cohorte', width: 100, gold: true },
      { label: 'Dato individual identificable', value: '0%', width: 0, gold: false },
    ],
  },
];

export const DIF = [
  'Ningún protocolo llega a ti sin que un especialista lo haya validado.',
  'Es optimización de hábitos y rendimiento, no diagnóstico ni tratamiento.',
  'Se contrata por cohorte dentro de una empresa. No hay registro individual.',
] as const;

export const EQUIPO_TAMANOS = ['1 – 10', '11 – 30', '31 – 80', '80 +'] as const;

export const APP_LOGIN_URL = 'https://app.ephirox.com/login';
