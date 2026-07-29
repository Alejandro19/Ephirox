const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp } = require('./helpers/testApp');

test('GET /health responds 200 with status ok', async (t) => {
  const { baseUrl, close } = await startTestApp();
  t.after(close);

  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
});
