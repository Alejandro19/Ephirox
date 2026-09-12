/**
 * Contenido legal — Ephirox
 *
 * Fuente única de verdad para el texto de la Política de Tratamiento de
 * Datos Personales y los Términos y Condiciones de Uso, mostrados por
 * AceptacionRegistro.jsx — en el gate obligatorio del primer acceso
 * (AppShell.tsx, cuando el cliente nunca aceptó nada) y en la reaceptación
 * voluntaria desde Configuración de cuenta (PanelConfiguracion.jsx). También
 * se sirven tal cual en /terminos y /privacidad (públicas, ver LegalDocument.tsx).
 *
 * Reglas de uso:
 * - Cualquier cambio de texto aquí debe ir acompañado de subir el número
 *   de versión correspondiente (DATA_POLICY_VERSION / TERMS_VERSION),
 *   y pasar por revisión (PR + idealmente el abogado) antes de deploy.
 *   No se edita en caliente desde un panel — el registro de qué versión
 *   aceptó cada usuario solo tiene valor probatorio si la versión
 *   cambia únicamente vía código versionado.
 * - Debe decir EXACTAMENTE lo mismo que los .docx entregados
 *   (Política de Tratamiento de Datos Personales / Términos y
 *   Condiciones de Uso). Si editas uno, edita el otro.
 */

export const DATA_POLICY_VERSION = "v1.0";
export const TERMS_VERSION = "v1.0";

