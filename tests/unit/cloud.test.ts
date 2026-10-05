import { describe, expect, it } from 'vitest';
import { cloudConfig, assertCloudDatabaseUrl } from '../../services/commerce/src/platform/cloud.js';
import { guestEnvironmentKey, deriveGuestCodeWithKey } from '../../services/commerce/src/tables/guest-security.js';

const env = { QATU_DEPLOYMENT: 'vercel', QATU_ENV: 'production', QATU_PUBLIC_ORIGIN: 'https://pos.example.test', QATU_SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst', QATU_DEPLOYMENT_STAGE: 'production', QATU_GUEST_CODE_KEY_BASE64: Buffer.alloc(32, 7).toString('base64') };
describe('cloud configuration fails closed', () => {
  it('requires explicit operational mode, project, origin, stage and stable secret', () => {
    expect(cloudConfig({})).toBeUndefined();
    for (const key of Object.keys(env)) {
      if (key === 'QATU_DEPLOYMENT') continue;
      expect(() => cloudConfig({ ...env, [key]: undefined })).toThrow();
    }
    expect(cloudConfig(env)?.stage).toBe('production');
  });
  it('preview cannot use production binding and production cannot use staging', () => {
    expect(() => cloudConfig({ ...env, VERCEL_ENV: 'preview' })).toThrow();
    expect(() => cloudConfig({ ...env, VERCEL_ENV: 'development' })).toThrow();
    expect(() => cloudConfig({ ...env, VERCEL_ENV: 'production', QATU_DEPLOYMENT_STAGE: 'staging' })).toThrow();
    expect(cloudConfig({ ...env, VERCEL_ENV: 'preview', QATU_DEPLOYMENT_STAGE: 'staging' })?.stage).toBe('staging');
  });
  it('accepts only restricted role, correct project, verified TLS and session/direct5432', () => {
    const config = cloudConfig(env)!;
    const url = 'postgresql://qatu_pos_runtime.abcdefghijklmnopqrst:synthetic-secure-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=verify-full';
    expect(assertCloudDatabaseUrl(new URL(url), config)).toBeUndefined();
    for (const bad of [url.replace('5432', '6543'), url.replace('verify-full', 'require'), url.replace('abcdefghijklmnopqrst:', 'xxxxxxxxxxxxxxxxxxxx:'), url.replace('qatu_pos_runtime.', 'postgres.'), url.replace('pooler.supabase.com', 'evil.example.test'), url + '&options=-c%20search_path=public']) {
      expect(() => assertCloudDatabaseUrl(new URL(bad), config)).toThrow();
    }
  });
  it('does not create disk keys in cloud or accept noncanonical base64', () => {
    expect(() => guestEnvironmentKey({ QATU_DEPLOYMENT: 'vercel' })).toThrow();
    for (const secret of ['abc', Buffer.alloc(31).toString('base64'), env.QATU_GUEST_CODE_KEY_BASE64 + '\n']) expect(() => guestEnvironmentKey({ ...env, QATU_GUEST_CODE_KEY_BASE64: secret })).toThrow();
    const id = '10000000-0000-4000-8000-000000000001';
    expect(deriveGuestCodeWithKey(id, guestEnvironmentKey(env)!)).toBe(deriveGuestCodeWithKey(id, guestEnvironmentKey({ ...env })!));
    expect(guestEnvironmentKey({})).toBeUndefined();
  });
});
