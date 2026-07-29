const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('./helpers/testApp');
const { createTestClient, deleteTestClient } = require('./helpers/fixtures');

// NOTE: this test runs before "is rate limited after 10 attempts from the
// same IP" on purpose. Both hit the same default-IP bucket (127.0.0.1, no
// X-Forwarded-For), and the Express app module is require-cached across
// tests in this file, so its in-memory rate-limit store persists between
// them. skipSuccessfulRequests:true means every request below contributes
// zero to that bucket's count, so this ordering keeps both tests
// order-independent without touching either test body.
test('login: successful logins do not count toward the rate limit', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);
  const client = await createTestClient();
  t.after(() => deleteTestClient(client.id));

  const attempt = () => fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: client.email, password: client.password }),
  });

  for (let i = 0; i < 12; i++) {
    const res = await attempt();
    assert.equal(res.status, 200, `expected attempt ${i + 1} to succeed, got ${res.status}`);
  }
});

test('login: is rate limited after 10 attempts from the same IP', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const attempt = () => fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@test.latribu.local', password: 'wrong' }),
  });

  const statuses = [];
  for (let i = 0; i < 11; i++) {
    const res = await attempt();
    statuses.push(res.status);
  }

  assert.ok(statuses.slice(0, 10).every((s) => s === 401), `expected first 10 attempts to be 401, got ${statuses}`);
  assert.equal(statuses[10], 429);
});

test('login: rate limit is scoped per client IP when behind a trusted proxy', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const attemptFrom = (ip) => fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ email: 'nobody@test.latribu.local', password: 'wrong' }),
  });

  for (let i = 0; i < 10; i++) {
    const res = await attemptFrom('1.1.1.1');
    assert.equal(res.status, 401, `expected attempt ${i + 1} from 1.1.1.1 to be 401, got ${res.status}`);
  }
  const eleventh = await attemptFrom('1.1.1.1');
  assert.equal(eleventh.status, 429);

  const fromDifferentIp = await attemptFrom('2.2.2.2');
  assert.equal(fromDifferentIp.status, 401, 'a different client IP must not be affected by the first IP\'s rate limit');
});
