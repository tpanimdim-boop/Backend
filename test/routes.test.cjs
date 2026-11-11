require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const jwt = require('jsonwebtoken');
const { ShopController } = require('../dist/src/shop/shop.controller.js');
const {
  CheckoutController,
} = require('../dist/src/shop/checkout.controller.js');
const {
  FlowershopController,
} = require('../dist/src/flower/flowershop.controller.js');
const { UsersController } = require('../dist/src/users/users.controller.js');
const { ShopService } = require('../dist/src/shop/shop.service.js');
const { CheckoutService } = require('../dist/src/shop/checkout.service.js');
const {
  FlowershopService,
} = require('../dist/src/flower/flowershop.service.js');
const { UsersService } = require('../dist/src/users/users.service.js');
const { JwtStrategy } = require('../dist/src/auth/jwt-strategy.js');
const { AuthController } = require('../dist/src/auth/auth.controller.js');
const { AuthService } = require('../dist/src/auth/auth.service.js');

let app;
let base;
let role = 'user';
let writes = 0;
const loggedOut = [];
before(async () => {
  class RoutesModule {}
  Module({
    controllers: [
      CheckoutController,
      ShopController,
      FlowershopController,
      UsersController,
      AuthController,
    ],
    providers: [
      JwtStrategy,
      {
        provide: AuthService,
        useValue: {
          logout: async (id) => {
            loggedOut.push(id);
            return { ok: true };
          },
        },
      },
      {
        provide: UsersService,
        useValue: {
          findById: async () => ({ id: 7, username: 'ana', role }),
          updateUser: async () => {
            writes++;
            return {};
          },
        },
      },
      {
        provide: ShopService,
        useValue: {
          findAll: async () => [],
          findOne: async () => ({}),
          update: async () => {
            writes++;
            return {};
          },
        },
      },
      {
        provide: CheckoutService,
        useValue: {
          myOrders: async (id) => [{ owner: id }],
          myOrder: async (user, id) => ({ owner: user, order_id: id }),
          checkout: async () => ({ order_id: 1 }),
        },
      },
      {
        provide: FlowershopService,
        useValue: {
          findAllCategories: async () => [],
          createCategory: async () => {
            writes++;
            return {};
          },
        },
      },
    ],
  })(RoutesModule);
  app = await NestFactory.create(RoutesModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => {
  if (app) await app.close();
});

async function request(path, method = 'GET', body) {
  const token = jwt.sign(
    { sub: 7, username: 'ana', role: 'admin' },
    process.env.JWT_ACCESS_TOKEN_SECRET || 'access_secret',
    { expiresIn: '5m' },
  );
  return fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('fixed checkout and history routes are not swallowed by generic resource routes', async () => {
  assert.deepEqual(await (await request('/shop/my-orders')).json(), [
    { owner: 7 },
  ]);
  assert.deepEqual(await (await request('/shop/my-orders/9')).json(), {
    owner: 7,
    order_id: 9,
  });
  assert.equal((await request('/shop/checkout', 'POST', {})).status, 201);
});

test('HTTP routes block customer privilege escalation and management writes', async () => {
  writes = 0;
  assert.equal(
    (await request('/users/7', 'PUT', { role: 'admin' })).status,
    403,
  );
  assert.equal(
    (await request('/categories', 'POST', { category_name: 'X' })).status,
    403,
  );
  assert.equal(
    (await request('/shop/flowers/1', 'PUT', { stock_quantity: 500 })).status,
    403,
  );
  assert.equal((await request('/shop/orders')).status, 403);
  assert.equal(writes, 0);
  assert.equal((await request('/shop/flowers')).status, 200);
  assert.equal((await request('/categories')).status, 200);
});

test('current database staff role enables inventory writes', async () => {
  role = 'staff';
  assert.equal(
    (await request('/shop/flowers/1', 'PUT', { stock_quantity: 5 })).status,
    200,
  );
  role = 'user';
});

test('logout verifies the token and never trusts a client user ID', async () => {
  assert.equal(
    (
      await fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
    ).status,
    401,
  );
  assert.equal(
    (await request('/auth/logout', 'POST', { userId: 8 })).status,
    400,
  );
  assert.equal((await request('/auth/logout', 'POST', {})).status, 201);
  assert.deepEqual(loggedOut, [7]);
});
