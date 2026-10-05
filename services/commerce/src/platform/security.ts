import { randomBytes, scrypt, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') };
}
export async function verifyPassword(password: string, salt: string, stored: string) {
  const actual = await derive(password, salt, 64) as Buffer;
  const expected = Buffer.from(stored, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const token = () => randomBytes(32).toString('base64url');
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return '{' + Object.keys(object).sort().map(k => JSON.stringify(k) + ':' + canonical(object[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}
