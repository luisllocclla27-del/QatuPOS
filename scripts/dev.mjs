import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const tsx = require.resolve('tsx/cli');
const next = require.resolve('next/dist/bin/next', { paths: [root + '/apps/pos'] });
const children = [
  spawn(process.execPath, [tsx, 'services/commerce/src/main.ts'], { cwd: root, stdio: 'inherit', windowsHide: true }),
  spawn(process.execPath, [next, 'dev', '--hostname', '127.0.0.1', '--port', '3000'], { cwd: root + '/apps/pos', stdio: 'inherit', windowsHide: true, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } }),
];
function stop() { for (const child of children) child.kill(); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
for (const child of children) child.on('exit', code => { if (code) { stop(); process.exitCode = code; } });
