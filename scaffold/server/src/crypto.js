// Crypto helpers: password hashing (scrypt), tokens, HMAC. No external deps.
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const check = scryptSync(password, salt, 64);
  const expect = Buffer.from(hash, 'hex');
  return check.length === expect.length && timingSafeEqual(check, expect);
}

export const newToken = () => randomBytes(32).toString('hex');
export const sha256 = (s) => createHmac('sha256', 't2l-hash').update(s).digest('hex');
export const hmacSign = (secret, payload) =>
  createHmac('sha256', secret).update(payload).digest('hex');
export const safeEqual = (a, b) => {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && timingSafeEqual(A, B);
};
