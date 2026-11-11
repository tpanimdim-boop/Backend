require('reflect-metadata');
require('dotenv').config({ quiet: true });
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { DataSource } = require('typeorm');
const { databaseOptions } = require('../dist/src/database/database.config.js');
const { CheckoutService } = require('../dist/src/shop/checkout.service.js');

let db;
let service;
const users = [];
const flowers = [];
before(async () => {
  db = await new DataSource({
    type: 'mysql',
    ...databaseOptions(),
    entities: [],
    synchronize: false,
  }).initialize();
  service = new CheckoutService(db);
  const references = await db.query(
    'SELECT category_id, supplier_id FROM flowers ORDER BY flower_id LIMIT 1',
  );
  assert.ok(references.length, 'Seeded flower references must exist');
  for (let index = 0; index < 2; index++) {
    const user = await db.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [`checkout-test-${randomUUID()}`, 'disabled-test-login', 'user'],
    );
    users.push(user.insertId);
    const flower = await db.query(
      'INSERT INTO flowers (category_id, supplier_id, flower_name, price, stock_quantity) VALUES (?, ?, ?, ?, ?)',
      [
        references[0].category_id,
        references[0].supplier_id,
        `Checkout test ${index}`,
        '135.25',
        index === 0 ? 1 : 5,
      ],
    );
    flowers.push(flower.insertId);
  }
});

after(async () => {
  if (!db?.isInitialized) return;
  try {
    if (users.length) {
      const placeholders = users.map(() => '?').join(',');
      await db.query(
        `DELETE oi FROM order_items oi JOIN orders o ON o.order_id = oi.order_id JOIN customers c ON c.customer_id = o.customer_id WHERE c.user_id IN (${placeholders})`,
        users,
      );
      await db.query(
        `DELETE o FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE c.user_id IN (${placeholders})`,
        users,
      );
      await db.query(
        `DELETE FROM customers WHERE user_id IN (${placeholders})`,
        users,
      );
      await db.query(`DELETE FROM users WHERE id IN (${placeholders})`, users);
    }
    if (flowers.length)
      await db.query(
        `DELETE FROM flowers WHERE flower_id IN (${flowers.map(() => '?').join(',')})`,
        flowers,
      );
  } finally {
    await db.destroy();
  }
});

const payload = (flower, quantity = 1) => ({
  checkout_key: randomUUID(),
  customer: {
    first_name: 'Checkout',
    last_name: 'Test',
    email: 'checkout@example.com',
    phone: '09171234567',
    address: '',
  },
  fulfillment: 'pickup',
  notes: 'Automated integration test',
  payment_method: 'mock',
  items: [{ flower_id: flower, quantity }],
});

test('real MySQL concurrent checkout cannot oversell the last stem', async () => {
  const results = await Promise.allSettled([
    service.checkout(users[0], payload(flowers[0])),
    service.checkout(users[1], payload(flowers[0])),
  ]);
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  const rejected = results.find((result) => result.status === 'rejected');
  assert.equal(rejected.reason.getStatus(), 409);
  const [stock] = await db.query(
    'SELECT stock_quantity FROM flowers WHERE flower_id = ?',
    [flowers[0]],
  );
  assert.equal(stock.stock_quantity, 0);
});

test('real MySQL checkout stores exact prices, handles retries, and enforces ownership', async () => {
  const data = payload(flowers[1], 2);
  const order = await service.checkout(users[0], data);
  assert.equal(order.total_amount, '270.50');
  assert.equal(order.items[0].unit_price, '135.25');
  assert.equal(order.payment_status, 'simulated');
  const retried = await service.checkout(users[0], data);
  assert.equal(retried.order_id, order.order_id);
  const [stock] = await db.query(
    'SELECT stock_quantity FROM flowers WHERE flower_id = ?',
    [flowers[1]],
  );
  assert.equal(stock.stock_quantity, 3);
  await assert.rejects(
    service.checkout(users[0], { ...data, notes: 'Changed' }),
    (error) => error.getStatus() === 409,
  );
  await assert.rejects(
    service.myOrder(users[1], order.order_id),
    (error) => error.getStatus() === 404,
  );
  const mine = await service.myOrders(users[0]);
  assert.ok(mine.some((entry) => entry.order_id === order.order_id));
});

test('real MySQL failed checkout leaves stock and order count unchanged', async () => {
  const [before] = await db.query(
    'SELECT COUNT(*) AS count FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE c.user_id = ?',
    [users[0]],
  );
  const data = payload(flowers[1]);
  data.items.push({ flower_id: 2147483647, quantity: 1 });
  await assert.rejects(
    service.checkout(users[0], data),
    (error) => error.getStatus() === 409,
  );
  const [after] = await db.query(
    'SELECT COUNT(*) AS count FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE c.user_id = ?',
    [users[0]],
  );
  assert.equal(after.count, before.count);
  const [stock] = await db.query(
    'SELECT stock_quantity FROM flowers WHERE flower_id = ?',
    [flowers[1]],
  );
  assert.equal(stock.stock_quantity, 3);
});
