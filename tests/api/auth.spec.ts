import request from 'supertest';
import { startServer } from '../../server/index.js';

describe('Auth API', () => {
  let app: any;
  let server: any;

  beforeAll(async () => {
    app = await startServer(0);
    server = app;
  });

  afterAll(async () => {
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('POST /api/auth/login rejects invalid credentials', async () => {
    const response = await request(server)
      .post('/api/auth/login')
      .send({ email: 'fake@example.com', password: 'badpass' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body).toHaveProperty('error');
  });

  test('GET /api/auth/me requires authentication', async () => {
    const response = await request(server).get('/api/auth/me');

    expect(response.status).toBe(401);
  });
});
