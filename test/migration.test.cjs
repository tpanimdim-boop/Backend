const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

test('checkout migration only creates additive linked tables with unique checkout keys', () => {
  const sql = readFileSync('sql/create-customer-orders.sql', 'utf8');
  assert.equal(/\b(DROP|TRUNCATE|DELETE|ALTER)\b/i.test(sql), false);
  for (const table of ['customers', 'orders', 'order_items'])
    assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS \`${table}\``));
  assert.match(sql, /UNIQUE KEY `uq_customers_user` \(`user_id`\)/);
  assert.match(sql, /UNIQUE KEY `uq_orders_checkout` \(`customer_id`, `checkout_key`\)/);
  assert.ok(sql.includes('REFERENCES `users` (`id`)'));
  assert.ok(sql.includes("DEFAULT 'simulated'"));
});
