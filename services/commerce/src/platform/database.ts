import { assertDatabaseUrl } from './runtime.js';
import pg from 'pg';
import { CloudPool } from './cloud-pool.js';

export const defaultDatabaseUrl = 'postgresql://qatu_lab:qatu_lab_local_only@127.0.0.1:55432/qatupos_lab';
export function createPool(url = process.env.DATABASE_URL ?? defaultDatabaseUrl,env:Record<string,string|undefined>=process.env) {
  const parsed=assertDatabaseUrl(url,env);
  const cloud=env.QATU_DEPLOYMENT==='vercel';
  let ssl:pg.ConnectionConfig['ssl'];
  if(parsed.searchParams.get('sslmode')==='verify-full') {
    parsed.searchParams.delete('sslmode');
    const encoded=env.QATU_DATABASE_CA_BASE64;
    const ca=encoded?Buffer.from(encoded,'base64').toString('utf8'):undefined;
    if(encoded && (!ca?.includes('-----BEGIN CERTIFICATE-----') || Buffer.from(ca).toString('base64')!==encoded))throw new Error('Invalid database CA configuration.');
    ssl={rejectUnauthorized:true,...(ca?{ca}:{})};
  }
  const Constructor=cloud?CloudPool:pg.Pool;
  const pool=new Constructor({ connectionString: parsed.toString(), ssl, max: cloud?2:8, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000 });
  pool.on('error',()=>{console.error('DATABASE_IDLE_CONNECTION_UNAVAILABLE');});
  return pool;
}
