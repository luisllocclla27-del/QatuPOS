import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import type {PosSnapshot} from '@qatu/contracts';
async function login(page:Page,name:string){await page.goto('/');await page.getByLabel('Usuario',{exact:true}).fill(name);await page.getByLabel('Contraseña',{exact:true}).fill('QatuDemo2026!');await page.getByRole('button',{name:'Ingresar a mi espacio'}).click();await expect(page.getByRole('navigation',{name:'Secciones de operación'})).toBeVisible();}
async function snapshot(page:Page):Promise<PosSnapshot>{return (await page.request.get('/v1/pos/snapshot')).json();}
async function command(page:Page,body:Record<string,unknown>){const session=await(await page.request.get('/v1/pos/session')).json();const r=await page.request.post('/v1/pos/commands',{headers:{'x-csrf-token':session.csrf_token},data:{operation_id:randomUUID(),...body}});expect(r.status(),await r.text()).toBe(200);return r.json();}
async function addOrder(waiter:Page,visitId:string,productId:string){const session=await(await waiter.request.get('/v1/pos/session')).json();const q=await waiter.request.post('/v1/pos/quotes',{headers:{'x-csrf-token':session.csrf_token},data:{visit_id:visitId,lines:[{product_id:productId,quantity:1}]}});expect(q.status()).toBe(200);const quote=await q.json(),s=await snapshot(waiter);await command(waiter,{type:'order.create',visit_id:visitId,expected_version:s.visits.find(v=>v.id===visitId)!.version,quote_id:quote.quote_id});}
async function setup(cash:Page,waiter:Page){
  await login(cash,'admin');let s=await snapshot(cash);
  if(s.business_day.state!=='open'){await command(cash,{type:'day.open',expected_day_version:s.business_day.version,reason:'Ensayo de recuperación de cobros'});s=await snapshot(cash);}
  const active=s.cash_sessions.find(c=>c.state==='open');const name=active?s.staff.find(u=>u.id===active.owner_id)!.username:'caja';
  await cash.getByRole('button',{name:'Cambiar usuario'}).click();await login(cash,name);s=await snapshot(cash);
  if(!active)await command(cash,{type:'cash.open',shift_label:'diurno',opening_minor:0,expected_day_version:s.business_day.version});
  await login(waiter,'mozo');s=await snapshot(waiter);const table=s.tables.find(t=>!t.visit_id)!;expect(table).toBeTruthy();
  const opened=await command(waiter,{type:'table.open',table_id:table.id,expected_version:table.version});const product=s.products.find(p=>p.active&&p.station==='cocina')!;
  await addOrder(waiter,opened.entity_id,product.id);s=await snapshot(cash);const check=s.checks.find(c=>c.visit_id===opened.entity_id)!;
  await cash.reload();await cash.getByRole('navigation').getByRole('button',{name:/Caja/}).click();await cash.locator('.check-row').filter({hasText:table.label}).click();
  return {table,check,visitId:opened.entity_id,product};
}
async function finishOwnVisit(cash:Page,waiter:Page,visitId:string){
  let s=await snapshot(cash),check=s.checks.find(c=>c.visit_id===visitId)!;
  if(check.remaining_collectible_minor>0){const own=s.cash_sessions.find(c=>c.owner_id===s.user.id&&c.state==='open')!;const a=await command(cash,{type:'collection.authorize',check_id:check.id,expected_version:check.version,cash_session_id:own.id,method:'cash',amount_minor:check.remaining_collectible_minor});await command(cash,{type:'payment.confirm',authorization_id:a.entity_id,received_minor:check.remaining_collectible_minor});}
  s=await snapshot(waiter);
  for(const l of s.orders.filter(o=>o.visit_id===visitId).flatMap(o=>o.lines)){
    let fresh=(await snapshot(waiter)).orders.flatMap(o=>o.lines).find(x=>x.id===l.id)!;
    const remaining=fresh.quantity-fresh.voided_quantity;
    if(fresh.prepared_quantity<remaining)await command(waiter,{type:'line.ready.confirm',line_id:l.id,expected_version:fresh.version,quantity:remaining-fresh.prepared_quantity,reason:'Producto listo en ensayo de caja'});
    fresh=(await snapshot(waiter)).orders.flatMap(o=>o.lines).find(x=>x.id===l.id)!;
    if(fresh.fulfilled_quantity<remaining)await command(waiter,{type:'line.fulfill',line_id:l.id,expected_version:fresh.version,quantity:remaining-fresh.fulfilled_quantity});
  }
  s=await snapshot(waiter);await command(waiter,{type:'table.close',visit_id:visitId,expected_version:s.visits.find(v=>v.id===visitId)!.version});
}
test('lost reserve and committed payment survive reload with one effect and accurate sales history',async({browser})=>{
  const cc=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true}),wc=await browser.newContext();const cash=await cc.newPage(),waiter=await wc.newPage();
  try{
    const {table,check,visitId}=await setup(cash,waiter),attempts:Record<string,string[]>={};let loseReserve=true,losePayment=true;
    await cash.route('**/v1/pos/commands',async route=>{const c=route.request().postDataJSON();(attempts[c.type]??=[]).push(c.operation_id);if((c.type==='collection.authorize'&&loseReserve)||(c.type==='payment.confirm'&&losePayment)){if(c.type==='collection.authorize')loseReserve=false;else losePayment=false;const r=await route.fetch();expect(r.status()).toBe(200);if(c.type==='collection.authorize')await route.fulfill({status:200,contentType:'application/json',body:'{invalid'});else await route.abort('failed');}else await route.continue();});
    await cash.getByRole('button',{name:/Reservar importe/}).click();await expect(cash.getByText('Respuesta pendiente de confirmación')).toBeVisible();
    await cash.reload();await expect(cash.getByText('Respuesta pendiente de confirmación')).toBeVisible();await cash.getByRole('button',{name:'Consultar y recuperar'}).click();await expect(cash.getByLabel('Efectivo recibido (S/)')).toBeVisible();
    expect(attempts['collection.authorize']).toHaveLength(2);expect(new Set(attempts['collection.authorize']).size).toBe(1);expect((await snapshot(cash)).authorizations.filter(a=>a.check_id===check.id)).toHaveLength(1);
    await expect(cash.getByText('Cuenta 100% cobrada')).toHaveCount(0);
    // Reload a known reservation too: continuation is based on server ownership, not memory.
    await cash.reload();await cash.locator('.check-row').filter({hasText:table.label}).click();await cash.getByRole('button',{name:'Continuar cobro reservado'}).click();
    await cash.getByLabel('Efectivo recibido (S/)').fill(((check.total_minor-1500)/100).toFixed(2));await expect(cash.getByText('Falta efectivo')).toBeVisible();await expect(cash.getByRole('button',{name:'Confirmar efectivo y cambio'})).toBeDisabled();
    await cash.getByLabel('Efectivo recibido (S/)').fill(((check.total_minor+1500)/100).toFixed(2));await cash.getByRole('button',{name:'Confirmar efectivo y cambio'}).click();await expect(cash.getByText('Respuesta pendiente de confirmación')).toBeVisible();
    await cash.reload();await expect(cash.getByText('Respuesta pendiente de confirmación')).toBeVisible();await cash.getByRole('button',{name:'Consultar y recuperar'}).click();await expect(cash.getByRole('status')).toContainText('Operación recuperada');
    expect(attempts['payment.confirm']).toHaveLength(2);expect(new Set(attempts['payment.confirm']).size).toBe(1);const paid=(await snapshot(cash)).payments.filter(p=>p.check_id===check.id);expect(paid).toHaveLength(1);expect(paid[0]).toMatchObject({amount_minor:check.total_minor,received_minor:check.total_minor+1500,change_minor:1500,status:'succeeded'});
    await cash.getByRole('navigation').getByRole('button',{name:/Historial de ventas/}).click();await cash.getByLabel('Buscar mesa, cuenta o nota interna').fill(table.label);await cash.getByLabel('Situación del pago').selectOption('paid');await cash.getByRole('button',{name:`Ver atención ${table.label} ${check.id}`}).click();await expect(cash.getByRole('region',{name:'Detalle de venta'})).toContainText('15.00');
    expect(await cash.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await mkdir('docs/evidence/screens',{recursive:true});await cash.screenshot({path:'docs/evidence/screens/historial-ventas-018.png',fullPage:true});await cash.getByRole('button',{name:'Ver precuenta de esta atención'}).click();const ticket=cash.getByRole('dialog');await expect(ticket).toContainText('TOTAL CONSUMO:');await expect(ticket).toContainText('SALDO PENDIENTE:');await expect(ticket.locator('.thermal-total-row').filter({hasText:'SALDO PENDIENTE:'})).toContainText('0.00');
    await expect(waiter.getByRole('navigation').getByRole('button',{name:/Historial de ventas/})).toHaveCount(0);await mkdir('docs/evidence/screens',{recursive:true});await cash.screenshot({path:'docs/evidence/screens/cobro-recuperado-018.png',fullPage:true});await finishOwnVisit(cash,waiter,visitId);
  }finally{await cc.close();await wc.close();}
});
test('precuenta distinguishes all-held balance and refreshes while another terminal orders',async({browser})=>{
  const cc=await browser.newContext(),wc=await browser.newContext();const cash=await cc.newPage(),waiter=await wc.newPage();
  try{
    const {table,check,visitId,product}=await setup(cash,waiter);await cash.getByRole('button',{name:/Reservar importe/}).click();await cash.reload();await cash.locator('.check-row').filter({hasText:table.label}).click();
    await expect(cash.getByText('Cuenta 100% cobrada')).toHaveCount(0);await cash.getByRole('button',{name:/Imprimir Pre-cuenta/}).click();const ticket=cash.getByRole('dialog');await expect(ticket.getByRole('button',{name:/Emitir Comprobante/})).toHaveCount(0);await expect(ticket.locator('.thermal-total-row').filter({hasText:'SALDO PENDIENTE:'})).toContainText((check.total_minor/100).toFixed(2));await expect(ticket.locator('.thermal-total-row').filter({hasText:'LIBRE PARA NUEVO COBRO:'})).toContainText('0.00');
    await addOrder(waiter,visitId,product.id);await expect(ticket.locator('.thermal-total-row').filter({hasText:'TOTAL CONSUMO:'})).toContainText((check.total_minor*2/100).toFixed(2));await expect(ticket.locator('.thermal-total-row').filter({hasText:'LIBRE PARA NUEVO COBRO:'})).toContainText((check.total_minor/100).toFixed(2));
    await ticket.getByRole('button',{name:'Cerrar',exact:true}).click();const s=await snapshot(cash),auth=s.authorizations.find(a=>a.check_id===check.id&&a.status==='reserved')!;await command(cash,{type:'collection.release',authorization_id:auth.id,expected_version:s.checks.find(c=>c.id===check.id)!.version,reason:'Fin de ensayo retenido'});await finishOwnVisit(cash,waiter,visitId);
  }finally{await cc.close();await wc.close();}
});
test('unavailable session storage prevents a financial request before sending',async({browser})=>{
  const cc=await browser.newContext(),wc=await browser.newContext();const cash=await cc.newPage(),waiter=await wc.newPage();
  try{const {check,table}=await setup(cash,waiter);let sent=0;await cash.route('**/v1/pos/commands',route=>{if(route.request().postDataJSON()?.type==='collection.authorize')sent++;return route.continue();});await cash.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked');};});await cash.reload();await cash.locator('.check-row').filter({hasText:table.label}).click();await cash.getByRole('button',{name:/Reservar importe/}).click();await expect(cash.locator('.alert.error[role=alert]')).toContainText('La operación no se envió');expect(sent).toBe(0);expect((await snapshot(cash)).authorizations.filter(a=>a.check_id===check.id)).toHaveLength(0);}finally{await cc.close();await wc.close();}
});
test('cash movement response lost after commit is recovered without doubling cash or sales',async({browser})=>{
  const context=await browser.newContext(),cash=await context.newPage();
  try{
    await login(cash,'admin');const adminSnapshot=await snapshot(cash),owner=adminSnapshot.cash_sessions.find(c=>c.state==='open')!;
    await cash.getByRole('button',{name:'Cambiar usuario'}).click();await login(cash,adminSnapshot.staff.find(s=>s.id===owner.owner_id)!.username);
    await cash.getByRole('navigation').getByRole('button',{name:/Caja/}).click();const before=await snapshot(cash),reason=`ENSAYO RECUPERAR CAJA ${randomUUID()}`,ids:string[]=[];let lose=true;
    await cash.route('**/v1/pos/commands',async route=>{const c=route.request().postDataJSON();if(c.type==='cash.move'){ids.push(c.operation_id);if(lose){lose=false;const r=await route.fetch();expect(r.status()).toBe(200);await route.fulfill({status:202,contentType:'application/json',body:await r.text()});return;}}await route.continue();});
    await cash.getByRole('combobox',{name:'Movimiento',exact:true}).selectOption('paid_in');await cash.getByLabel('Importe (S/)',{exact:true}).fill('10.00');await cash.getByLabel('Motivo',{exact:true}).fill(reason);await cash.getByRole('button',{name:'Registrar movimiento'}).click();await expect(cash.getByText('Respuesta pendiente de confirmación')).toBeVisible();
    await cash.reload();await expect(cash.getByText('Respuesta pendiente de confirmación')).toBeVisible();await cash.getByRole('button',{name:'Consultar y recuperar'}).click();await expect(cash.getByRole('status')).toContainText('Operación recuperada');
    const after=await snapshot(cash);expect(ids).toHaveLength(2);expect(new Set(ids).size).toBe(1);expect(after.cash_movements.filter(m=>m.reason===reason)).toHaveLength(1);expect(after.cash_sessions.find(c=>c.id===owner.id)!.expected_minor).toBe(before.cash_sessions.find(c=>c.id===owner.id)!.expected_minor!+1000);expect(after.payments).toEqual(before.payments);expect(after.checks).toEqual(before.checks);
  }finally{await context.close();}
});