export const DATOS_CONTENT = [
  { h: "1. Responsable del tratamiento", blocks: [
    { p: "Ephirox S.A.S., con domicilio en Bogotá, Colombia, es responsable del tratamiento de tus datos personales conforme a la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013." },
    { p: "Canal de contacto para asuntos de protección de datos: contacto@ephirox.com." },
  ]},
  { h: "2. Aceptación y ámbito de aplicación", blocks: [
    { p: "Esta política debe ser leída y aceptada expresamente por todo cliente de la plataforma, como condición previa al uso de la plataforma y a la recolección de cualquier dato personal, mediante un mecanismo de casilla de verificación independiente presentado en tu primer acceso, o al actualizarse esta política." },
  ]},
  { h: "3. Datos que se recolectan", blocks: [
    { ul: [
      "Datos de identificación: nombre completo, documento de identidad, país, ciudad, correo electrónico, número de celular.",
      "Datos de salud y bienestar (datos sensibles): mediciones corporales (peso, grasa, masa muscular), resultados de InBody, información de sueño, recuperación y variabilidad de frecuencia cardíaca de dispositivos conectados (p. ej. Oura), motivo de consulta y notas del acompañamiento terapéutico o de mentoría.",
      "Datos de uso de la plataforma: actividad en los módulos de Workout, Nutrition, Stress, Sleep, adherencia a protocolos, rachas y participación en eventos, retiros o terapias.",
      "Datos de pago y facturación, tratados a través de las pasarelas de pago correspondientes.",
    ]},
    { note: "Los datos de salud, biométricos y de bienestar se consideran datos sensibles conforme al artículo 5 de la Ley 1581 de 2012. Su tratamiento requiere autorización previa, expresa e informada, reforzada frente a los datos ordinarios." },
  ]},
  { h: "4. Finalidades del tratamiento", blocks: [
    { ul: [
      "Gestionar el registro, la membresía y el acceso a los módulos de la plataforma según el tipo de cliente.",
      "Diseñar, personalizar y hacer seguimiento a los protocolos de Workout, Nutrition, Stress y Sleep.",
      "Permitir el acompañamiento de mentores y terapeutas dentro del panel clínico (\"Punto Ciego\").",
      "Calcular indicadores de evolución y rendimiento (Evolution, Índice de Rendimiento).",
      "Enviar comunicaciones sobre el servicio, eventos, retiros y demás beneficios de la plataforma.",
      "Fines estadísticos y de mejora del servicio, incluyendo el eventual entrenamiento de modelos internos de recomendación, sobre datos agregados o anonimizados cuando sea posible.",
      "Cumplir obligaciones legales, contables y fiscales.",
    ]},
  ]},
  { h: "5. Principios aplicables", blocks: [
    { p: "Legalidad, finalidad, libertad, veracidad o calidad, transparencia, acceso y circulación restringida, seguridad y confidencialidad, conforme al artículo 4 de la Ley 1581 de 2012." },
  ]},
  { h: "6. Autorización", blocks: [
    { p: "Al aceptar esta política, otorgas autorización previa, expresa e informada para el tratamiento de tus datos personales conforme a lo aquí descrito. Dado que la plataforma recolecta datos sensibles de salud, esta autorización es reforzada y diferenciada: no estás obligado a suministrar dichos datos, son de carácter sensible, y su suministro es voluntario, conforme al artículo 6 de la Ley 1581 de 2012." },
  ]},
  { h: "7. Tus derechos (Habeas Data)", blocks: [
    { ul: [
      "Conocer, actualizar y rectificar tus datos personales.",
      "Solicitar prueba de la autorización otorgada.",
      "Ser informado sobre el uso dado a tus datos.",
      "Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.",
      "Revocar la autorización y/o solicitar la supresión del dato, cuando no exista un deber legal o contractual que impida eliminarlo.",
      "Acceder de forma gratuita a tus datos personales que hayan sido objeto de tratamiento.",
    ]},
  ]},
  { h: "8. Cómo ejercer tus derechos", blocks: [
    { p: "Para ejercer tus derechos como titular de datos personales (conocer, actualizar, rectificar o suprimir tu información, o revocar la autorización otorgada), puedes escribir a contacto@ephirox.com." },
  ]},
  { h: "9. Con quién compartimos tus datos", blocks: [
    { p: "Podemos compartir datos con encargados del tratamiento que prestan servicios tecnológicos a la plataforma (hosting, pasarela de pagos, integración con dispositivos wearables como Oura), obligados contractualmente a dar a los datos el mismo nivel de protección exigido por esta política. No vendemos ni comercializamos datos personales con fines ajenos a la prestación del servicio." },
  ]},
  { h: "10. Vigencia y conservación", blocks: [
    { p: "Los datos se conservan mientras exista la relación contigo y el tiempo adicional necesario para cumplir obligaciones legales, contables o para atender requerimientos de autoridades competentes." },
  ]},
  { h: "11. Modificaciones", blocks: [
    { p: "Podemos modificar esta política para reflejar cambios normativos o en nuestras prácticas de tratamiento. Los cambios sustanciales serán informados por los canales de la plataforma." },
  ]},
];

