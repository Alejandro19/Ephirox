const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers/setupTestEnv');

test('server refuses to start when JWT_SECRET is not set', () => {
  const serverPath = require.resolve('../server');
  delete require.cache[serverPath];
  const originalSecret = process.env.JWT_SECRET;
  // Set to '' rather than delete: dotenv only populates a key that is NOT
  // already an own property of process.env. Deleting the key lets a real
  // local .env file (present on any normal dev machine) silently repopulate
  // JWT_SECRET on re-require, masking the "unset" condition this test needs.
  process.env.JWT_SECRET = '';

  try {
    assert.throws(() => require('../server'), /JWT_SECRET/);
  } finally {
    process.env.JWT_SECRET = originalSecret;
    delete require.cache[serverPath];
  }
});
