const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { startTestApp } = require('./helpers/testApp');
const { createTestAdmin, deleteTestAdmin } = require('./helpers/fixtures');

test('protected route: no Authorization header is rejected', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/api/auth/me`);
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.error, 'Token requerido.');
});

test('protected route: malformed token is rejected', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: 'Bearer not-a-real-token' },
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.error, 'Token inválido o expirado.');
});

test('protected route: expired token is rejected', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  t.after(() => deleteTestAdmin(admin.id));

  const expiredToken = jwt.sign(
    { id: admin.id, role: 'admin', name: admin.name, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: '-1s' }
  );

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.error, 'Token inválido o expirado.');
});

test('protected route: tampered token is rejected', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  t.after(() => deleteTestAdmin(admin.id));

  const validToken = jwt.sign(
    { id: admin.id, role: 'admin', name: admin.name, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  const tamperedToken = validToken.slice(0, -1) + (validToken.endsWith('a') ? 'b' : 'a');

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tamperedToken}` },
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.error, 'Token inválido o expirado.');
});

test('protected route: valid token is accepted', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const admin = await createTestAdmin();
  t.after(() => deleteTestAdmin(admin.id));

  const validToken = jwt.sign(
    { id: admin.id, role: 'admin', name: admin.name, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.user.email, admin.email);
});
