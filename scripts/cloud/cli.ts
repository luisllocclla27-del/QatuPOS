import pg from 'pg';
import { cloudConfig, assertCloudDatabaseUrl, assertCloudInstallation } from '../../services/commerce/src/platform/cloud.js';
import { runtimeConfig } from '../../services/commerce/src/platform/runtime.js';
import { createPool } from '../../services/commerce/src/platform/database.js';
import { installCloud } from './install.js';
import { migrateCloud, verifyMigrationChecksums } from './migrate.js';

async function main() {
  const command=process.argv[2],config=runtimeConfig(),cloud=cloudConfig();
  if(!cloud)throw new Error('Explicit cloud configuration required.');
  if(command==='doctor') {
    const pool=createPool();try {await assertCloudInstallation(pool,cloud);const migrations=await verifyMigrationChecksums(pool);console.log(JSON.stringify({ready:true,environment:config.environment,stage:cloud.stage,migrations,checks:['restricted-role','private-schema','installation-binding','migration-checksums','read-only-metadata','no-browser-schema-access']}));}finally{await pool.end();}
    return;
  }
  if(command!=='install' && command!=='migrate')throw new Error('Expected install, migrate or doctor.');
  const url=new URL(process.env.QATU_MAINTENANCE_DATABASE_URL??'');
  assertCloudDatabaseUrl(url,cloud,true);
  url.searchParams.delete('sslmode');
  const encoded=process.env.QATU_DATABASE_CA_BASE64,ca=encoded?Buffer.from(encoded,'base64').toString('utf8'):undefined;
  if(encoded && (!ca?.includes('-----BEGIN CERTIFICATE-----') || Buffer.from(ca).toString('base64')!==encoded))throw new Error('Invalid database CA.');
  const pool=new pg.Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,...(ca?{ca}:{})}});
  try {
    const result=command==='migrate'?await migrateCloud(pool,cloud):await installCloud(pool,cloud,{restaurant:process.env.QATU_RESTAURANT_NAME??'',tables:Number(process.env.QATU_TABLE_COUNT),username:process.env.QATU_ADMIN_USERNAME??'',admin_name:process.env.QATU_ADMIN_NAME??'',admin_password:process.env.QATU_ADMIN_PASSWORD??'',runtime_password:process.env.QATU_RUNTIME_DATABASE_PASSWORD??''});
    console.log(JSON.stringify(result));
  } finally{await pool.end();}
}
// Do not print connection strings, queries, database errors or credentials.
main().catch(()=>{console.error('Cloud verification/installation failed. Check protected configuration, project permissions and readiness; no credentials are printed.');process.exitCode=1;});