export const TERMINOS_CONTENT = [
  { h: "1. Objeto", blocks: [
    { p: "Estos Términos y Condiciones (\"los Términos\") regulan el acceso y uso de la plataforma Ephirox, incluyendo su sitio web, aplicación y todos sus módulos (Baseline, Workout, Nutrition, Stress, Sleep, The Circle, Evolution y demás funcionalidades presentes o futuras), operada por Ephirox S.A.S. (\"Ephirox\")." },
  ]},
  { h: "2. Aceptación", blocks: [
    { p: "El acceso a la plataforma requiere la aceptación expresa e independiente de estos Términos, junto con la Política de Tratamiento de Datos Personales. Quien no acepte ambos documentos no podrá usar los servicios." },
  ]},
  { h: "3. Cuenta y tipo de cliente", blocks: [
    { p: "Ephirox asigna categorías de cliente con acceso diferenciado a los módulos de la plataforma, según el plan o membresía contratada. Ephirox se reserva el derecho de admisión y permanencia respecto de las membresías de pago, y podrá suspender o revocar el acceso en caso de incumplimiento de estos Términos." },
  ]},
  { h: "4. Licencia y propiedad intelectual", blocks: [
    { p: "Ephirox te otorga una licencia limitada, personal, intransferible, no exclusiva y revocable para acceder y usar la plataforma exclusivamente mientras tu membresía permanezca activa. Todo el contenido, software y diseño de la plataforma son propiedad de Ephirox; queda prohibido copiar, distribuir, descompilar, crear obras derivadas, usar bots o scraping, o remover avisos de derechos. El incumplimiento permite suspender inmediatamente tu acceso." },
    { p: "Las mediciones, resultados de InBody y demás información que cargues a la plataforma siguen siendo de tu titularidad; al usarla, otorgas a Ephirox una licencia limitada para tratarla únicamente con el fin de prestarte el servicio." },
  ]},
  { h: "5. Servicios de terceros", blocks: [
    { p: "La plataforma puede integrarse con servicios de terceros (p. ej. dispositivos wearables o pasarelas de pago). El uso de dichos servicios se rige adicionalmente por los términos propios de cada proveedor, sobre los cuales Ephirox no tiene control ni responsabilidad." },
  ]},
  { h: "6. Uso aceptable", blocks: [
    { p: "Te comprometes a hacer un uso diligente y de buena fe de la plataforma, a no compartir tus credenciales de acceso, y a no utilizar el servicio para fines ilícitos o contrarios a estos Términos." },
  ]},
  { h: "7. Descargo de responsabilidad y naturaleza del servicio", blocks: [
    { p: "Ephirox es una plataforma de bienestar y optimización de hábitos, no un dispositivo médico ni un servicio de salud clínica. No diagnostica, trata, cura ni previene ninguna enfermedad o condición médica o de salud mental. Los protocolos y recomendaciones se basan en datos de wearables, marcadores biológicos y hábitos, revisados y aprobados por nuestro equipo — no sustituyen la consulta con un médico, psicólogo u otro profesional de salud licenciado." },
    { p: "Ephirox puede usar inteligencia artificial para generar borradores de contenido y análisis de datos; como tal, puede ser incompleto o impreciso. Confirma siempre decisiones de salud importantes con un profesional licenciado. Si tú o alguien más está en una situación de emergencia médica o de salud mental, comunícate de inmediato con los servicios de emergencia de tu país o con la línea de atención en crisis correspondiente." },
    { p: "Sobre los reportes para tu empresa: cuando el programa se contrata como beneficio corporativo, tu empleador puede recibir información agregada y/o comparativa derivada de tus datos, según los términos definidos en tu contrato de servicio y con tu consentimiento explícito. Estos reportes son informativos y no constituyen asesoría legal, de gobierno corporativo, ni una evaluación de idoneidad laboral." },
    { p: "Tus datos son tuyos. Nunca se venden ni se usan para publicidad. Puedes solicitar una copia de tus datos o su eliminación completa en cualquier momento, incluyendo si dejas de usar la plataforma o finalizas tu programa." },
  ]},
  { h: "8. Suspensión y terminación", blocks: [
    { p: "Ephirox podrá suspender o cancelar tu cuenta si incumples estos Términos, sin perjuicio de las demás acciones legales a que haya lugar. Puedes solicitar la cancelación de tu cuenta en cualquier momento a través de los canales dispuestos por Ephirox." },
  ]},
  { h: "9. Modificaciones", blocks: [
    { p: "Ephirox podrá actualizar estos Términos para reflejar cambios en el servicio o en la normativa aplicable. Los cambios sustanciales serán notificados, y el uso continuado de la plataforma tras la notificación constituye aceptación de los Términos actualizados." },
  ]},
  { h: "10. Ley aplicable y jurisdicción", blocks: [
    { p: "Estos Términos se rigen por las leyes de la República de Colombia, con jurisdicción en Bogotá, Colombia." },
  ]},
  { h: "11. Contacto", blocks: [
    { p: "Para consultas relacionadas con estos Términos, puedes escribir a contacto@ephirox.com." },
  ]},
];
