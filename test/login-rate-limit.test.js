const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('./helpers/testApp');

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
