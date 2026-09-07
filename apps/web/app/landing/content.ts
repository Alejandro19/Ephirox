// Copy y datos de la landing pública (ephirox.com/landing), puerto 1:1 de
// docs/ephirox-landing.html — mismo texto, mismas fuentes, mismos números.

export const HERO_STATS = [
  { cifra: '1 de 3', texto: 'Trabajadores en Colombia enfrenta hoy desafíos de salud mental que afectan su desempeño.', fuente: 'FUENTE: SURA / COMPENSAR, 2025' },
  { cifra: '37%', texto: 'Más probabilidad de problemas cognitivos después de los 45 si vives con estrés alto sostenido.', fuente: 'FUENTE: JAMA NETWORK OPEN, 2023 (24.448 PERSONAS)' },
  { cifra: '42%', texto: 'De los ejecutivos rechazaría un ascenso si perjudicara su bienestar personal.', fuente: 'FUENTE: PAGE EXECUTIVE, TALENT TRENDS 2026' },
  { cifra: '65%', texto: 'De los altos ejecutivos en Latinoamérica prioriza bienestar y beneficios personalizados por encima de un aumento de salario.', fuente: 'FUENTE: MERCER, GLOBAL TALENT TRENDS 2023' },
] as const;
export const HERO_INTERVAL_MS = 6200;

export const COSTOS = [
  { num: '5X', texto: 'Un ejecutivo en burnout le cuesta a la empresa hasta 5 veces más que un empleado promedio (US$20.683 vs. US$4.257 al año).', src: 'AM. J. OF PREVENTIVE MEDICINE, 2025' },
  { num: '10 – 40 %', texto: 'Más riesgo cardiovascular asociado a tensión laboral sostenida. 27 estudios de cohorte, más de 600.000 personas.', src: 'KIVIMÄKI & KAWACHI, 2015' },
  { num: '55 / 6.9', texto: 'Edad promedio en que se nombra a un CEO, y años que dura hoy en el cargo. Una sube. La otra baja.', src: 'NBER 2026 / KORN FERRY 2020' },
] as const;

export const FRASE = 'Puedes seguir administrando el desgaste, o puedes empezar a dirigirlo. Esa decisión define qué tan lejos llega lo que construiste.';

export const PASOS = [
  { ord: '01', titulo: 'Se mide, no se supone.', texto: 'Sueño, recuperación y carga leídos desde tu mano, todos los días. Basta una noche de mal sueño para que tu cerebro procese el riesgo de forma distinta — por eso esto no se mide una vez al año.', img: '/landing/wearable.png', alt: 'Wearable en la mano' },
  { ord: '02', titulo: 'Lo que el wearable no ve, se analiza en sangre.', texto: 'Biomarcadores de laboratorio que dan la parte de la película que ningún dispositivo alcanza.', img: '/landing/vial.png', alt: 'Vial de laboratorio' },
  { ord: '03', titulo: 'Todo cruzado en un solo lugar.', texto: 'Tu estado real, en un tablero del que puedes hablar con datos, no con sensaciones.', img: '/landing/dashboard-preview.png', alt: 'Vista previa del tablero Evolution' },
] as const;

