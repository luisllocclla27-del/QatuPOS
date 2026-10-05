import { cloudConfig, assertCloudDatabaseUrl, type CloudConfig } from './cloud.js';
export interface RuntimeConfig { environment: 'laboratory' | 'operational'; public_origin: string | null; secure_cookies: boolean; cloud?: CloudConfig }
export function runtimeConfig(env: Record<string, string | undefined> = process.env): RuntimeConfig {
  const cloud=cloudConfig(env);
  if (!env.QATU_ENV || ['local', 'test'].includes(env.QATU_ENV)) return { environment: 'laboratory', public_origin: null, secure_cookies: false };
  if (env.QATU_ENV !== 'production') throw new Error('Unrecognized runtime mode.');
  if (!env.QATU_PUBLIC_ORIGIN) throw new Error('Production requires QATU_PUBLIC_ORIGIN.');
  let origin: URL; try { origin = new URL(env.QATU_PUBLIC_ORIGIN); } catch { throw new Error('Invalid public origin.'); }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || origin.origin !== env.QATU_PUBLIC_ORIGIN) throw new Error('Production origin must be an exact HTTPS origin.');
  return { environment: 'operational', public_origin: origin.origin, secure_cookies: true, ...(cloud?{cloud}:{}) };
}
export function originAllowed(config: RuntimeConfig, origin: string | undefined, e2e = process.env.QATU_WEB_PORT === '3100'): boolean {
  return config.environment === 'operational' ? !!origin && origin === config.public_origin : !origin || ['http://127.0.0.1:3000', 'http://localhost:3000', 'http://127.0.0.1:4000', ...(e2e ? ['http://127.0.0.1:3100'] : [])].includes(origin);
}
export function assertDatabaseUrl(url: string, env: Record<string, string | undefined> = process.env): URL {
  let parsed: URL; try { parsed = new URL(url); } catch { throw new Error('Invalid database configuration.'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('PostgreSQL required.');
  if (parsed.pathname.startsWith('/qatupos_restore_')) throw new Error('Restored rehearsal databases are quarantined and cannot run the POS.');
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
  const cloud=cloudConfig(env);
  if(cloud && !loopback){assertCloudDatabaseUrl(parsed,cloud);return parsed;}
  if (env.QATU_ENV === 'production') {
    runtimeConfig(env);
    if (!env.DATABASE_URL || !/^\/qatupos_prod_[a-z0-9_]+$/.test(parsed.pathname) || !parsed.username || !parsed.password || decodeURIComponent(parsed.username) === 'qatu_lab' || decodeURIComponent(parsed.password) === 'qatu_lab_local_only') throw new Error('Production requires a separate protected qatupos_prod database.');
    if (!loopback && parsed.searchParams.get('sslmode') !== 'verify-full') throw new Error('Remote production PostgreSQL requires verified TLS.');
    if(cloud && decodeURIComponent(parsed.username)!=='qatu_pos_runtime')throw new Error('Cloud rehearsal requires the restricted runtime role.');
  } else if (!loopback || !parsed.pathname.startsWith('/qatupos_lab')) throw new Error('Laboratory requires isolated loopback database.');
  return parsed;
}
