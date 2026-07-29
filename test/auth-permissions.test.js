const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { startTestApp } = require('./helpers/testApp');
const { createTestAdmin, createTestClient, deleteTestAdmin, deleteTestClient } = require('./helpers/fixtures');

function tokenFor(user, role) {
  return jwt.sign(
    { id: user.id, role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

test('ownerOrAdmin: a client cannot read another client\'s data', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const clientA = await createTestClient();
  const clientB = await createTestClient();
  t.after(() => Promise.all([deleteTestClient(clientA.id), deleteTestClient(clientB.id)]));

  const res = await fetch(`${baseUrl}/api/clients/${clientB.id}`, {
    headers: { Authorization: `Bearer ${tokenFor(clientA, 'cliente')}` },
  });
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.error, 'No tienes permiso para acceder a estos datos.');
});

test('ownerOrAdmin: a client can read its own data', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient();
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/clients/${client.id}`, {
    headers: { Authorization: `Bearer ${tokenFor(client, 'cliente')}` },
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.client.id, client.id);
});

test('ownerOrAdmin: an admin can read any client\'s data', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  const client = await createTestClient();
  t.after(() => Promise.all([deleteTestAdmin(admin.id), deleteTestClient(client.id)]));

  const res = await fetch(`${baseUrl}/api/clients/${client.id}`, {
    headers: { Authorization: `Bearer ${tokenFor(admin, 'admin')}` },
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.client.id, client.id);
});

test('adminOnly: a client cannot list all clients', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient();
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/clients`, {
    headers: { Authorization: `Bearer ${tokenFor(client, 'cliente')}` },
  });
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.error, 'Acceso restringido a administradores.');
});

test('adminOnly: an admin can list all clients', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  t.after(() => deleteTestAdmin(admin.id));

  const res = await fetch(`${baseUrl}/api/clients`, {
    headers: { Authorization: `Bearer ${tokenFor(admin, 'admin')}` },
  });

  assert.equal(res.status, 200);
});

test('blockForLeadWellness: a lead_wellness client is blocked from personal-info', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient({ client_type: 'lead_wellness' });
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/clients/${client.id}/personal-info`, {
    headers: { Authorization: `Bearer ${tokenFor(client, 'cliente')}` },
  });
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.error, 'Este módulo no está disponible para tu tipo de cuenta.');
});

test('blockForLeadWellness: a coaching_1_1 client is not blocked from personal-info', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient({ client_type: 'coaching_1_1' });
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/clients/${client.id}/personal-info`, {
    headers: { Authorization: `Bearer ${tokenFor(client, 'cliente')}` },
  });

  assert.equal(res.status, 200);
});
