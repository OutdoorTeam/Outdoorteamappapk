import type { Algorithm } from 'jsonwebtoken';

const MIN_SECRET_LENGTH_BYTES = 32;

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  algorithm: Algorithm;
}

type VapidConfig = {
  publicKey: string;
  privateKey: string;
  email: string;
};

let jwtConfigCache: JwtConfig | null = null;
let vapidWarningLogged = false;

const ensureSecret = (name: string, minLength = MIN_SECRET_LENGTH_BYTES): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  if (value.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters long`);
  }

  return value;
};

export const resetJwtConfigCache = () => {
  jwtConfigCache = null;
};

export const getJwtConfig = (): JwtConfig => {
  if (!jwtConfigCache) {
    const secret = ensureSecret('JWT_SECRET');
    const expiresIn = process.env.JWT_EXPIRATION ?? '15m';
    const algorithm: Algorithm = 'HS256';

    jwtConfigCache = { secret, expiresIn, algorithm };
  }

  return jwtConfigCache;
};

export const ensureJwtSecret = () => {
  getJwtConfig();
};

export const getVapidConfig = (): VapidConfig | null => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? 'admin@moutdoorteam.com';

  if (!publicKey || !privateKey) {
    return null;
  }

  if (publicKey.length < MIN_SECRET_LENGTH_BYTES || privateKey.length < MIN_SECRET_LENGTH_BYTES) {
    if (!vapidWarningLogged) {
      console.warn(
        'VAPID keys are configured but shorter than the minimum required length; push notifications remain disabled.'
      );
      vapidWarningLogged = true;
    }

    return null;
  }

  return {
    publicKey,
    privateKey,
    email
  };
};

export const isVapidConfigured = (): boolean => getVapidConfig() !== null;

export const MIN_SECRET_LENGTH = MIN_SECRET_LENGTH_BYTES;
