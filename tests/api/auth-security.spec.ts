import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startServer } from '../../server/index.js';

const decodeToken = (token: string) => {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid JWT structure');
  }
  return decoded;
};

describe.sequential('Authentication token security', () => {
  let server: any;

  beforeAll(async () => {
    server = await startServer(0);
  });

  afterAll(async () => {
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('register and login issue short-lived HS256 tokens', async () => {
    const email = `security-${Date.now()}@example.com`;
    const password = 'Password123!';

    const registerResponse = await request(server)
      .post('/api/auth/register')
      .send({
        full_name: 'Security Test',
        email,
        password,
        confirmPassword: password,
        acceptTos: true
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.token).toBeDefined();

    const loginResponse = await request(server)
      .post('/api/auth/login')
      .send({ email, password });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    for (const token of [registerResponse.body.token, loginResponse.body.token]) {
      const decoded = decodeToken(token);
      const { alg } = decoded.header as { alg: string };
      const { exp, iat } = decoded.payload as { exp: number; iat: number };

      expect(alg).toBe('HS256');
      expect(typeof exp).toBe('number');
      expect(typeof iat).toBe('number');
      expect(exp).toBeGreaterThan(iat);

      const ttlSeconds = exp - iat;
      expect(ttlSeconds).toBeGreaterThan(0);
      expect(ttlSeconds).toBeLessThanOrEqual(15 * 60);
    }
  });
});
