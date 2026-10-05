import type { GuestOrderInput, GuestOrderResponse, GuestSessionResponse, GuestSnapshot, PosError, QuoteResponse } from '@qatu/contracts';
import { ApiError } from './client';

async function request<T>(path:string,options:RequestInit={}):Promise<T> {
  let response:Response;
  try { response=await fetch('/v1/guest'+path,{...options,credentials:'same-origin',cache:'no-store'}); }
  catch { throw new ApiError('NETWORK','No pudimos confirmar la respuesta. Conservamos tu envío para recuperarlo.'); }
  if(!response.ok) {
    const body=await response.json().catch(()=>null) as PosError|null;
    throw new ApiError(body?.error?.code ?? 'SERVER',body?.error?.message ?? 'No pudimos completar la solicitud.',response.status,body?.error?.details);
  }
  try { return response.status===204?undefined as T:await response.json() as T; }
  catch { throw new ApiError('NETWORK','La respuesta no pudo confirmarse. Revisa o recupera el envío antes de repetirlo.'); }
}
export const guestSession=()=>request<GuestSessionResponse>('/session');
export const joinTable=(code:string)=>request<GuestSessionResponse>('/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
export const guestSnapshot=()=>request<GuestSnapshot>('/snapshot');
export const guestQuote=(lines:{product_id:string;quantity:number;note?:string}[],csrf?:string)=>request<QuoteResponse>('/quotes',{method:'POST',headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{})},body:JSON.stringify({lines})});
export const guestOrder=(input:GuestOrderInput,csrf:string)=>request<GuestOrderResponse>('/orders',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(input)});
export const leaveTable=(csrf:string)=>request<void>('/session',{method:'DELETE',headers:{'X-CSRF-Token':csrf}});

