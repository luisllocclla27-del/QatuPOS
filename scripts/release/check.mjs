import { execFileSync } from 'node:child_process';
import { readFileSync,realpathSync,statSync,readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function privatePath(file){
 const parts=file.replaceAll('\\','/').split('/'),base=parts.at(-1);
 return parts.some(p=>['.git','.runtime','.vercel','node_modules','dist','coverage','test-results','playwright-report','.pnpm-store'].includes(p)||p.startsWith('.next'))||
  (base.startsWith('.env')&&base!=='.env.example')||/\.(?:tsbuildinfo|qatubak|key|pem|p12|pfx|dump|backup|log)$/i.test(base)||base.endsWith('.protected.json');
}
export function contentFindings(text){
 const rules=[];
 if(/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/.test(text))rules.push('private-key');
 if(/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sbp_[a-f0-9]{40,}|sk_live_[A-Za-z0-9]{20,})\b/.test(text))rules.push('provider-token');
 for(const match of text.matchAll(/postgres(?:ql)?:\/\/[^\s"'`<>]+/g)){
  try{const u=new URL(match[0]);if(u.password&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname)&&!/[${}<>()]/.test(match[0])&&!u.hostname.endsWith('.example.test'))rules.push('remote-database-credential');}catch{}
 }
 return [...new Set(rules)];
}
export function checkManifest(root){
 const manifest=JSON.parse(readFileSync(path.join(root,'deployment/migrations.manifest.json'),'utf8'));
 const names=readdirSync(path.join(root,'database/migrations')).filter(n=>n.endsWith('.sql')).sort();
 if(manifest.format!==1||JSON.stringify(names)!==JSON.stringify(manifest.migrations.map(m=>m.name))||!names.includes('013_cloud_security.sql'))throw new Error('migration-manifest-order');
 for(const entry of manifest.migrations){const bytes=readFileSync(path.join(root,'database/migrations',entry.name));if(bytes.length!==entry.size_bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw new Error('migration-checksum:'+entry.name);}
 return names.length;
}
export function inspectFiles(root,files,exceptions=[]){
 const issues=[],base=realpathSync(root);let total=0;
 for(const file of files){
  if(privatePath(file)){issues.push({file,rule:'private-path'});continue;}
  const location=path.join(base,file),resolved=realpathSync(location),relative=path.relative(base,resolved);
  if(path.isAbsolute(relative)||relative==='..'||relative.startsWith('..'+path.sep)){issues.push({file,rule:'external-link'});continue;}
  if(!statSync(location).isFile()){issues.push({file,rule:'not-a-file'});continue;}
  const bytes=readFileSync(location);total+=bytes.length;
  if(!bytes.includes(0))for(const rule of contentFindings(bytes.toString('utf8'))){
   const digest=createHash('sha256').update(bytes).digest('hex');
   if(!exceptions.some(e=>e.file===file&&e.rule===rule&&e.source_sha256===digest))issues.push({file,rule});
  }
 }
 return{files:files.length,bytes:total,issues};
}
export function checkRelease(root=fileURLToPath(new URL('../../',import.meta.url))){
 const gitRoot=execFileSync('git',['rev-parse','--show-toplevel'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 if(realpathSync(gitRoot)!==realpathSync(root))throw new Error('pilot-must-be-repository-root');
 const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024}).split('\0').filter(Boolean))].sort();
 const exceptions=JSON.parse(readFileSync(path.join(root,'deployment/scan-exceptions.json'),'utf8'));
 const result=inspectFiles(root,files,exceptions),migrations=checkManifest(root);
 const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
 const pos=JSON.parse(readFileSync(path.join(root,'apps/pos/package.json'),'utf8'));
 const vercel=JSON.parse(readFileSync(path.join(root,'apps/pos/vercel.json'),'utf8'));
 for(const needed of ['pnpm-lock.yaml','pnpm-workspace.yaml','.gitattributes','.gitignore','.vercelignore','docs/contracts/pilot.openapi.json','services/commerce/src/platform/serverless.ts','deployment/cloud-settings.example.json','deployment/github-verify.template.yml'])if(!files.includes(needed))result.issues.push({file:needed,rule:'required-file'});
 if(pkg.packageManager!=='pnpm@12.5.1'||pos.engines?.node!=='24.x'||vercel.framework!=='nextjs'||vercel.installCommand!=='corepack pnpm install --frozen-lockfile'||vercel.buildCommand!=='corepack pnpm build')result.issues.push({file:'apps/pos/vercel.json',rule:'toolchain-config'});
 if(!readFileSync(path.join(root,'.gitattributes'),'utf8').includes('* -text'))result.issues.push({file:'.gitattributes',rule:'checksum-byte-preservation'});
 return{passed:result.issues.length===0,...result,migrations,reviewed_synthetic_exceptions:exceptions.length,scope:'packaging-only',database_contacted:false,secret_scan:'limited patterns; human review required'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const report=checkRelease();console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;}
 catch(error){console.error('Release check failed: '+(error instanceof Error&&/^migration-|^pilot-/.test(error.message)?error.message:'verify repository, manifest and required files.'));process.exitCode=1;}
}
