import request from 'supertest';
import { startServer } from '../../server/index.js';
import { rateLimiter } from '../../server/middleware/rate-limiter.js';

const loginPayload = { email: 'nonexistent@example.com', password: 'wrong-password' };

describe('Rate limiting', () => {
  let server: any;

  beforeAll(async () => {
    server = await startServer(0);
  });

  afterAll(async () => {
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    rateLimiter.resetAll();
  });

  test('POST /api/auth/login enforces login rate limiting after repeated failures', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await request(server)
        .post('/api/auth/login')
        .send(loginPayload);

      expect(response.status).not.toBe(429);
    }

    const limitedResponse = await request(server)
      .post('/api/auth/login')
      .send(loginPayload);

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body?.error?.code).toBe('RATE_LIMIT_ERROR');
  });

  test('GET /api/plans throttles excessive anonymous requests', async () => {
    let limited = false;

    for (let attempt = 0; attempt < 40; attempt++) {
      const response = await request(server).get('/api/plans');

      if (attempt < 5) {
        expect(response.status).not.toBe(429);
      }

      if (response.status === 429) {
        limited = true;
        expect(response.body?.error?.code).toBe('RATE_LIMIT_ERROR');
        break;
      }
    }

    expect(limited).toBe(true);
  });
});
