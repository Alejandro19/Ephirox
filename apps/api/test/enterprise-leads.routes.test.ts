import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { eq, like } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';
import { enterpriseLeads, adminNotifications } from '../src/models/schema.js';

describe('enterprise leads routes', () => {
  const app = createApp();
  const createdLeadIds: string[] = [];

  afterAll(async () => {
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
      .send({
        nombre: 'Ana Ríos',
        empresa: 'Acme Corp',
        rol: 'CEO',
        correo: 'ana@acme.com',
        celular: '+57 300 123 4567',
        tamano: '11 – 30',
        quien: 'Mi COO',
      });

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
      .send({ nombre: 'Luis Peña', empresa: 'Beta SAS', rol: 'Founder', correo: 'luis@beta.com', celular: '+57 301 987 6543' });

    expect(res.status).toBe(201);
    const rows = await db.select().from(enterpriseLeads).where(eq(enterpriseLeads.empresa, 'Beta SAS'));
    expect(rows).toHaveLength(1);
    createdLeadIds.push(rows[0].id);
  });

  it('rechaza el envío si falta un campo requerido', async () => {
    const res = await request(app).post('/api/enterprise-leads').send({ nombre: 'Sin Empresa', rol: 'CFO' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rechaza un correo personal/gratuito (punto 12.1 — correo de trabajo corporativo)', async () => {
    const res = await request(app)
      .post('/api/enterprise-leads')
      .send({ nombre: 'Correo Personal', correo: 'alguien@gmail.com', celular: '+57 300 000 0000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/correo electrónico corporativo/i);
  });

  it('guarda país y sitio web (punto 12.1 — Paso 2 del formulario)', async () => {
    const res = await request(app)
      .post('/api/enterprise-leads')
      .send({
        nombre: 'Marta Gil',
        empresa: 'Gamma SAS',
        rol: 'COO',
        correo: 'marta@gamma.com',
        celular: '+57 302 111 2222',
        tamano: '31 – 80',
        pais: 'México',
        sitioWeb: 'gamma.com',
      });
    expect(res.status).toBe(201);
    const rows = await db.select().from(enterpriseLeads).where(eq(enterpriseLeads.empresa, 'Gamma SAS'));
    expect(rows).toHaveLength(1);
    createdLeadIds.push(rows[0].id);
    expect(rows[0]).toMatchObject({ pais: 'México', sitioWeb: 'gamma.com' });
  });
});
