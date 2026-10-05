import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
if (existsSync('.env.operational')) process.loadEnvFile('.env.operational');
if (process.env.QATU_ENV !== 'production' || !process.env.DATABASE_URL || !process.env.QATU_PUBLIC_ORIGIN || !process.env.QATU_TLS_CERT || !process.env.QATU_TLS_KEY) throw new Error('Provide operational database, HTTPS origin and trusted certificate/key in protected configuration.');
if (process.env.API_PORT && process.env.API_PORT !== '4000') throw new Error('Operational API is fixed loopback port4000.');
const require = createRequire(import.meta.url), root = fileURLToPath(new URL('../../', import.meta.url));
if (!existsSync(root + 'apps/pos/.next-production/BUILD_ID')) throw new Error('Build the production frontend first.');
const next = require.resolve('next/dist/bin/next', { paths: [root + 'apps/pos'] });
const env = { ...process.env, NODE_ENV: 'production', API_PORT: '4000', NEXT_TELEMETRY_DISABLED: '1', QATU_API_ORIGIN: 'http://127.0.0.1:4000' };
const children = [spawn(process.execPath, ['--import', 'tsx', 'services/commerce/src/main.ts'], { cwd: root, stdio: 'inherit', env, windowsHide: true }), spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', '3000'], { cwd: root + 'apps/pos', stdio: 'inherit', env, windowsHide: true }), spawn(process.execPath, ['--import', 'tsx', 'scripts/operational/tls-proxy.ts'], { cwd: root, stdio: 'inherit', env, windowsHide: true })];
let stopping = false; function stop() { if (stopping) return; stopping = true; for (const child of children) child.kill(); }
process.on('message', message => { if (message === 'stop') { stop(); process.disconnect?.(); } });
process.on('SIGINT', stop); process.on('SIGTERM', stop); for (const child of children) { child.on('error', () => { process.exitCode = 1; stop(); }); child.on('exit', () => { if (!stopping) { process.exitCode = 1; stop(); } }); }
