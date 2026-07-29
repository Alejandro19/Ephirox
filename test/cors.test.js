const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('./helpers/testApp');

test('CORS: allows the production origin', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://latribu-oficial.vercel.app' },
  });

  assert.equal(res.headers.get('access-control-allow-origin'), 'https://latribu-oficial.vercel.app');
});

test('CORS: allows localhost for local development', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'http://localhost:3001' },
  });

  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3001');
});

test('CORS: does not reflect an unknown origin', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://evil-example.com' },
  });

  assert.equal(res.headers.get('access-control-allow-origin'), null);
});
