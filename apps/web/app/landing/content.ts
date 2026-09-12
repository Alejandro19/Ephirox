// Copy y datos de la landing pública (ephirox.com/landing), puerto 1:1 de
// docs/ephirox-landing.html — mismo texto, mismas fuentes, mismos números.

export const HERO_STATS = [
  { cifra: '1 de 3', texto: 'Trabajadores en Colombia enfrenta hoy desafíos de salud mental que afectan su desempeño.', fuente: 'FUENTE: SURA / COMPENSAR, 2025' },
  { cifra: '37%', texto: 'Más probabilidad de problemas cognitivos después de los 45 si vives con estrés alto sostenido.', fuente: 'FUENTE: JAMA NETWORK OPEN, 2023 (24.448 PERSONAS)' },
  { cifra: '65%', texto: 'De los altos ejecutivos en Latinoamérica prioriza bienestar y beneficios personalizados por encima de un aumento de salario.', fuente: 'FUENTE: MERCER, GLOBAL TALENT TRENDS 2023' },
] as const;
export const HERO_INTERVAL_MS = 6200;

// Usado por el grid de escritorio (.costos-grid en LandingPage.tsx) y por
// el carrusel mobile (CostosMobileCarousel.tsx) — mismo diseño con foto en
// los dos, solo cambia estático/grid vs. scroll-snap/carrusel.
export const COSTOS = [
  { num: '5X', texto: 'Un ejecutivo en burnout cuesta hasta 5x más que un empleado promedio (US$20.683 vs. US$4.257/año).', src: 'AM. J. OF PREVENTIVE MEDICINE, 2025', img: '/landing/costo-burnout.jpg', alt: 'Ejecutivo agotado, cabeza entre las manos' },
  { num: '10 – 40 %', texto: 'Más riesgo cardiovascular por tensión laboral sostenida — 27 estudios, +600.000 personas.', src: 'KIVIMÄKI & KAWACHI, 2015', img: '/landing/costo-ecg.jpg', alt: 'Monitor de ritmo cardíaco (ECG)' },
  { num: '55 / 6.9', texto: 'Edad promedio al nombrar a un CEO, y años que dura hoy en el cargo. Una sube. La otra baja.', src: 'NBER 2026 / KORN FERRY 2020', img: '/landing/costo-junta.jpg', alt: 'Ejecutivo presentando a su equipo en sala de juntas' },
] as const;

export const PASOS = [
  { ord: '01', titulo: 'Se mide, no se supone.', texto: 'Sueño, recuperación y estrés leídos desde tu mano, todos los días. Basta una noche de mal sueño para que tu cerebro procese el riesgo de forma distinta — por eso esto no se mide una vez al año.', img: '/landing/wearable.png', alt: 'Wearable en la mano' },
  { ord: '02', titulo: 'Lo que el wearable no ve, se analiza en sangre.', texto: 'Biomarcadores de laboratorio que dan la parte de la película que ningún dispositivo alcanza.', img: '/landing/vial.png', alt: 'Vial de laboratorio' },
  { ord: '03', titulo: 'Todo cruzado en un solo lugar.', texto: 'Tu estado real, en un tablero del que puedes hablar con datos, no con sensaciones.', img: '/landing/dashboard-preview.png', alt: 'Vista previa del tablero Evolution' },
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
    eph: 'Protocolos personalizados por ciclo y por persona.',
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
  { antes: 'No sé por qué ya no rindo igual.', despues: 'Sé qué está pasando en mi cuerpo antes de que afecte una decisión importante.' },
  { antes: 'Decido sin saber si estoy en mi mejor momento mental.', despues: 'Sé con datos cuándo mi juicio está en su punto más alto, y agendo ahí lo que importa.' },
  { antes: 'El descanso se siente como tiempo perdido.', despues: 'Cada hora de sueño está calibrada para sostener mi ventaja.' },
  { antes: 'Estoy solo en esto.', despues: 'Pertenezco a un círculo de pares que entienden esta presión.' },
] as const;

export const HITOS = [
  { titulo: 'Piensas con la misma nitidez a las 4pm que a las 8am.', detalle: 'Menos caídas de foco, con el registro que lo respalda.' },
  { titulo: 'El día ya no se te acaba a media tarde.', detalle: 'Los días malos dejan de ser un misterio.' },
  { titulo: 'Sabes en qué estado tomaste cada decisión crítica — y puedes repetirlo a voluntad.', detalle: 'Sueño, recuperación y estrés, registrados — tu mejor día, listo para repetirse.' },
  { titulo: 'Diriges tu capacidad, en vez de improvisar con lo que te queda de ella.', detalle: 'Lo que antes era tu punto ciego, ahora tiene alertas — antes del agotamiento, no explicaciones después de la caída.' },
] as const;

export const JUNTA = [
  { titulo: 'Ver el riesgo, no intuirlo', texto: 'El punto ciego que hoy tiene tu Junta sobre el talento crítico se vuelve visibilidad agregada y anónima — antes de que se traduzca en una salida inesperada.', barras: [0.22, 0.34, 0.28, 0.78, 0.31, 0.26, 0.82, 0.3, 0.24, 0.86, 0.27, 0.33], pie: 'Señales que hoy no se ven: se destacan solas dentro de la cohorte.' },
  { titulo: 'Retorno que se paga solo', texto: 'Reemplazar a un ejecutivo clave cuesta hasta el 50 % de su salario anual. Evitar una sola salida cubre la inversión de la cohorte completa.', barras: [0.3, 0.36, 0.42, 0.47, 0.55, 0.6, 0.66, 0.73, 0.78, 0.84, 0.9, 0.96], pie: 'Retorno proyectado por cohorte, trimestre a trimestre. Representación ilustrativa.' },
  { titulo: 'Antes del riesgo, no después', texto: 'Mientras la póliza de hombre clave indemniza cuando el riesgo ya ocurrió, esto lo detecta mientras aún se puede intervenir.', barras: [0.9, 0.82, 0.74, 0.68, 0.6, 0.54, 0.48, 0.42, 0.36, 0.32, 0.28, 0.24], pie: 'Probabilidad de salida inesperada, a la baja con el tiempo. Representación ilustrativa.' },
  { titulo: 'Ventaja de retención', texto: '42 % de los ejecutivos rechazaría un ascenso si perjudica su bienestar. Ofrecerlo es una ventaja de retención, no un costo adicional.', barras: [0.88, 0.9, 0.86, 0.91, 0.89, 0.92, 0.87, 0.9, 0.93, 0.89, 0.91, 0.9], pie: 'Continuidad sostenida en lugar de caídas sin aviso.' },
  { titulo: 'Riesgo de capital humano', texto: 'Datos agregados y anónimos por cohorte, listos para reportarse a la Junta como parte del riesgo que ya se espera que gobiernen — sin exposición individual ni legal.', barras: [0.24, 0.3, 0.36, 0.43, 0.5, 0.56, 0.62, 0.68, 0.74, 0.8, 0.86, 0.92], pie: 'Cobertura de gobierno de riesgo, creciente por cohorte. Representación ilustrativa.' },
] as const;
export const JUNTA_INITIAL_INDEX = 0;

export const DIF = [
  'Ningún protocolo llega a ti sin que un especialista lo haya validado.',
  'Es optimización de hábitos y rendimiento, no diagnóstico ni tratamiento.',
  'Se contrata por cohorte dentro de una empresa. No hay registro individual.',
] as const;

export const EQUIPO_TAMANOS = ['1 – 10', '11 – 30', '31 – 80', '80 +'] as const;

export const APP_LOGIN_URL = 'https://app.ephirox.com/login';
