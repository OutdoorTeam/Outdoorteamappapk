import { afterEach, beforeAll } from 'vitest';
import { rateLimiter } from '../server/middleware/rate-limiter.js';
import { resetJwtConfigCache } from '../server/config/security.js';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

if (!process.env.DISABLE_RATE_LIMIT) {
  process.env.DISABLE_RATE_LIMIT = 'false';
}

// Maintain compatibility with legacy flag if present
if (!process.env.DISABLE_RATE_LIMITING) {
  process.env.DISABLE_RATE_LIMITING = 'false';
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-secret-key-for-vitest-suite-0123456789abcdef';
}

if (!process.env.DATA_DIRECTORY) {
  process.env.DATA_DIRECTORY = './data';
}

beforeAll(() => {
  rateLimiter.resetAll();
});

afterEach(() => {
  rateLimiter.resetAll();
  resetJwtConfigCache();
});
