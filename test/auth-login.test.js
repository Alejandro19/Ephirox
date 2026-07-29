const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('./helpers/testApp');
const { createTestAdmin, createTestClient, deleteTestAdmin, deleteTestClient } = require('./helpers/fixtures');

test('admin login: correct credentials returns a token', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  t.after(() => deleteTestAdmin(admin.id));

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: admin.password }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.role, 'admin');
  assert.equal(body.user.email, admin.email);
  assert.equal(typeof body.token, 'string');
});

test('admin login: wrong password is rejected', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  t.after(() => deleteTestAdmin(admin.id));

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: admin.email, password: 'wrong-password' }),
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Credenciales incorrectas.');
});

test('client login: correct credentials returns a token', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient();
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: client.email, password: client.password }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.role, 'cliente');
  assert.equal(body.user.id, client.id);
});

test('client login: wrong password is rejected', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient();
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: client.email, password: 'wrong-password' }),
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Credenciales incorrectas.');
});

test('login: unknown email is rejected the same as wrong password', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `nobody-${Date.now()}@test.latribu.local`, password: 'whatever' }),
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Credenciales incorrectas.');
});

test('client login: inactive account is rejected even with correct password', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient({ status: 'inactive' });
  t.after(() => deleteTestClient(client.id));

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: client.email, password: client.password }),
  });
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Tu cuenta está inactiva. Contacta al administrador.');
});
