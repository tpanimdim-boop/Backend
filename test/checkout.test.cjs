const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  checkoutSchema,
  priceInCents,
} = require('../dist/src/shop/checkout.schema.js');
const { CheckoutService } = require('../dist/src/shop/checkout.service.js');

const body = () => ({
  checkout_key: '102a25f4-14df-480a-af2a-b6b739f9c715',
  customer: {
    first_name: 'Ana',
    last_name: 'Cruz',
    email: 'ana@example.com',
    phone: '09171234567',
    address: '',
  },
  fulfillment: 'pickup',
  notes: '',
  payment_method: 'mock',
  items: [{ flower_id: 1, quantity: 2 }],
});

test('checkout rejects injected prices, invalid quantities, duplicate IDs, and missing delivery address', () => {
  assert.equal(checkoutSchema.safeParse(body()).success, true);
  assert.equal(
    checkoutSchema.safeParse({ ...body(), total_amount: 1 }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({
      ...body(),
      items: [{ flower_id: 1, quantity: 0 }],
    }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({
      ...body(),
      items: [{ flower_id: 1, quantity: 100 }],
    }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({
      ...body(),
      items: [...body().items, ...body().items],
    }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({ ...body(), fulfillment: 'delivery' }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({
      ...body(),
      customer: { ...body().customer, user_id: 8 },
    }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({ ...body(), payment_method: 'card' }).success,
    false,
  );
});

test('prices use integer centavos without float drift', () => {
  assert.equal(priceInCents('135.25'), 13525);
  assert.equal(priceInCents('0.10') * 3, 30);
  assert.throws(() => priceInCents('-1.00'));
  assert.throws(() => priceInCents('1.001'));
});

function fixture({
  stock = 5,
  existing = false,
  failItems = false,
  changed = false,
  missing = false,
} = {}) {
  const calls = [];
  let savedHash;
  const order = {
    order_id: 9,
    customer_id: 3,
    order_date: new Date('2026-11-10T10:00:00Z'),
    total_amount: '240.00',
    status: 'pending',
    fulfillment: 'pickup',
    recipient_name: 'Ana Cruz',
    email: 'ana@example.com',
    phone: '09171234567',
    delivery_address: null,
    notes: '',
    payment_method: 'mock',
    payment_status: 'simulated',
  };
  const query = async (sql, params = []) => {
    calls.push({ sql, params });
    if (sql.includes('FROM users')) return [{ id: 7 }];
    if (sql.includes('checkout_key ='))
      return existing
        ? [{ order_id: 9, request_hash: changed ? 'different' : savedHash }]
        : [];
    if (sql.includes('FROM flowers'))
      return missing
        ? []
        : [
            {
              flower_id: 1,
              flower_name: 'Red Rose',
              color: 'red',
              price: '120.00',
              stock_quantity: stock,
            },
          ];
    if (sql.includes('INSERT INTO customers')) return { insertId: 3 };
    if (sql.includes('FROM customers')) return [{ customer_id: 3 }];
    if (sql.includes('INSERT INTO orders')) {
      savedHash = params[2];
      return { insertId: 9 };
    }
    if (sql.includes('INSERT INTO order_items')) {
      if (failItems) throw new Error('write failed');
      return { insertId: 1 };
    }
    if (sql.includes('UPDATE flowers')) return { affectedRows: 1 };
    if (sql.includes('FROM orders')) return [order];
    if (sql.includes('FROM order_items'))
      return [
        {
          order_item_id: 1,
          order_id: 9,
          flower_id: 1,
          flower_name: 'Red Rose',
          color: 'red',
          quantity: 2,
          unit_price: '120.00',
        },
      ];
    throw new Error(`Unexpected query: ${sql}`);
  };
  const runner = {
    connect: async () => calls.push('connect'),
    startTransaction: async () => calls.push('begin'),
    commitTransaction: async () => calls.push('commit'),
    rollbackTransaction: async () => calls.push('rollback'),
    release: async () => calls.push('release'),
    query,
  };
  const service = new CheckoutService({
    createQueryRunner: () => runner,
    query,
  });
  return {
    service,
    calls,
    setHash: (hash) => {
      savedHash = hash;
    },
  };
}

test('checkout locks stock, prices from database, and commits all writes', async () => {
  const { service, calls } = fixture();
  const order = await service.checkout(7, body());
  assert.equal(order.total_amount, '240.00');
  assert.equal(order.payment_status, 'simulated');
  assert.equal(order.items[0].unit_price, '120.00');
  assert.ok(
    calls.some(
      (call) =>
        call.sql?.includes('FOR UPDATE') && call.sql.includes('FROM flowers'),
    ),
  );
  assert.ok(
    calls.some(
      (call) => call.sql?.includes('UPDATE flowers') && call.params[0] === 2,
    ),
  );
  assert.ok(calls.includes('commit'));
  assert.equal(calls.includes('rollback'), false);
  assert.equal(calls.at(-1), 'release');
});

test('checkout rejects insufficient or missing stock and rolls back', async () => {
  for (const options of [{ stock: 1 }, { missing: true }]) {
    const { service, calls } = fixture(options);
    await assert.rejects(
      service.checkout(7, body()),
      (error) => error.getStatus() === 409,
    );
    assert.ok(calls.includes('rollback'));
    assert.equal(calls.includes('commit'), false);
    assert.equal(
      calls.some((call) => call.sql?.includes('INSERT INTO orders')),
      false,
    );
    assert.equal(calls.at(-1), 'release');
  }
});

test('a failed item write rolls back the entire checkout', async () => {
  const { service, calls } = fixture({ failItems: true });
  await assert.rejects(service.checkout(7, body()));
  assert.ok(calls.includes('rollback'));
  assert.equal(calls.includes('commit'), false);
  assert.equal(calls.at(-1), 'release');
});

test('matching retries return existing orders without decrementing stock', async () => {
  const { createHash } = require('node:crypto');
  const data = checkoutSchema.parse(body());
  const { service, calls, setHash } = fixture({ existing: true });
  setHash(createHash('sha256').update(JSON.stringify(data)).digest('hex'));
  const order = await service.checkout(7, body());
  assert.equal(order.order_id, 9);
  assert.equal(
    calls.some((call) => call.sql?.includes('UPDATE flowers')),
    false,
  );
  assert.equal(
    calls.some((call) => call.sql?.includes('INSERT INTO orders')),
    false,
  );
});

test('a checkout key cannot be reused with a changed payload', async () => {
  const { service, calls } = fixture({ existing: true, changed: true });
  await assert.rejects(
    service.checkout(7, body()),
    (error) => error.getStatus() === 409,
  );
  assert.ok(calls.includes('rollback'));
});

test('order history scopes every order query to the authenticated user', async () => {
  const { service, calls } = fixture();
  await service.myOrders(7);
  await service.myOrder(7, 9);
  const orderQueries = calls.filter((call) =>
    call.sql?.includes('FROM orders'),
  );
  assert.equal(orderQueries.length, 2);
  assert.ok(
    orderQueries.every(
      (call) => call.sql.includes('user_id = ?') && call.params.includes(7),
    ),
  );
});

test('another user cannot read an order by guessing its ID', async () => {
  const service = new CheckoutService({ query: async () => [] });
  await assert.rejects(
    service.myOrder(8, 9),
    (error) => error.getStatus() === 404,
  );
});
