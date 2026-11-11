const { test } = require('node:test');
const assert = require('node:assert/strict');

test('JWT signing and verification require configured secrets', () => {
  const { jwtSecret } = require('../dist/src/auth/auth.config.js');
  assert.throws(
    () => jwtSecret('JWT_ACCESS_TOKEN_SECRET', {}),
    /JWT_ACCESS_TOKEN_SECRET/,
  );
  assert.throws(
    () => jwtSecret('JWT_REFRESH_TOKEN_SECRET', {}),
    /JWT_REFRESH_TOKEN_SECRET/,
  );
  assert.equal(
    jwtSecret('JWT_ACCESS_TOKEN_SECRET', {
      JWT_ACCESS_TOKEN_SECRET: 'test-only-secret',
    }),
    'test-only-secret',
  );
});
