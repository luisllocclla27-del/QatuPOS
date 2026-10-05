import { createServer } from 'node:https';
import { request } from 'node:http';
import { readFileSync } from 'node:fs';
import { runtimeConfig } from '../../services/commerce/src/platform/runtime.js';
const config = runtimeConfig(); if (config.environment !== 'operational') throw new Error('TLS listener requires operational mode.');
const origin = new URL(config.public_origin!); const port = Number(origin.port || 443);
if (!process.env.QATU_TLS_CERT || !process.env.QATU_TLS_KEY) throw new Error('Trusted HTTPS certificate and private key paths required.');
const server = createServer({ cert: readFileSync(process.env.QATU_TLS_CERT), key: readFileSync(process.env.QATU_TLS_KEY), minVersion: 'TLSv1.2', requestTimeout: 30000, headersTimeout: 15000 }, (req, res) => {
  if (req.headers.host !== origin.host) { res.writeHead(421); res.end('Invalid host'); return; }
  // Fixed destination: never accept upstream/forwarded authority from client headers.
  const headers = { ...req.headers }; delete headers['x-forwarded-host']; delete headers['x-forwarded-proto']; delete headers['x-forwarded-for'];
  const upstream = request({ host: '127.0.0.1', port: 3000, path: req.url, method: req.method, headers }, reply => { res.writeHead(reply.statusCode ?? 502, { ...reply.headers, 'strict-transport-security': 'max-age=86400', 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' }); reply.pipe(res); });
  upstream.setTimeout(30000, () => upstream.destroy()); upstream.on('error', () => { if (!res.headersSent) res.writeHead(503); res.end('Service unavailable'); }); req.on('aborted', () => upstream.destroy()); res.on('close', () => { if (!res.writableEnded) upstream.destroy(); }); req.pipe(upstream);
});
server.listen(port, process.env.QATU_HTTPS_BIND ?? '0.0.0.0', () => console.log('Operational HTTPS listener ready. API remains loopback.'));
for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal, () => server.close());
