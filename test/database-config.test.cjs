const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

test('database configuration requires credentials without hardcoded fallbacks', () => {
  const {
    databaseOptions,
  } = require('../dist/src/database/database.config.js');
  assert.throws(() => databaseOptions({}), /DB_HOST/);
  assert.throws(
    () =>
      databaseOptions({
        DB_HOST: 'localhost',
        DB_PORT: '3306',
        DB_USER: 'demo',
        DB_NAME: 'shop',
      }),
    /DB_PASSWORD/,
  );
  const options = databaseOptions({
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USER: 'demo',
    DB_PASSWORD: 'test-only',
    DB_NAME: 'shop',
  });
  assert.equal(options.host, 'localhost');
  assert.equal(options.port, 3306);
  assert.equal(options.password, 'test-only');
});

test('production start runs the compiled source entry point', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(packageJson.scripts.start, 'node dist/src/main.js');
});
