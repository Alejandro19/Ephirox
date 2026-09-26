import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { eq, like, inArray } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { enterpriseLeads, adminNotifications } from '../src/models/schema.js';
import { issueLeadToken, computeLeadCode } from '../src/services/lead-verification.service.js';

// Todo lead público exige el correo verificado: se emite el token igual que
// lo haría POST /enterprise-leads/verification/confirm.
function withToken<T extends { correo?: string }>(body: T) {
  return { ...body, verificationToken: issueLeadToken(body.correo ?? '') };
}

describe('enterprise leads routes', () => {
  const app = createApp();
  const createdLeadIds: string[] = [];

  afterAll(async () => {
    // Correos de los tests de controles: si un control fallara y dejara una
    // fila, no debe contaminar la siguiente corrida (dedupe de 24 h).
    await db.delete(enterpriseLeads).where(inArray(enterpriseLeads.correo, ['carla@delta.com', 'bot@spam.com', 'dupe@delta.com', 'verifica@epsilon.com'])).catch(() => {});
    for (const id of createdLeadIds) {
      await db.delete(enterpriseLeads).where(eq(enterpriseLeads.id, id)).catch(() => {});
    }
    // Bug real encontrado acá: el mensaje cambió a "Nueva solicitud de
    // demo: ..." (punto 12, formulario "propuesta"→"demo") pero este
    // cleanup seguía buscando el prefijo viejo "Nueva empresa interesada:" —
    // nunca borraba nada, y las filas de adminNotifications se acumulaban
    // entre corridas del suite completo (causa real de la flakiness
    // "expected 1, got 2/3" ya observada esta sesión).
    await db.delete(adminNotifications).where(like(adminNotifications.message, 'Nueva solicitud de demo:%')).catch(() => {});
  });

  it('crea un lead sin necesitar autenticación (endpoint público de la landing), y una alarma en el panel admin', async () => {
    const res = await request(app)
      .post('/api/enterprise-leads')
      .send(withToken({
        nombre: 'Ana Ríos',
        empresa: 'Acme Corp',
        rol: 'CEO',
        correo: 'ana@acme.com',
        celular: '+57 300 123 4567',
        tamano: '11 – 30',
        quien: 'Mi COO',
      }));

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true });

    const rows = await db.select().from(enterpriseLeads).where(eq(enterpriseLeads.empresa, 'Acme Corp'));
    expect(rows).toHaveLength(1);
    createdLeadIds.push(rows[0].id);
    expect(rows[0]).toMatchObject({
      nombre: 'Ana Ríos',
      rol: 'CEO',
      correo: 'ana@acme.com',
      celular: '+57 300 123 4567',
      tamano: '11 – 30',
      quien: 'Mi COO',
    });

    const notifications = await db.select().from(adminNotifications).where(like(adminNotifications.message, '%Acme Corp%'));
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ type: 'enterprise_lead', clientId: null, read: false });
  });

  it('acepta el lead sin tamano ni quien (ninguno de los dos es obligatorio)', async () => {
    const res = await request(app)
      .post('/api/enterprise-leads')
      .send(withToken({ nombre: 'Luis Peña', empresa: 'Beta SAS', rol: 'Founder', correo: 'luis@beta.com', celular: '+57 301 987 6543' }));

    expect(res.status).toBe(201);
    const rows = await db.select().from(enterpriseLeads).where(eq(enterpriseLeads.empresa, 'Beta SAS'));
    expect(rows).toHaveLength(1);
    createdLeadIds.push(rows[0].id);
  });

  it('rechaza el envío si falta un campo requerido', async () => {
    const res = await request(app).post('/api/enterprise-leads').send(withToken({ nombre: 'Sin Empresa', rol: 'CFO' }));
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rechaza un correo personal/gratuito (punto 12.1 — correo de trabajo corporativo)', async () => {
    const res = await request(app)
      .post('/api/enterprise-leads')
      .send(withToken({ nombre: 'Correo Personal', correo: 'alguien@gmail.com', celular: '+57 300 555 8899' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/correo electrónico corporativo/i);
  });

  it('guarda país y sitio web (punto 12.1 — Paso 2 del formulario)', async () => {
    const res = await request(app)
      .post('/api/enterprise-leads')
      .send(withToken({
        nombre: 'Marta Gil',
        empresa: 'Gamma SAS',
        rol: 'COO',
        correo: 'marta@gamma.com',
        celular: '+57 302 111 2222',
        tamano: '31 – 80',
        pais: 'México',
        sitioWeb: 'gamma.com',
      }));
    expect(res.status).toBe(201);
    const rows = await db.select().from(enterpriseLeads).where(eq(enterpriseLeads.empresa, 'Gamma SAS'));
    expect(rows).toHaveLength(1);
    createdLeadIds.push(rows[0].id);
    expect(rows[0]).toMatchObject({ pais: 'México', sitioWeb: 'gamma.com' });
  });

  // Executive Performance Score: el backend recalcula todo desde las
  // respuestas — el score/segmento/programa nunca vienen del cliente.
  describe('evaluación Executive Performance Score', () => {
    const contacto = { nombre: 'Score Co', empresa: 'Score Co', correo: 'ceo@scoreco.com', celular: '+57 300 555 8899' };
    const respuestasBajas = Array(15).fill(1); // 25/100 en todas las categorías

    it('guarda score, segmento y programa recalculados desde las respuestas', async () => {
      const res = await request(app)
        .post('/api/enterprise-leads')
        .send(withToken({ ...contacto, evaluacion: { respuestas: respuestasBajas, personas: '50 – 200', equipoDirectivo: true, evaluarEquipo: false } }));
      expect(res.status).toBe(201);

      const rows = await db.select().from(enterpriseLeads).where(eq(enterpriseLeads.correo, 'ceo@scoreco.com'));
      createdLeadIds.push(...rows.map((r) => r.id));
      expect(rows).toHaveLength(1);
      expect(rows[0].score).toBe(25);
      expect(rows[0].segmento).toBe('riesgo_elevado');
      expect(rows[0].programa).toBe('executive_prioritario');
      expect(rows[0].evaluacion).toMatchObject({ personas: '50 – 200', equipoDirectivo: true, evaluarEquipo: false });
    });

    it('marca el lead para Corporate Program cuando quiere evaluar a su equipo', async () => {
      const res = await request(app)
        .post('/api/enterprise-leads')
        .send(withToken({ ...contacto, correo: 'ceo2@scoreco.com', evaluacion: { respuestas: Array(15).fill(4), personas: 'Más de 200', equipoDirectivo: true, evaluarEquipo: true } }));
      expect(res.status).toBe(201);
      const [row] = await db.select().from(enterpriseLeads).where(eq(enterpriseLeads.correo, 'ceo2@scoreco.com'));
      createdLeadIds.push(row.id);
      expect(row.score).toBe(100);
      expect(row.segmento).toBe('optimizacion');
      expect(row.programa).toBe('corporate');
    });

    it('ignora un score/segmento mandado por el cliente', async () => {
      const res = await request(app)
        .post('/api/enterprise-leads')
        .send(withToken({ ...contacto, correo: 'ceo3@scoreco.com', score: 99, programa: 'corporate', evaluacion: { respuestas: respuestasBajas, personas: 'Menos de 10', equipoDirectivo: false, evaluarEquipo: false } }));
      // Los campos desconocidos se descartan y el valor real sale del cálculo.
      expect(res.status).toBe(201);
      const [row] = await db.select().from(enterpriseLeads).where(eq(enterpriseLeads.correo, 'ceo3@scoreco.com'));
      createdLeadIds.push(row.id);
      expect(row.score).toBe(25);
      expect(row.programa).toBe('executive_prioritario');
    });

    it('rechaza una evaluación con respuestas incompletas o fuera de rango', async () => {
      const incompleta = await request(app).post('/api/enterprise-leads').send(withToken({ ...contacto, evaluacion: { respuestas: [1, 2], personas: '10 – 50', equipoDirectivo: true, evaluarEquipo: false } }));
      expect(incompleta.status).toBe(400);
      const fuera = await request(app).post('/api/enterprise-leads').send(withToken({ ...contacto, evaluacion: { respuestas: Array(15).fill(9), personas: '10 – 50', equipoDirectivo: true, evaluarEquipo: false } }));
      expect(fuera.status).toBe(400);
    });
  });

  // ── Controles contra datos falsos ──
  describe('controles contra datos falsos', () => {
    const base = { nombre: 'Carla Mora', empresa: 'Delta SAS', correo: 'carla@delta.com', celular: '+57 310 555 8899' };

    it('rechaza un lead sin correo verificado, o con el token de OTRO correo', async () => {
      const sinToken = await request(app).post('/api/enterprise-leads').send(base);
      expect(sinToken.status).toBe(400);
      expect(sinToken.body.error).toMatch(/Verifica tu correo/);

      const otroCorreo = await request(app).post('/api/enterprise-leads').send({ ...base, verificationToken: issueLeadToken('otra@persona.com') });
      expect(otroCorreo.status).toBe(400);

      const manipulado = await request(app).post('/api/enterprise-leads').send({ ...base, verificationToken: `${Date.now() + 999999}.firmafalsa` });
      expect(manipulado.status).toBe(400);
      expect(await db.select().from(enterpriseLeads).where(eq(enterpriseLeads.correo, base.correo))).toHaveLength(0);
    });

    it('rechaza teléfonos y textos obviamente falsos', async () => {
      for (const celular of ['1111111111', '1234567890', '+57 300', '+57 3000000000']) {
        const res = await request(app).post('/api/enterprise-leads').send(withToken({ ...base, celular }));
        expect(res.status, celular).toBe(400);
      }
      const nombreRelleno = await request(app).post('/api/enterprise-leads').send(withToken({ ...base, nombre: 'aaaaaaa' }));
      expect(nombreRelleno.status).toBe(400);
      const soloNumeros = await request(app).post('/api/enterprise-leads').send(withToken({ ...base, empresa: '12345' }));
      expect(soloNumeros.status).toBe(400);
    });

    it('descarta en silencio lo que llena el campo trampa (honeypot) y no guarda nada', async () => {
      const res = await request(app).post('/api/enterprise-leads').send(withToken({ ...base, correo: 'bot@spam.com', hp: 'http://spam.example' }));
      expect(res.status).toBe(201);
      expect(await db.select().from(enterpriseLeads).where(eq(enterpriseLeads.correo, 'bot@spam.com'))).toHaveLength(0);
    });

    it('no duplica: el mismo correo enviado dos veces en 24 h deja una sola fila', async () => {
      const body = withToken({ ...base, correo: 'dupe@delta.com' });
      expect((await request(app).post('/api/enterprise-leads').send(body)).status).toBe(201);
      expect((await request(app).post('/api/enterprise-leads').send(body)).status).toBe(201);
      const rows = await db.select().from(enterpriseLeads).where(eq(enterpriseLeads.correo, 'dupe@delta.com'));
      createdLeadIds.push(...rows.map((r) => r.id));
      expect(rows).toHaveLength(1);
    });
  });

  describe('verificación del correo (código)', () => {
    it('el código correcto entrega un token que el lead acepta; uno incorrecto no', async () => {
      const correo = 'verifica@epsilon.com';
      const start = await request(app).post('/api/enterprise-leads/verification').send({ correo });
      expect(start.status).toBe(200);

      const mal = await request(app).post('/api/enterprise-leads/verification/confirm').send({ correo, code: '000000' === computeLeadCode(correo) ? '111111' : '000000' });
      expect(mal.status).toBe(400);

      const bien = await request(app).post('/api/enterprise-leads/verification/confirm').send({ correo, code: computeLeadCode(correo) });
      expect(bien.status).toBe(200);
      expect(typeof bien.body.token).toBe('string');

      const lead = await request(app)
        .post('/api/enterprise-leads')
        .send({ nombre: 'Vera Solis', empresa: 'Epsilon SAS', correo, celular: '+57 311 222 3344', verificationToken: bien.body.token });
      expect(lead.status).toBe(201);
      const rows = await db.select().from(enterpriseLeads).where(eq(enterpriseLeads.correo, correo));
      createdLeadIds.push(...rows.map((r) => r.id));
      expect(rows).toHaveLength(1);
    });

    it('el código de un correo no sirve para otro', async () => {
      const res = await request(app).post('/api/enterprise-leads/verification/confirm').send({ correo: 'otro@epsilon.com', code: computeLeadCode('verifica@epsilon.com') });
      expect(res.status).toBe(400);
    });

    it('no manda códigos a correos personales', async () => {
      const res = await request(app).post('/api/enterprise-leads/verification').send({ correo: 'persona@gmail.com' });
      expect(res.status).toBe(400);
    });
  });
});
