import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../services/commerce/src/app.js';
import { testDatabase } from '../support/database.js';
process.env.QATU_WEB_PORT='3100';
const db=await testDatabase();const api=await createApp(db.pool,false);
await api.listen({host:'127.0.0.1',port:4100});
const require=createRequire(import.meta.url);const root=fileURLToPath(new URL('../../',import.meta.url));
const next=require.resolve('next/dist/bin/next',{paths:[root+'/apps/pos']});
const child=spawn(process.execPath,[next,'dev','--hostname','127.0.0.1','--port','3100'],{cwd:root+'/apps/pos',stdio:'inherit',windowsHide:true,env:{...process.env,QATU_API_ORIGIN:'http://127.0.0.1:4100',QATU_E2E:'1',NEXT_TELEMETRY_DISABLED:'1'}});
let stopping=false;
async function stop(){if(stopping)return;stopping=true;child.kill();await api.close();await db.close();}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());child.on('exit',()=>void stop());
