const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers/setupTestEnv');

test('server refuses to start when JWT_SECRET is not set', () => {
  const serverPath = require.resolve('../server');
  delete require.cache[serverPath];
  const originalSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;

  try {
    assert.throws(() => require('../server'), /JWT_SECRET/);
  } finally {
    process.env.JWT_SECRET = originalSecret;
    delete require.cache[serverPath];
  }
});
