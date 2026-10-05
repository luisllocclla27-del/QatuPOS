import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,mkdir,rm,readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { privatePath,contentFindings,inspectFiles,checkManifest } from '../../scripts/release/check.mjs';
test('private paths are blocked including tracked files',()=>{
 for(const file of ['.env','apps/pos/.env.production','x/.runtime/password','x/node_modules/a','apps/pos/.next-cloud/a','.vercel/project.json','db.dump','x/a.protected.json','x/cert.key','apps/pos/tsconfig.tsbuildinfo'])assert.equal(privatePath(file),true,file);
 for(const file of ['.env.example','deployment/cloud-settings.example.json','database/migrations/012_money_bigint.sql','docs/contracts/pilot.openapi.json'])assert.equal(privatePath(file),false,file);
});
test('findings report rules without values; loopback is synthetic',()=>{
 const remote=['postgresql://user',':NotARealPassword2026@db.abcdefghijklmnopqrst.supabase.co:5432/postgres'].join('');
 assert.deepEqual(contentFindings(remote),['remote-database-credential']);
 assert.deepEqual(contentFindings('postgresql://qatu_lab:qatu_lab_local_only@127.0.0.1:55432/qatupos_lab'),[]);
 assert.deepEqual(contentFindings(['-----BEGIN ','PRIVATE KEY-----'].join('')),['private-key']);
});
test('manifest enforces exact names and bytes, including CRLF',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'qatu-release-'));try{
  await mkdir(path.join(dir,'database/migrations'),{recursive:true});await mkdir(path.join(dir,'deployment'));
  const name='013_cloud_security.sql',data=Buffer.from('SELECT 1;\r\n');await writeFile(path.join(dir,'database/migrations',name),data);
  const manifest={format:1,migrations:[{name,size_bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')}]};await writeFile(path.join(dir,'deployment/migrations.manifest.json'),JSON.stringify(manifest));
  assert.equal(checkManifest(dir),1);await writeFile(path.join(dir,'database/migrations',name),'SELECT 1;\n');assert.throws(()=>checkManifest(dir),/migration-checksum/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('inventory blocks followed sensitive files despite ignore rules',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'qatu-release-'));try{await writeFile(path.join(dir,'.env'),'not-printed');const report=inspectFiles(dir,['.env']);assert.equal(report.issues[0].rule,'private-path');assert.equal(JSON.stringify(report).includes('not-printed'),false);}finally{await rm(dir,{recursive:true,force:true});}
});
test('canonical migrations match the committed manifest',()=>assert.equal(checkManifest(path.resolve(import.meta.dirname,'../..')),11));
test('synthetic exception requires exact source hash; changed file blocks',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'qatu-release-'));try{
  const text=['postgresql://test',':Synthetic2026@db.abcdefghijklmnopqrst.supabase.co:5432/postgres'].join(''),f='fixture.ts';await writeFile(path.join(dir,f),text);
  const exceptions=[{file:f,rule:'remote-database-credential',source_sha256:createHash('sha256').update(text).digest('hex')}];
  assert.equal(inspectFiles(dir,[f],exceptions).issues.length,0);await writeFile(path.join(dir,f),text+' changed');assert.equal(inspectFiles(dir,[f],exceptions).issues.length,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('Supabase queries are read-only',async()=>{
 for(const name of ['000-precheck.sql','100-verify.sql']){const sql=await readFile(new URL('../../deployment/supabase/'+name,import.meta.url),'utf8');const code=sql.replace(/--.*$/gm,'');assert.match(code,/BEGIN TRANSACTION READ ONLY;/);assert.match(code,/COMMIT;/);assert.doesNotMatch(code,/\b(?:CREATE|ALTER|INSERT|UPDATE|DELETE|TRUNCATE|DROP|GRANT|REVOKE)\s+(?:TABLE|ROLE|SCHEMA|INTO|FROM|ALL|ON)\b/i);}
});
