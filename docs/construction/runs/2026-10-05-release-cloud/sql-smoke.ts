import { randomUUID,createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import pg from 'pg';
import { installCloud } from '../../../../scripts/cloud/install.js';
import { cloudConfig } from '../../../../services/commerce/src/platform/cloud.js';
import { defaultDatabaseUrl } from '../../../../services/commerce/src/platform/database.js';
const name='qatupos_lab_test_release_'+randomUUID().replaceAll('-','');
const admin=new pg.Pool({connectionString:defaultDatabaseUrl,max:1});
let fixture:pg.Pool|undefined,created=false,installed=false;
try{
 if((await admin.query("SELECT 1 FROM pg_roles WHERE rolname='qatu_pos_runtime'")).rowCount)throw new Error('Fixture role already exists; refusing to modify.');
 await admin.query(`CREATE DATABASE "${name}"`);created=true;
 const url=new URL(defaultDatabaseUrl);url.pathname='/'+name;fixture=new pg.Pool({connectionString:url.toString(),max:1});
 const pre=await fixture.query(await readFile(new URL('../../../../deployment/supabase/000-precheck.sql',import.meta.url),'utf8'));
 const preRow=Array.isArray(pre)?pre.find(r=>r.command==='SELECT')!.rows[0]:(pre as pg.QueryResult).rows[0];
 if(preRow.pos_schema_exists||preRow.pos_role_exists)throw new Error('Unexpected initial state.');
 const config=cloudConfig({QATU_DEPLOYMENT:'vercel',QATU_ENV:'production',QATU_DEPLOYMENT_STAGE:'production',QATU_PUBLIC_ORIGIN:'https://pos.example.test',QATU_SUPABASE_PROJECT_REF:'abcdefghijklmnopqrst',QATU_GUEST_CODE_KEY_BASE64:Buffer.alloc(32,73).toString('base64')})!;
 await installCloud(fixture,config,{restaurant:'Synthetic release fixture',tables:2,username:'release_admin',admin_name:'Synthetic admin',admin_password:'SyntheticAdminRelease2026!',runtime_password:'SyntheticRuntimeRelease2026!'});installed=true;
 async function fingerprint(){const tables=(await fixture!.query("SELECT tablename FROM pg_tables WHERE schemaname='qatupos' ORDER BY tablename")).rows;const data=[];for(const {tablename} of tables){const rows=(await fixture!.query(`SELECT to_jsonb(t) AS data FROM qatupos.${pg.escapeIdentifier(tablename)} t ORDER BY to_jsonb(t)::text`)).rows;data.push({tablename,rows});}return createHash('sha256').update(JSON.stringify(data)).digest('hex');}
 const before=await fingerprint();const result=await fixture.query(await readFile(new URL('../../../../deployment/supabase/100-verify.sql',import.meta.url),'utf8'));const after=await fingerprint();if(before!==after)throw new Error('Read-only verification modified fixture.');
 const statements=(Array.isArray(result)?result:[result]) as pg.QueryResult[];
 const selects=statements.filter(r=>r.command==='SELECT');
 const grant=selects[3]!.rows[0];if(!grant.runtime_usage||grant.runtime_ddl||grant.binding_writable||grant.history_writable||selects[5]!.rows[0].public_exposed)throw new Error('Unsafe grants.');
 const manifest=JSON.parse(await readFile(new URL('../../../../deployment/migrations.manifest.json',import.meta.url),'utf8'));
 if(JSON.stringify(selects[1]!.rows)!==JSON.stringify(manifest.migrations.map((m:{name:string;sha256:string})=>({name:m.name,sha256:m.sha256}))))throw new Error('Manifest mismatch.');
 const report={passed:true,precheck:true,verify_statements:selects.length,migrations:selects[1]!.rowCount,unchanged:before===after,database:'fresh synthetic PostgreSQL fixture',supabase_contacted:false};await writeFile(new URL('sql-smoke.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{
 await fixture?.end();if(created&&/^qatupos_lab_test_release_[a-f0-9]{32}$/.test(name))await admin.query(`DROP DATABASE "${name}"`);if(installed)await admin.query('DROP ROLE qatu_pos_runtime');await admin.end();
}