export const COMPARACION = [
  {
    indicador: 'Detección temprana de riesgo',
    trad: '1 de cada 3 trabajadores en Colombia enfrenta desafíos de salud mental que afectan su desempeño.',
    eph: 'Biomarcadores sanguíneos + wearable + comportamiento, + edad biológica como señal de riesgo antes del síntoma.',
    dif: 'Sistema preventivo, no reactivo',
  },
  {
    indicador: 'Costo de ausentismo por salud',
    trad: '34 % de los trabajadores colombianos se ausenta por ansiedad o estrés; el ausentismo le cuesta a las empresas cerca de 10 días por trabajador al año.',
    eph: 'Stress + Sleep con monitoreo continuo por wearable y check-ins sobre datos reales del ejecutivo.',
    dif: 'Intervención antes de que se traduzca en ausencia',
  },
  {
    indicador: 'Personalización',
    trad: 'El mismo plan de wellness para toda la nómina.',
    eph: 'Protocolos personalizados por ciclo y por persona.',
    dif: '100 % personalizado, no por población.',
  },
  {
    indicador: 'Validación',
    trad: 'Ninguna, o subjetiva — apps de autoayuda sin respaldo clínico.',
    eph: 'Cada protocolo es revisado por un especialista humano antes de llegar al cliente.',
    dif: 'Respaldo humano, no solo algoritmo.',
  },
  {
    indicador: 'Acceso',
    trad: 'Abierto a cualquiera, beneficio genérico de nómina.',
    eph: 'Reservado por cohorte ejecutiva, dentro de la empresa (founders y C-levels).',
    dif: 'Élite, no es masivo',
  },
] as const;

export const SHIFTS = [
  { antes: 'No sé por qué ya no rindo igual.', despues: 'Sé qué está pasando en mi cuerpo antes de que afecte una decisión importante.' },
  { antes: 'Decido sin saber si estoy en mi mejor momento mental.', despues: 'Sé con datos cuándo mi juicio está en su punto más alto, y agendo ahí lo que importa.' },
  { antes: 'El descanso se siente como tiempo perdido.', despues: 'Cada hora de sueño está calibrada para sostener mi ventaja.' },
  { antes: 'Estoy solo en esto.', despues: 'Pertenezco a un círculo de pares que entienden esta presión.' },
] as const;

export const HITOS = [
  { titulo: 'Claridad mental sostenida', detalle: 'Menos caídas de foco, con el registro que lo respalda.' },
  { titulo: 'Menos días de baja energía', detalle: 'Los días malos dejan de ser un misterio.' },
  { titulo: 'Decisiones con más certeza', detalle: 'Sabes en qué estado tomaste cada decisión crítica.' },
  { titulo: 'Control recuperado', detalle: 'Diriges tu capacidad en vez de administrar su desgaste.' },
] as const;

export const JUNTA = [
  { titulo: 'Ver el riesgo, no intuirlo', texto: 'El estado real de rendimiento del talento crítico, agregado y anónimo.', barras: [0.22, 0.34, 0.28, 0.78, 0.31, 0.26, 0.82, 0.3, 0.24, 0.86, 0.27, 0.33], pie: 'Señales que hoy no se ven: se destacan solas dentro de la cohorte.' },
  { titulo: 'Material listo para la Junta', texto: 'Adherencia, tendencia de recuperación y señales tempranas, por cohorte.', barras: [0.3, 0.36, 0.42, 0.47, 0.55, 0.6, 0.66, 0.73, 0.78, 0.84, 0.9, 0.96], pie: 'Tendencia por cohorte, trimestre a trimestre. Representación ilustrativa.' },
  { titulo: 'Liderazgo protegido', texto: 'Menos probabilidad de perder sin aviso a quien sostiene la decisión más crítica.', barras: [0.88, 0.9, 0.86, 0.91, 0.89, 0.92, 0.87, 0.9, 0.93, 0.89, 0.91, 0.9], pie: 'Continuidad sostenida en lugar de caídas sin aviso.' },
] as const;
export const JUNTA_INITIAL_INDEX = 1;

export const DIF = [
  'Ningún protocolo llega a ti sin que un especialista lo haya validado.',
  'Es optimización de hábitos y rendimiento, no diagnóstico ni tratamiento.',
  'Se contrata por cohorte dentro de una empresa. No hay registro individual.',
] as const;
export const DIF_INTERVAL_MS = 6500;

export const EQUIPO_TAMANOS = ['1 – 10', '11 – 30', '31 – 80', '80 +'] as const;

export const APP_LOGIN_URL = 'https://app.ephirox.com/login';
