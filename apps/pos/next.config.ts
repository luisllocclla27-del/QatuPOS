import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  poweredByHeader: false,
  env: {QATU_DEPLOYMENT:process.env.QATU_DEPLOYMENT??''},
  transpilePackages: ['@qatu/contracts','@qatu/commerce','@qatu/domain'],
  // Core sources use Node ESM .js imports; webpack resolves them to pinned TS sources.
  webpack(config) {
    config.resolve.extensionAlias={...(config.resolve.extensionAlias??{}),'.js':['.ts','.tsx','.js']};
    if(process.env.QATU_DEPLOYMENT!=='vercel')config.resolve.alias['@qatu/commerce/serverless']=path.resolve(process.cwd(),'src/server/cloud-disabled.ts');
    else config.resolve.alias['./guest-key-local.js']=path.resolve(process.cwd(),'../../services/commerce/src/tables/guest-key-cloud.ts');
    return config;
  },
  turbopack: process.env.QATU_DEPLOYMENT==='vercel'?{}:{resolveAlias:{'@qatu/commerce/serverless':'./src/server/cloud-disabled.ts'}},
  serverExternalPackages: ['fastify','@fastify/cookie','pg','ajv','ajv-formats'],
  outputFileTracingRoot: path.resolve(process.cwd(),'../..'),
  outputFileTracingExcludes: {'*':['../../.runtime/**/*','../../.env*','../../docs/evidence/**/*','../../docs/construction/**/*'],'/*':['../../.runtime/**/*','../../.env*','../../docs/evidence/**/*','../../docs/construction/**/*']},
  async rewrites() {
    if(process.env.QATU_DEPLOYMENT==='vercel')return [];
    const origin = process.env.QATU_API_ORIGIN ?? 'http://127.0.0.1:4000';
    if (!/^http:\/\/127\.0\.0\.1:(4000|4100)$/.test(origin)) throw new Error('Este piloto requiere API local.');
    return [{ source: '/v1/:path*', destination: origin + '/v1/:path*' }];
  },
};
export default function configure(phase: string): NextConfig {
  const production = phase === 'phase-production-build' || phase === 'phase-production-server';
  return { ...config, distDir: process.env.QATU_DEPLOYMENT==='vercel'?(process.env.QATU_CLOUD_DIST_DIR??'.next'):production ? '.next-production' : process.env.QATU_E2E === '1' ? '.next-e2e' : '.next' };
}
