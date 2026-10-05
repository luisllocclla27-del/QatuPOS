import { readFile,realpath,stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudConfig,assertCloudDatabaseUrl } from '../../services/commerce/src/platform/cloud.js';
type Settings=Record<string,string>;
const message='Protected cloud configuration is invalid.';
const allowed=new Set(['QATU_DEPLOYMENT','QATU_ENV','QATU_DEPLOYMENT_STAGE','QATU_SUPABASE_PROJECT_REF','QATU_PUBLIC_ORIGIN','QATU_GUEST_CODE_KEY_BASE64','QATU_DATABASE_CA_BASE64','DATABASE_URL','QATU_MAINTENANCE_DATABASE_URL','QATU_RUNTIME_DATABASE_PASSWORD','QATU_ADMIN_USERNAME','QATU_ADMIN_NAME','QATU_ADMIN_PASSWORD','QATU_RESTAURANT_NAME','QATU_TABLE_COUNT']);
const commands=new Set(['check','install','doctor','migrate']);
export function validateProtectedConfig(value:unknown,command:string):Settings {
 try {
  if(!commands.has(command)||!value||typeof value!=='object'||Array.isArray(value))throw new Error();
  const settings=value as Settings;
  if(Object.entries(settings).some(([key,val])=>!allowed.has(key)||typeof val!=='string'||val.includes('\0')))throw new Error();
  const config=cloudConfig(settings);if(!config)throw new Error();
  const ca=settings.QATU_DATABASE_CA_BASE64;if(ca){const decoded=Buffer.from(ca,'base64').toString('utf8');if(!decoded.includes('-----BEGIN CERTIFICATE-----')||Buffer.from(decoded).toString('base64')!==ca)throw new Error();}
  if(['check','install','doctor'].includes(command))assertCloudDatabaseUrl(new URL(settings.DATABASE_URL??''),config);
  if(['check','install','migrate'].includes(command))assertCloudDatabaseUrl(new URL(settings.QATU_MAINTENANCE_DATABASE_URL??''),config,true);
  if(['check','install'].includes(command)){
   for(const key of ['QATU_RUNTIME_DATABASE_PASSWORD','QATU_ADMIN_PASSWORD']){const password=settings[key];if(!password||password.length<16||password.length>128||password.includes('QatuDemo')||password==='qatu_lab_local_only')throw new Error();}
   if(decodeURIComponent(new URL(settings.DATABASE_URL!).password)!==settings.QATU_RUNTIME_DATABASE_PASSWORD)throw new Error();
   if(!/^\d{1,3}$/.test(settings.QATU_TABLE_COUNT??'')||Number(settings.QATU_TABLE_COUNT)<1||Number(settings.QATU_TABLE_COUNT)>500)throw new Error();
   for(const key of ['QATU_ADMIN_USERNAME','QATU_ADMIN_NAME','QATU_RESTAURANT_NAME'])if(!settings[key]?.trim()||settings[key].length>120||/[\r\n]/.test(settings[key]))throw new Error();
  }
  return settings;
 }catch{throw new Error(message);}
}
function inside(file:string,root:string){const relative=path.relative(root,file);return relative===''||(!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));}
export async function loadProtectedConfig(file:string,checkout:string,command:string):Promise<Settings>{
 try {
  if(!path.isAbsolute(file))throw new Error();
  const root=await realpath(checkout);if(inside(path.resolve(file),root))throw new Error();
  const resolved=await realpath(file);if(inside(resolved,root))throw new Error();
  const info=await stat(resolved);if(!info.isFile()||info.size>32768)throw new Error();
  const content=await readFile(resolved);if(content.length>32768)throw new Error();
  return validateProtectedConfig(JSON.parse(content.toString('utf8').replace(/^\uFEFF/,'')),command);
 }catch{throw new Error(message);}
}
export function protectedEnvironment(settings:Settings,inherited:Record<string,string|undefined>=process.env,command='check'):NodeJS.ProcessEnv{
 const clean:NodeJS.ProcessEnv={NODE_ENV:'production'};
 for(const [key,value] of Object.entries(inherited))if(!/^(QATU_|NEXT_PUBLIC_|VERCEL|DATABASE_URL$|PG)/i.test(key))clean[key]=value;
 for(const [key,value] of Object.entries(settings))if(value)clean[key]=value;
 if(command==='doctor')for(const key of ['QATU_MAINTENANCE_DATABASE_URL','QATU_RUNTIME_DATABASE_PASSWORD','QATU_ADMIN_PASSWORD','QATU_ADMIN_USERNAME','QATU_ADMIN_NAME','QATU_RESTAURANT_NAME','QATU_TABLE_COUNT'])delete clean[key];
 if(command==='migrate')for(const key of ['DATABASE_URL','QATU_RUNTIME_DATABASE_PASSWORD','QATU_ADMIN_PASSWORD','QATU_ADMIN_USERNAME','QATU_ADMIN_NAME','QATU_RESTAURANT_NAME','QATU_TABLE_COUNT'])delete clean[key];
 return clean;
}
async function main(){
 const args=process.argv.slice(2);if(args.length!==3||args[1]!=='--config')throw new Error(message);
 const command=args[0]!,checkout=fileURLToPath(new URL('../../',import.meta.url));
 const settings=await loadProtectedConfig(args[2]!,checkout,command);
 if(command==='check'){console.log(JSON.stringify({configuration_valid:true,database_contacted:false,stage:settings.QATU_DEPLOYMENT_STAGE}));return;}
 const child=spawn(process.execPath,['--import','tsx',fileURLToPath(new URL('cli.ts',import.meta.url)),command],{cwd:checkout,env:protectedEnvironment(settings,process.env,command),stdio:'inherit',windowsHide:true});
 await new Promise<void>((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>{process.exitCode=code??1;resolve();});});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error(message+' Use an external protected JSON file with the documented keys. No values are printed.');process.exitCode=1;});
