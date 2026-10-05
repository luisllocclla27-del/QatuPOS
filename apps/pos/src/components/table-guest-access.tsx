'use client';

import { useEffect, useState } from 'react';
import type { GuestAccess } from '@qatu/contracts';
import { getGuestCode, type CommandInput } from '../lib/client';

export default function TableGuestAccess({visitId,version,access,settled,disabled,onAction}: {
  visitId:string;version:number;access?:GuestAccess;settled:boolean;disabled:boolean;
  onAction:(input:CommandInput,message:string)=>Promise<unknown>;
}) {
  const [code,setCode]=useState(''),[error,setError]=useState(''),[confirm,setConfirm]=useState<'rotate'|'revoke'|null>(null),[reason,setReason]=useState('');
  useEffect(()=>{
    let live=true;setCode('');setError('');setConfirm(null);setReason('');
    if(access?.state==='active' && !settled)void getGuestCode(visitId).then(r=>{if(live)setCode(r.code);}).catch(e=>{if(live)setError(e instanceof Error?e.message:'No se pudo consultar la clave.');});
    return()=>{live=false;};
  },[visitId,access?.id,access?.state,settled]);
  const active=access?.state==='active' && !settled;
  async function act(action:'activate'|'rotate'|'revoke') {
    await onAction({type:'guest.access',visit_id:visitId,expected_version:version,action,reason:action==='activate'?'Mozo habilita acceso del cliente':reason.trim()},action==='revoke'?'Acceso del cliente revocado. Los pedidos registrados se conservan.':action==='rotate'?'Clave renovada. Entrega la nueva clave al cliente.':'Acceso activado. Entrega la clave al cliente.');
    setConfirm(null);
  }
  return <section className="guest-access-card" aria-label="Acceso del cliente">
    <div><span className="eyebrow">CONTROL DEL MOZO · MESA CONECTADA</span><h2>{settled?'Atención digital concluida':active?'Entrega esta clave al cliente':'Habilitar pedidos de esta mesa'}</h2><p>{settled?'Cuenta pagada. El acceso anterior terminó; completa las entregas y libera la mesa cuando corresponda.':active?'El cliente abre la página de ingreso del QR e introduce esta clave. Tú también puedes tomar pedidos: ambos llegan a la misma cuenta. El pago total termina este acceso.':'Desde tu tablet o terminal, habilita esta atención y entrega la clave. Escanear el QR por sí solo mantiene los pedidos del cliente bloqueados.'}</p></div>
    {active?<div className="guest-access-tools"><output aria-label="Clave de cliente" className="guest-code">{code || 'Consultando…'}</output><a href="/cliente" target="_blank" rel="noopener" className="secondary">Abrir entrada del cliente ↗</a><div className="button-row"><button className="secondary" disabled={disabled} onClick={()=>{setConfirm('rotate');setReason('');}}>Cambiar clave</button><button className="secondary" disabled={disabled} onClick={()=>{setConfirm('revoke');setReason('');}}>Revocar acceso</button></div></div>:!settled && <button className="primary" disabled={disabled} onClick={()=>void act('activate')}>Habilitar mesa y mostrar clave</button>}
    {error && <p className="alert error" role="alert">{error}</p>}
    {confirm && <form className="guest-access-confirm" onSubmit={e=>{e.preventDefault();void act(confirm);}}><p>{confirm==='rotate'?'La clave anterior y los navegadores vinculados dejarán de funcionar. Los pedidos registrados se conservan.':'El cliente dejará de poder consultar o enviar pedidos. El personal sigue atendiendo la mesa.'}</p><label className="field"><span>Motivo del cambio de acceso</span><input value={reason} onChange={e=>setReason(e.target.value)} required minLength={3} maxLength={500} /></label><div className="button-row"><button className="secondary" type="button" onClick={()=>setConfirm(null)}>Volver</button><button className="primary" disabled={disabled || reason.trim().length<3}>{confirm==='rotate'?'Confirmar nueva clave':'Confirmar revocación'}</button></div></form>}
  </section>;
}
