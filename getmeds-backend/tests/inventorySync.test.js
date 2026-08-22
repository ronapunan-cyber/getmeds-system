const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db/database');
const MockZohoAdapter = require('../src/integrations/zoho/MockZohoAdapter');

describe('Inventory & Stock Synchronization API', () => {
  let adminToken;
  let medrepToken;

  beforeAll(async () => {
    const adminRes = await request(app).post('/api/auth/login').send({ email: 'admin@getmeds.ph', password: 'demo123' });
    adminToken = adminRes.body.data.token;

    const medrepRes = await request(app).post('/api/auth/login').send({ email: 'medrep@getmeds.ph', password: 'demo123' });
    medrepToken = medrepRes.body.data.token;
  });

  test('GET /api/inventory/status returns status and product comparison', async () => {
    const res = await request(app)
      .get('/api/inventory/status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('products');
    expect(res.body.data).toHaveProperty('summary');
    expect(Array.isArray(res.body.data.products)).toBe(true);
  });

  test('POST /api/inventory/sync-push seeds catalog to Zoho', async () => {
    const res = await request(app)
      .post('/api/inventory/sync-push')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results.length).toBeGreaterThan(0);
  });

  test('POST /api/inventory/sync-pull pulls stock from Zoho', async () => {
    const res = await request(app)
      .post('/api/inventory/sync-pull')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/inventory/adjust adjusts stock level and reflects locally', async () => {
    const product = db.prepare('SELECT * FROM products LIMIT 1').get();
    const initialStock = product.stock;

    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        product_id: product.id,
        delta: 10,
        reason: 'Restock batch #101'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.new_stock).toBe(initialStock + 10);

    const updated = db.prepare('SELECT stock FROM products WHERE id = ?').get(product.id);
    expect(updated.stock).toBe(initialStock + 10);
  });

  test('RBAC: MedRep cannot call admin inventory mutation endpoints', async () => {
    const res = await request(app)
      .post('/api/inventory/sync-push')
      .set('Authorization', `Bearer ${medrepToken}`);

    expect(res.status).toBe(403);
  });
});
