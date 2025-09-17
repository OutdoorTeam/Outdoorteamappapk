import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { getJwtConfig, resetJwtConfigCache } from '../../server/config/security.js';

const ORIGINAL_ENV = { ...process.env };

const restoreEnv = () => {
  if (ORIGINAL_ENV.JWT_SECRET === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = ORIGINAL_ENV.JWT_SECRET;
  }
};

describe('security config', () => {
  beforeEach(() => {
    resetJwtConfigCache();
  });

  afterEach(() => {
    restoreEnv();
    resetJwtConfigCache();
  });

  test('throws when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;

    expect(() => getJwtConfig()).toThrowError(/JWT_SECRET environment variable is required/);
  });

  test('throws when JWT_SECRET is too short', () => {
    process.env.JWT_SECRET = 'short-secret';

    expect(() => getJwtConfig()).toThrowError(/must be at least 32 characters/);
  });

  test('defaults to HS256 with 15m expiry when secret is strong', () => {
    process.env.JWT_SECRET = 'a'.repeat(48);

    const config = getJwtConfig();

    expect(config.algorithm).toBe('HS256');
    expect(config.expiresIn).toBe('15m');
    expect(config.secret).toHaveLength(48);
  });
});
