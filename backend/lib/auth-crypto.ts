import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-verireview-2026';

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: string;
  iat: number; // Issued at
  exp: number; // Expires at
}

// Password Hashing using crypto.pbkdf2Sync
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(hash, 'hex'));
}

// Base64URL encoding/decoding helper
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

// Generate signed JWT
export function generateJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresInSeconds: number = 3600): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Verify JWT signature & expiration
export function verifyJWT(token: string): { valid: boolean; payload?: JWTPayload; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid token structure' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // Verify Signature
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid token signature' };
  }

  try {
    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token has expired' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Malformed token payload' };
  }
}

// Generate 6-digit numeric verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate opaque refresh token
export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
