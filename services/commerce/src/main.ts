import { createApp } from './app.js';
const app=await createApp();
await app.listen({host:'127.0.0.1',port:Number(process.env.API_PORT??4000)});
console.log('QatuPOS API local disponible en http://127.0.0.1:4000.');
for(const signal of ['SIGINT','SIGTERM'] as const) process.on(signal,async()=>{await app.close();process.exit(0);});
