const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  StaffGuard,
  ShopAccessGuard,
} = require('../dist/src/auth/shop-access.guard.js');
const { JwtStrategy } = require('../dist/src/auth/jwt-strategy.js');

const context = (role, method = 'GET', resource = 'flowers') => ({
  switchToHttp: () => ({
    getRequest: () => ({
      user: { userId: 7, username: 'ana', role },
      method,
      params: { resource },
    }),
  }),
});

test('customers browse flowers but cannot read private CRUD resources or change stock', () => {
  const guard = new ShopAccessGuard();
  assert.equal(guard.canActivate(context('user')), true);
  for (const [method, resource] of [
    ['GET', 'orders'],
    ['GET', 'customers'],
    ['POST', 'flowers'],
    ['PUT', 'flowers'],
    ['DELETE', 'flowers'],
  ]) {
    assert.throws(
      () => guard.canActivate(context('user', method, resource)),
      (error) => error.getStatus() === 403,
    );
  }
});

test('staff manages flowers but cannot bypass transactional checkout', () => {
  const guard = new ShopAccessGuard();
  assert.equal(guard.canActivate(context('staff', 'PUT')), true);
  for (const resource of ['orders', 'order-items', 'payments', 'deliveries']) {
    assert.throws(
      () => guard.canActivate(context('admin', 'POST', resource)),
      (error) => error.getStatus() === 403,
    );
  }
});

test('staff guard rejects customers and accepts explicit staff roles', () => {
  const guard = new StaffGuard();
  assert.throws(
    () => guard.canActivate(context('user')),
    (error) => error.getStatus() === 403,
  );
  for (const role of ['staff', 'admin', 'owner'])
    assert.equal(guard.canActivate(context(role)), true);
});

test('JWT validation uses current database roles and rejects deleted accounts', async () => {
  const strategy = new JwtStrategy({
    findById: async () => ({ id: 7, username: 'ana', role: 'user' }),
  });
  assert.deepEqual(
    await strategy.validate({ sub: 7, username: 'ana', role: 'admin' }),
    { userId: 7, username: 'ana', role: 'user' },
  );
  const deleted = new JwtStrategy({ findById: async () => undefined });
  await assert.rejects(
    deleted.validate({ sub: 7, username: 'ana', role: 'user' }),
    (error) => error.getStatus() === 401,
  );
});
