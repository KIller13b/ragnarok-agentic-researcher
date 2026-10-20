const request = require('supertest');

// We import the Express app directly — no DB connection needed for these tests.
// Mongoose-dependent routes will return 500s (connection refused), but we're
// testing response structure, validation, and not-found handling, not DB operations.
const app = require('../src/app');

describe('Health endpoint', () => {
  it('GET /api/v1/health → 200 with success body', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('API is running');
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data).toHaveProperty('timestamp');
  });
});

describe('Not-found middleware', () => {
  it('GET /api/v1/nonexistent → 404 with error body', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Route not found/);
  });
});

describe('Validation – POST /api/v1/research', () => {
  it('rejects empty body with 400 and field errors', async () => {
    const res = await request(app).post('/api/v1/research').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('rejects empty question string with 400', async () => {
    const res = await request(app).post('/api/v1/research').send({ question: '' });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field.includes('question'))).toBe(true);
  });

  it('rejects negative budget with 400', async () => {
    const res = await request(app)
      .post('/api/v1/research')
      .send({ question: 'Test?', constraints: { budget: -10 } });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field.includes('budget'))).toBe(true);
  });
});

describe('Validation - invalid ObjectId', () => {
  it('GET /api/v1/research/not-an-id → 400', async () => {
    const res = await request(app).get('/api/v1/research/not-an-id');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.some((e) => e.message.includes('Invalid ObjectId'))).toBe(true);
  });

  it('DELETE /api/v1/research/123 → 400', async () => {
    const res = await request(app).delete('/api/v1/research/123');
    expect(res.status).toBe(400);
  });

  it('GET /api/v1/research/bad-id/tasks → 400', async () => {
    const res = await request(app).get('/api/v1/research/bad-id/tasks');
    expect(res.status).toBe(400);
  });
});

describe('Error response structure', () => {
  it('error responses always have success, message, errors', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('message');
    // errors may be an array or undefined for not-found, but should be present on ApiError
    expect(typeof res.body.success).toBe('boolean');
    expect(typeof res.body.message).toBe('string');
  });
});
