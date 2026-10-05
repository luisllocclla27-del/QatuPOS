import { runtimeConfig, assertDatabaseUrl } from '../../services/commerce/src/platform/runtime.js';
if (process.env.QATU_ENV === undefined) process.loadEnvFile('.env.operational');
if (runtimeConfig().environment !== 'operational') throw new Error('Operational migration requires production configuration.');
assertDatabaseUrl(process.env.DATABASE_URL!);
await import('../database/migrate.js');
console.log('Operational schema prepared; no sample data inserted.');
