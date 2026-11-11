# Customer order contract

## Scope

Phase 1 adds authenticated flower details, a browser-only cart, mock checkout,
confirmation, and personal order history. Login styling and staff screens remain
separate work.

## Routes

- `POST /shop/checkout`: accepts the strict payload below. Returns an order with
  item snapshots. Uses the authenticated `userId`, never a client customer ID.
- `GET /shop/my-orders`: returns the signed-in user's orders, newest first.
- `GET /shop/my-orders/:id`: returns an owned order or `404`.

```json
{
  "checkout_key": "102a25f4-14df-480a-af2a-b6b739f9c715",
  "customer": {
    "first_name": "Ana",
    "last_name": "Cruz",
    "email": "ana@example.com",
    "phone": "09171234567",
    "address": ""
  },
  "fulfillment": "pickup",
  "notes": "",
  "payment_method": "mock",
  "items": [{ "flower_id": 1, "quantity": 2 }]
}
```

Delivery requires an address. No delivery fee applies in this demo. Checkout
accepts no prices, totals, payment status, user ID, or role. Maximum: 50 distinct
flowers and 99 units per flower. Duplicate flower IDs are rejected.

## Consistency and safety

- Create `customers`, `orders`, and `order_items` without altering existing data.
- `customers.user_id` uniquely references `users.id`.
- Lock the user and flower rows inside one InnoDB transaction.
- Calculate PHP totals in integer centavos from current database prices.
- Save contact and flower snapshots, then decrement stock. Roll back all writes
  on failure.
- A checkout UUID plus payload hash makes matching retries return the same order.
  Reusing a key with different input returns `409`.
- Mark payment `simulated`. Never request card details or contact a payment API.
- Keep generic management routes staff-only. Transaction records cannot be
  created, edited, or deleted through generic CRUD routes.
- Verify current user roles from the database, not browser claims.

## Frontend boundaries

Server Components load catalog, flower details, orders, and session display data.
Fetches use `no-store`. Client leaves own cart controls and checkout forms. Cart
storage is scoped to user ID and contains only flower IDs and quantities.
HttpOnly cookies stay behind the BFF. Mutations check origin and validate JSON.
Pages provide loading, empty, success, and error states. Existing theme tokens,
flower artwork, responsive layouts, and focus styles carry through.

## Verification

Write failing tests first for validation, cents arithmetic, rollback, stock
conflicts, idempotency, order ownership, and role enforcement. Run backend build
and tests plus frontend lint, typecheck, tests, and production build.
