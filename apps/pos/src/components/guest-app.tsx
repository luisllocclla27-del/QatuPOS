'use client';

import { useEffect, useRef, useState } from 'react';
import type { GuestOrderInput, GuestSessionResponse, GuestSnapshot, QuoteResponse } from '@qatu/contracts';
import { ApiError, money, getRuntime } from '../lib/client';
import { guestOrder, guestSession, guestSnapshot, joinTable, leaveTable, guestQuote } from '../lib/guest-client';

type Draft={product_id:string;quantity:number;note:string};
const recoveryKey=(id:string)=>`qatu-guest-recovery:${id}`;
function recoverOrder(raw:string):GuestOrderInput {
  const value=JSON.parse(raw) as Record<string,unknown>;
  const uuid=(v:unknown)=>typeof v==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
  if(!value || typeof value!=='object' || Array.isArray(value) || !uuid(value.operation_id) || !Number.isSafeInteger(value.expected_version) || (value.expected_version as number)<1 || !uuid(value.quote_id) || Object.keys(value).some(k=>!['operation_id','expected_version','quote_id','lines'].includes(k)))throw new Error('Invalid recovery');
  if(value.lines && Array.isArray(value.lines)) {
    for(const line of value.lines) {
      if(!line || typeof line!=='object' || Array.isArray(line) || !uuid(line.product_id) || !Number.isSafeInteger(line.quantity) || line.quantity<1 || line.quantity>100 || (line.note!==undefined && (typeof line.note!=='string' || line.note.length>300)) || Object.keys(line).some(k=>!['product_id','quantity','note'].includes(k)))throw new Error('Invalid recovery line');
    }
  }
  return value as unknown as GuestOrderInput;
}
export default function GuestApp() {
  const [mode,setMode]=useState<'laboratory'|'operational'|null>(null);
  useEffect(()=>{let live=true;void getRuntime().then(r=>{if(live)setMode(r.environment);}).catch(()=>{});return()=>{live=false;};},[]);
  const [session,setSession]=useState<GuestSessionResponse|null>(null),[view,setView]=useState<GuestSnapshot|null>(null);
  const [code,setCode]=useState(''),[draft,setDraft]=useState<Draft[]>([]),[pending,setPending]=useState<GuestOrderInput|null>(null);
  const [quote,setQuote]=useState<QuoteResponse|null>(null),[priceChangedAlert,setPriceChangedAlert]=useState<string|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[ended,setEnded]=useState(false),[review,setReview]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[connected,setConnected]=useState(true),[category,setCategory]=useState('Todo');
  const [recoveryUnreadable,setRecoveryUnreadable]=useState(false);
  const busyRef=useRef(false);
  const cartRef=useRef<HTMLElement|null>(null);
  function finishAccess() {setEnded(true);setSession(null);setView(null);setReview(false);setDraft([]);setPending(null);setQuote(null);setError('');}
  function restore(current:GuestSessionResponse) {
    setSession(current);setEnded(false);setPending(null);setDraft([]);setReview(false);setQuote(null);setNotice('');setRecoveryUnreadable(false);
    try {
      const raw=sessionStorage.getItem(recoveryKey(current.session_id));
      if(raw) {const input=recoverOrder(raw);setPending(input);if(input.lines)setDraft(input.lines.map(l=>({...l,note:l.note ?? ''})));}
    } catch {setRecoveryUnreadable(true);setError('No pudimos leer la recuperación. Pide al mozo que revise tus tandas antes de enviar nuevamente.');}
  }
  useEffect(()=>{
    let live=true;
    guestSession().then(async current=>{const data=await guestSnapshot();if(live){restore(current);setView(data);}})
      .catch(e=>{if(live && (!(e instanceof ApiError) || ![401,403].includes(e.status))){setError('La carta no está disponible en este momento. Puedes volver a intentar.');setConnected(false);}})
      .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[]);
  useEffect(()=>{
    if(!session)return;
    let live=true;
    const timer=setInterval(()=>{
      if(busyRef.current)return;
      void guestSnapshot().then(data=>{if(live){setView(data);setConnected(true);}}).catch(e=>{
        if(!live)return;
        if(e instanceof ApiError && e.code==='GUEST_ACCESS_ENDED')finishAccess();else setConnected(false);
      });
    },4000);
    return()=>{live=false;clearInterval(timer);};
  },[session?.session_id]);
  async function enter(event:React.FormEvent) {
    event.preventDefault();if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');
    try {const current=await joinTable(code);restore(current);setCode('');setView(await guestSnapshot());setConnected(true);}
    catch(e){if(e instanceof ApiError && e.code==='GUEST_ACCESS_ENDED')finishAccess();else setError(e instanceof Error?e.message:'No se pudo vincular tu mesa.');}
    finally {busyRef.current=false;setBusy(false);}
  }
  async function openReview() {
    if(!draft.length || locked || busyRef.current)return;
    busyRef.current=true;setBusy(true);setError('');setPriceChangedAlert(null);
    try {
      const q=await guestQuote(draft,session?.csrf_token);
      setQuote(q);setReview(true);
    } catch(e) {
      if(e instanceof ApiError && e.code==='GUEST_ACCESS_ENDED'){finishAccess();return;}
      setError(e instanceof Error?e.message:'No se pudo cotizar el pedido.');
    } finally {busyRef.current=false;setBusy(false);}
  }
  async function submit(input:GuestOrderInput) {
    if(!session || busyRef.current)return;
    busyRef.current=true;setBusy(true);setError('');setNotice('');
    try {
      try {sessionStorage.setItem(recoveryKey(session.session_id),JSON.stringify(input));}
      catch {throw new ApiError('LOCAL_STORAGE','No enviamos el pedido porque este navegador no permite conservar su recuperación. Solicita ayuda al mozo.');}
      const result=await guestOrder(input,session.csrf_token);
      try {sessionStorage.removeItem(recoveryKey(session.session_id));}catch {/* Reload will replay the same confirmed intention. */}
      setPending(null);setDraft([]);setQuote(null);setReview(false);setPriceChangedAlert(null);setView(result.snapshot);setConnected(true);
      setNotice(result.replayed?'Pedido recuperado. Ya estaba registrado; no se duplicó.':'Pedido recibido. El equipo ya tiene tu tanda.');
    } catch(e) {
      if(e instanceof ApiError && e.code==='GUEST_ACCESS_ENDED'){finishAccess();return;}
      if(e instanceof ApiError && e.code==='LOCAL_STORAGE'){setReview(false);setError(e.message);return;}
      if(e instanceof ApiError && (e.code==='NETWORK' || e.status>=500)){setReview(false);setPending(input);setConnected(false);}
      else {
        try {sessionStorage.removeItem(recoveryKey(session.session_id));}catch {/* No new request is made on storage failure. */}
        setPending(null);
        if(e instanceof ApiError && e.code==='PRICE_CHANGED') {
          try {
            const freshView=await guestSnapshot();setView(freshView);setConnected(true);
            const freshQuote=await guestQuote(draft,session?.csrf_token);setQuote(freshQuote);
            setPriceChangedAlert(e.message || 'El precio cambió. Revisa tu pedido antes de confirmar.');
            setReview(true);
            return;
          } catch(refreshError){if(refreshError instanceof ApiError && refreshError.code==='GUEST_ACCESS_ENDED'){finishAccess();return;}}
        }
        if(e instanceof ApiError && e.code==='QUOTE_EXPIRED') {
          try {
            const freshQuote=await guestQuote(draft,session?.csrf_token);setQuote(freshQuote);
            setPriceChangedAlert('La cotización expiró. Revisa los precios antes de confirmar.');
            setReview(true);
            return;
          } catch{}
        }
        setReview(false);
        if(e instanceof ApiError && e.code==='VERSION_CONFLICT') {
          try {setView(await guestSnapshot());setConnected(true);}catch(refreshError){if(refreshError instanceof ApiError && refreshError.code==='GUEST_ACCESS_ENDED'){finishAccess();return;}}
          setError('La atención cambió mientras revisabas. Conservamos tu selección: revisa los precios y confirma nuevamente.');return;
        }
      }
      setReview(false);
      setError(e instanceof Error?e.message:'No se pudo completar el envío.');
    } finally {busyRef.current=false;setBusy(false);}
  }
  function change(product:string,delta:number) {
    if(busy || pending)return;
    setDraft(previous=>{const found=previous.find(l=>l.product_id===product);return found?previous.map(l=>l.product_id===product?{...l,quantity:Math.min(100,l.quantity+delta)}:l).filter(l=>l.quantity>0):[...previous,{product_id:product,quantity:1,note:''}];});
  }
  async function exit() {
    if(!session || busy || pending)return;
    setBusy(true);busyRef.current=true;
    try {await leaveTable(session.csrf_token);setSession(null);setView(null);setDraft([]);setQuote(null);setEnded(false);setNotice('');}
    catch(e){if(e instanceof ApiError && e.code==='GUEST_ACCESS_ENDED')finishAccess();else setError(e instanceof Error?e.message:'No se pudo salir.');}
    finally {setBusy(false);busyRef.current=false;}
  }
  const total=draft.reduce((sum,l)=>sum+(view?.products.find(p=>p.id===l.product_id)?.price_minor ?? 0)*l.quantity,0);
  const locked=busy || !!pending || recoveryUnreadable || !view?.ordering_allowed || !connected;
  return <main className="guest-shell"><header className="guest-brand"><span className="guest-emblem" aria-hidden>EH</span><div><span className="eyebrow">BIENVENIDO A TU MESA</span><strong>El Encanto Huamanguino</strong></div><span className="guest-lab">Carta de prueba</span></header>
    {loading?<section className="guest-entry panel"><h1>Preparando tu carta…</h1></section>:!session || !view?<section className="guest-entry panel"><span className="eyebrow">{ended?'HASTA PRONTO':'ESPERA LA HABILITACIÓN DEL MOZO'}</span><h1>{ended?'Atención concluida':'Pedidos bloqueados'}</h1><p>{ended?'La cuenta se pagó, el acceso venció o el mozo cambió la clave. Si tienes un pedido pendiente de confirmar, solicita al personal que lo revise.':'Para pedir desde tu teléfono, el mozo debe habilitar esta atención desde su tablet o terminal y entregarte la clave. Abrir el enlace del QR no habilita los pedidos.'}</p>{!ended && <ol className="guest-entry-steps" aria-label="Cómo habilitar mis pedidos"><li><span>1</span><div><strong>Abre el enlace del QR</strong><small>Los pedidos empiezan bloqueados.</small></div></li><li><span>2</span><div><strong>El mozo habilita tu atención</strong><small>Introduce la clave que te entrega.</small></div></li><li><span>3</span><div><strong>Pide hasta pagar la cuenta</strong><small>El pago total concluye este acceso.</small></div></li></ol>}<form className="form-stack" onSubmit={enter}><label className="field"><span>Clave de tu mesa</span><input className="guest-key-input" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="ABCDE-23456" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} minLength={10} maxLength={32} required /></label>{error && <p className="alert error" role="alert">{error}</p>}<button className="primary wide" disabled={busy}>{busy?'Vinculando…':'Vincularme a mi mesa'} <span>→</span></button></form><p className="small muted">La clave pertenece a esta atención y termina al pagar completamente. También puedes pedir directamente al mozo.</p></section>:<>
    <div className="guest-welcome"><div><span className="eyebrow">{view.table_label} · TU ATENCIÓN</span><h1>¿Qué te provoca hoy?</h1><p>Elige con calma. Revisa tu selección antes de enviarla.</p></div><button className="secondary" disabled={busy || !!pending} onClick={()=>void exit()}>Salir de mi navegador</button></div>
    {!connected && <p className="alert warning" role="status">Esperando conexión. Tus envíos no se repiten automáticamente.</p>}
    {view.service_mode === 'beverages_only' && <p className="alert info">Carta nocturna: cerveza, gaseosa y agua. Tu pedido sigue vinculado a la misma mesa y atención.</p>}
    {!view.ordering_allowed && <p className="alert warning">La atención no admite nuevos pedidos en este momento. Solicita ayuda al mozo.</p>}
    {error && <p className="alert error" role="alert">{error}</p>}{notice && <p className="alert info" role="status">{notice}</p>}
    {pending && <section className="alert warning"><div><strong>Envío pendiente de confirmación</strong><p>No envíes otra tanda. Puedes recuperar el resultado del mismo pedido sin duplicarlo.</p></div><button className="primary" disabled={busy} onClick={()=>void submit(pending)}>Consultar y recuperar mi pedido</button></section>}
    <div className="guest-columns"><section><div className="category-tabs" role="group" aria-label="Categorías de la carta">{['Todo',...new Set(view.products.map(p=>p.category))].map(c=><button key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="guest-products">{view.products.filter(p=>category==='Todo' || p.category===category).map(p=><button className="guest-product" key={p.id} disabled={locked} onClick={()=>change(p.id,1)}><span className="eyebrow">{p.category}</span><strong>{p.name}</strong><div><span>{money(p.price_minor)}</span><span className="guest-add">{draft.find(l=>l.product_id===p.id)?.quantity ?? '+'}</span></div></button>)}</div></section>
    <aside ref={cartRef} className="panel guest-cart"><span className="eyebrow">ANTES DE ENVIAR</span><h2>Mi selección</h2>{!draft.length?<p className="muted">Toca un producto para empezar. Tu selección aún no es un pedido.</p>:draft.map(l=>{const p=view.products.find(p=>p.id===l.product_id);return <div className="guest-draft" key={l.product_id}><div className="line-title"><strong>{p?.name ?? 'Producto'}</strong><span>{money((p?.price_minor ?? 0)*l.quantity)}</span></div><div className="quantity-control"><button disabled={locked} aria-label={`Quitar ${p?.name}`} onClick={()=>change(l.product_id,-1)}>−</button><span>{l.quantity}</span><button disabled={locked} aria-label={`Agregar ${p?.name}`} onClick={()=>change(l.product_id,1)}>+</button></div><label className="field"><span>Observación para {p?.name}</span><input value={l.note} placeholder="Sin picante, sin hielo…" disabled={locked} maxLength={300} onChange={e=>setDraft(prev=>prev.map(x=>x.product_id===l.product_id?{...x,note:e.target.value}:x))} /></label></div>;})}<div className="guest-total"><span>Total estimado</span><strong>{money(total)}</strong></div><button className="primary wide" disabled={locked || !draft.length} onClick={()=>void openReview()}>Revisar mi pedido →</button><p className="small muted">Envías tu selección a la misma cuenta que atiende el mozo. Verás únicamente los pedidos de este navegador.</p></aside></div>
    {!!draft.length && !review && <button className="primary guest-quick-selection" onClick={()=>cartRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}>Ver mi selección · {money(total)}</button>}
    <section className="panel guest-history" aria-label="Mis pedidos"><span className="eyebrow">ENVIADOS DESDE ESTE NAVEGADOR</span><h2>Mis pedidos</h2>{!view.orders.length?<p className="muted">Tus tandas confirmadas aparecerán aquí.</p>:view.orders.map(o=><article className="guest-order" key={o.id}><strong>Tanda {o.batch_number}</strong>{o.lines.map((l,i)=><div key={i}><span>{l.quantity} × {l.product_name}{l.note && <small>{l.note}</small>}</span><span className="guest-line-state">{l.fulfilled_quantity===l.quantity?'Entregado':l.prepared_quantity===l.quantity?'Preparado':l.prepared_quantity>0?`${l.prepared_quantity}/${l.quantity} preparados`:'Recibido'}<small>{l.fulfilled_quantity}/{l.quantity} entregados</small></span></div>)}</article>)}</section>
    {review && quote && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="guest-review-title"><span className="eyebrow">{view.table_label} · COTIZACIÓN OFICIAL</span><h2 id="guest-review-title">Confirma tu pedido</h2>{priceChangedAlert && <div className="alert warning" role="alert"><strong>{priceChangedAlert}</strong></div>}<div className="guest-review-lines">{quote.lines.map(l=><div key={l.product_id} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'8px 0',borderBottom:'1px solid var(--line,#e2e8f0)'}}><div><strong>{l.quantity} × {l.product_name}</strong>{l.note && <small style={{display:'block',color:'var(--muted,#64748b)'}}>{l.note}</small>}</div><span style={{fontWeight:600}}>{money(l.unit_price_minor * l.quantity)}</span></div>)}</div><div className="guest-total"><span>Total oficial</span><strong>{money(quote.total_minor)}</strong></div><p className="small muted">Cotización calculada por el servidor (vigencia 2 min). Al confirmar, tu pedido entra directamente a cocina y bar.</p><div className="button-row"><button className="secondary" onClick={()=>{setReview(false);setPriceChangedAlert(null);}}>Volver a mi selección</button><button className="primary" disabled={locked} onClick={()=>void submit({operation_id:crypto.randomUUID(),expected_version:view.visit_version,quote_id:quote.quote_id})}>Confirmar y enviar mi pedido</button></div></section></div>}
    </>}
    <footer className="guest-footer">{mode === 'laboratory' ? 'Laboratorio local · Sin cobros reales · ' : ''}Puedes solicitar atención al mozo en cualquier momento. El pago de la cuenta se realiza en Caja.</footer>
  </main>;
}

