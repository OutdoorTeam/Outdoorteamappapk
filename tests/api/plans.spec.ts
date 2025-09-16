import request from 'supertest';
import { startServer } from '../../server/index.js';

describe('Plans API', () => {
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

  test('GET /api/plans responds 401 without token', async () => {
    const response = await request(server).get('/api/plans');
    expect(response.status).toBe(401);
  });
});
