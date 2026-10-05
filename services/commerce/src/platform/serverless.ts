import { isIP } from 'node:net';
import { createApp } from '../app.js';
import { createPool } from './database.js';
type App = Awaited<ReturnType<typeof createApp>>;
const maxBody=65536;
function failure(status:number,code:string,message:string) {return Response.json({error:{code,message}},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
/** Web Request adapter over existing authority. Opens no listening socket. */
export function createWebHandler(provider:()=>Promise<App>, vercel=process.env.VERCEL==='1',release=false) {
  return async function handle(request:Request):Promise<Response> {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/v1/'))return failure(404,'NOT_FOUND','Ruta no disponible.');
    if(!['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(request.method))return failure(405,'METHOD_NOT_ALLOWED','Método no disponible.');
    let payload:Buffer|undefined,app:App|undefined;
    try {
      if(request.body) {
        if(Number(request.headers.get('content-length'))>maxBody)return failure(413,'VALIDATION_ERROR','La solicitud es demasiado grande.');
        const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
        while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>maxBody){await reader.cancel();return failure(413,'VALIDATION_ERROR','La solicitud es demasiado grande.');}chunks.push(part.value);}
        payload=Buffer.concat(chunks);
      }
      const headers:Record<string,string>={};
      for(const name of ['content-type','cookie','origin','x-csrf-token','accept']) {const value=request.headers.get(name);if(value!==null)headers[name]=value;}
      const forwarded=vercel?request.headers.get('x-forwarded-for')?.split(',')[0]?.trim():undefined;
      if(vercel && (!forwarded || !isIP(forwarded)))return failure(400,'VALIDATION_ERROR','No se pudo verificar la conexión.');
      app=await provider();
      const response=await app.inject({method:request.method as 'GET',url:url.pathname+url.search,headers,payload,remoteAddress:forwarded??'127.0.0.1'});
      const output=new Headers();
      for(const name of ['content-type','cache-control','x-content-type-options','retry-after','allow']) {const value=response.headers[name];if(value!==undefined)output.set(name,Array.isArray(value)?value.join(','):String(value));}
      const cookies=response.headers['set-cookie'];
      if(cookies)for(const cookie of Array.isArray(cookies)?cookies:[cookies])output.append('set-cookie',cookie);
      output.set('Cache-Control','no-store');
      return new Response(request.method==='HEAD'||response.statusCode===204?null:Uint8Array.from(response.rawPayload),{status:response.statusCode,headers:output});
    } catch {return failure(503,'AUTHORITY_UNAVAILABLE','No se pudo confirmar la operación. Conserva el pedido y reintenta la misma acción.');}
    finally{if(release && app)try{await app.close();}catch{console.error('AUTHORITY_RELEASE_UNAVAILABLE');}}
  };
}
async function authority() {
  const pool=createPool();try{return await createApp(pool,true);}catch(error){await pool.end();throw error;}
}
// Session-pool connections must be closed before Vercel can suspend the function.
// Request-local authorities share only durable SQL state; no singleton holds sockets.
export const handleCloudRequest=createWebHandler(authority,process.env.VERCEL==='1',true);
