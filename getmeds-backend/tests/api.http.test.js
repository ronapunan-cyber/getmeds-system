/**
 * Controller-level API tests: real HTTP requests against the actual Express
 * app (routes + middleware + controllers all wired together), as opposed to
 * the other test files which call controller functions directly with
 * hand-built req/res objects. This is what was missing per the project's
 * "known limitations" — auth, RBAC enforcement, and full request/response
 * shapes are only genuinely covered when exercised over real HTTP.
 *
 * Covers: health check, login (success/failure), 401 with no token, 403 for
 * wrong role, and full HTTP walk-throughs of Scenario 1 (Fast-Track credit),
 * Scenario 2 (Gatekeeper direct), and Scenario 3 (Exception/Hold) — the same
 * three demo scenarios verified earlier, now proven over the real HTTP layer
 * instead of just by reading the code.
 */
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db/database');

const SEED_PASSWORD = 'demo123';

async function loginAs(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: SEED_PASSWORD });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.data.token;
}

describe('HTTP API — health, auth, RBAC', () => {
  test('GET /api/health is public and returns success', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/auth/login: wrong password returns 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'medrep@getmeds.ph', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('POST /api/auth/login: missing password returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'medrep@getmeds.ph' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /api/auth/login: correct seeded credentials return a usable JWT', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'medrep@getmeds.ph', password: SEED_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.role).toBe('medrep');
  });

  test('GET /api/orders with no Authorization header: 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('GET /api/orders with a garbage token: 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/orders').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  test('RBAC: a medrep token is forbidden from GET /api/admin/users (403)', async () => {
    const token = await loginAs('medrep@getmeds.ph');
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('RBAC: a medrep token is forbidden from GET /api/finance/queue (403)', async () => {
    const token = await loginAs('medrep@getmeds.ph');
    const res = await request(app).get('/api/finance/queue').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('RBAC: a dispatch token is forbidden from POST /api/finance/orders/:id/verify-payment (403)', async () => {
    const token = await loginAs('dispatch@getmeds.ph');
    const res = await request(app)
      .post('/api/finance/orders/999999/verify-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'verified' });
    expect(res.status).toBe(403);
  });

  test('an admin token IS allowed into GET /api/admin/users (200)', async () => {
    const token = await loginAs('admin@getmeds.ph');
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('HTTP API — full scenario walk-throughs', () => {
  let creditCustomerId;
  let directCustomerId;
  let productId;
  const createdOrderIds = [];

  let medrepToken, financeToken, dispatchToken, managementToken;

  beforeAll(async () => {
    creditCustomerId = db.prepare(
      `INSERT INTO customers (name, type, credit_limit, is_active) VALUES (?, 'credit', 100000, 1)`
    ).run('HTTP-TEST Credit Customer').lastInsertRowid;
    directCustomerId = db.prepare(
      `INSERT INTO customers (name, type, credit_limit, is_active) VALUES (?, 'direct', 0, 1)`
    ).run('HTTP-TEST Direct Customer').lastInsertRowid;
    productId = db.prepare(
      `INSERT INTO products (name, sku, unit_price, unit, stock, is_active) VALUES (?, ?, ?, 'tab', 500, 1)`
    ).run('HTTP-TEST Product', 'HTTPTEST-SKU-001', 15).lastInsertRowid;

    medrepToken = await loginAs('medrep@getmeds.ph');
    financeToken = await loginAs('finance@getmeds.ph');
    dispatchToken = await loginAs('dispatch@getmeds.ph');
    managementToken = await loginAs('manager@getmeds.ph');
  });

  afterAll(() => {
    for (const id of createdOrderIds) {
      db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    }
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    db.prepare('DELETE FROM customers WHERE id IN (?, ?)').run(creditCustomerId, directCustomerId);
  });

  test('Scenario 1 (Fast-Track credit): MedRep submits -> Ready for Dispatch -> Dispatch fulfils -> Completed with tracking', async () => {
    // 1. MedRep submits a credit-customer order via the digital form
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${medrepToken}`)
      .send({
        customer_id: creditCustomerId,
        items: [{ product_id: productId, quantity: 3 }],
        delivery_address: '1 HTTP Test St, Manila'
      });
    expect(createRes.status).toBe(201);
    const order = createRes.body.data.order;
    createdOrderIds.push(order.id);

    // 2. System auto-generates a unique GetMeds Order ID and skips Waiting for Payment
    expect(order.getmeds_order_id).toMatch(/^GM-\d{8}-\d{4}$/);
    expect(order.status).toBe('ready_for_dispatch');
    expect(order.zoho_sync_status).toBe('synced');

    // 3. Dispatch sees it in the queue
    const queueRes = await request(app).get('/api/dispatch/queue').set('Authorization', `Bearer ${dispatchToken}`);
    expect(queueRes.status).toBe(200);
    expect(queueRes.body.data.orders.some((o) => o.id === order.id)).toBe(true);

    // 4. Dispatch progresses it through picking -> packing -> dispatched -> tracking
    await request(app).post(`/api/dispatch/orders/${order.id}/update-status`).set('Authorization', `Bearer ${dispatchToken}`).send({ status: 'picking' }).expect(200);
    await request(app).post(`/api/dispatch/orders/${order.id}/update-status`).set('Authorization', `Bearer ${dispatchToken}`).send({ status: 'packing' }).expect(200);
    const dispatchedRes = await request(app).post(`/api/dispatch/orders/${order.id}/update-status`).set('Authorization', `Bearer ${dispatchToken}`).send({ status: 'dispatched' });
    expect(dispatchedRes.status).toBe(200);
    expect(dispatchedRes.body.data.order.status).toBe('dispatched');

    const trackingRes = await request(app)
      .post(`/api/dispatch/orders/${order.id}/tracking`)
      .set('Authorization', `Bearer ${dispatchToken}`)
      .send({ courier: 'LBC Express', tracking_number: 'LBC123456789' });
    expect(trackingRes.status).toBe(200);
    expect(trackingRes.body.data.order.status).toBe('completed');

    // 5. MedRep's own view of the order reflects tracking + completion
    const orderDetailRes = await request(app).get(`/api/orders/${order.id}`).set('Authorization', `Bearer ${medrepToken}`);
    expect(orderDetailRes.status).toBe(200);
    expect(orderDetailRes.body.data.order.status).toBe('completed');
    expect(orderDetailRes.body.data.dispatch.tracking_number).toBe('LBC123456789');
  });

  test('Scenario 2 (Gatekeeper direct): waits for Finance, invisible to Dispatch until payment verified', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${medrepToken}`)
      .send({
        customer_id: directCustomerId,
        items: [{ product_id: productId, quantity: 1 }],
        delivery_address: '2 HTTP Test St, Manila'
      });
    expect(createRes.status).toBe(201);
    const order = createRes.body.data.order;
    createdOrderIds.push(order.id);
    expect(order.status).toBe('waiting_for_payment');

    // Not visible to Dispatch yet
    const dispatchQueueBefore = await request(app).get('/api/dispatch/queue').set('Authorization', `Bearer ${dispatchToken}`);
    expect(dispatchQueueBefore.body.data.orders.some((o) => o.id === order.id)).toBe(false);

    // Visible to Finance
    const financeQueueRes = await request(app).get('/api/finance/queue').set('Authorization', `Bearer ${financeToken}`);
    expect(financeQueueRes.status).toBe(200);
    expect(financeQueueRes.body.data.orders.some((o) => o.id === order.id)).toBe(true);

    // Finance approves payment
    const verifyRes = await request(app)
      .post(`/api/finance/orders/${order.id}/verify-payment`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ status: 'verified', payment_reference: 'GCASH-REF-001', amount: order.total_amount });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.order.status).toBe('ready_for_dispatch');

    // Now visible to Dispatch
    const dispatchQueueAfter = await request(app).get('/api/dispatch/queue').set('Authorization', `Bearer ${dispatchToken}`);
    expect(dispatchQueueAfter.body.data.orders.some((o) => o.id === order.id)).toBe(true);
  });

  test('Scenario 3 (Exception/Hold): Finance rejects payment, order goes on_hold with a full audit entry', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${medrepToken}`)
      .send({
        customer_id: directCustomerId,
        items: [{ product_id: productId, quantity: 1 }],
        delivery_address: '3 HTTP Test St, Manila'
      });
    const order = createRes.body.data.order;
    createdOrderIds.push(order.id);

    const rejectRes = await request(app)
      .post(`/api/finance/orders/${order.id}/verify-payment`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ status: 'rejected', notes: 'Payment reference could not be matched' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.order.status).toBe('on_hold');

    // Audit trail: actor, timestamp, and reason are all captured
    const eventsRes = await request(app).get(`/api/orders/${order.id}/events`).set('Authorization', `Bearer ${managementToken}`);
    expect(eventsRes.status).toBe(200);
    const rejectionEvent = eventsRes.body.data.events.find((e) => e.event_type === 'PAYMENT_REJECTED');
    expect(rejectionEvent).toBeDefined();
    expect(rejectionEvent.actor_name).toBe('Rosa Reyes'); // the seeded finance user
    expect(rejectionEvent.new_status).toBe('on_hold');
    expect(rejectionEvent.notes).toContain('could not be matched');
    expect(rejectionEvent.created_at).toEqual(expect.any(String));

    // MedRep sees the order is on_hold in their own list
    const myOrdersRes = await request(app).get('/api/orders').set('Authorization', `Bearer ${medrepToken}`);
    const mine = myOrdersRes.body.data.orders.find((o) => o.id === order.id);
    expect(mine.status).toBe('on_hold');
  });
});
