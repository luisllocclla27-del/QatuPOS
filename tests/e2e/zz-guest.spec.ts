import { test,expect,type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

async function staff(page:Page,user:string) {
  await page.goto('/');await page.getByLabel('Usuario',{exact:true}).fill(user);await page.getByLabel('Contraseña',{exact:true}).fill('QatuDemo2026!');
  await page.getByRole('button',{name:'Ingresar a mi espacio'}).click();await expect(page.getByRole('navigation',{name:'Secciones de operación'})).toBeVisible();
}
async function key(page:Page,table:string) {
  await page.getByRole('button',{name:new RegExp(table)}).click();await page.getByRole('button',{name:'Habilitar mesa y mostrar clave'}).click();
  const output=page.locator('output[aria-label="Clave de cliente"]');await expect(output).toHaveText(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);return (await output.innerText()).trim();
}
async function enter(page:Page,code:string) {
  await page.goto('/cliente');await page.getByLabel('Clave de tu mesa').fill(code);await page.getByRole('button',{name:'Vincularme a mi mesa'}).click();
  await expect(page.getByRole('heading',{name:'¿Qué te provoca hoy?'})).toBeVisible();
}
async function send(page:Page,product:string,note?:string) {
  await page.locator('.guest-product').filter({hasText:product}).click();if(note)await page.getByLabel(`Observación para ${product}`).fill(note);await page.getByRole('button',{name:'Revisar mi pedido'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Confirmar y enviar mi pedido'}).click();
}

test('waiter monitors private customer orders and paid delivery stays independent',async({browser})=>{
  test.setTimeout(90000);
  const wc=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true}),cc=await browser.newContext(),gc=await browser.newContext({viewport:{width:390,height:844}}),g2c=await browser.newContext();
  const w=await wc.newPage(),cash=await cc.newPage(),g=await gc.newPage(),g2=await g2c.newPage();
  const contexts=[wc,cc,gc,g2c];
  try {
    await g.goto('/cliente');await expect(g.getByRole('heading',{name:'Pedidos bloqueados'})).toBeVisible();await expect(g.locator('.guest-product')).toHaveCount(0);await expect(g.getByRole('button',{name:'Revisar mi pedido'})).toHaveCount(0);
    await mkdir('docs/evidence/screens',{recursive:true});await g.screenshot({path:'docs/evidence/screens/cliente-bloqueado.png',fullPage:true});
    await g.getByLabel('Clave de tu mesa').fill('AAAAA-AAAAA');await g.getByRole('button',{name:'Vincularme a mi mesa'}).click();await expect(g.locator('.alert.error')).toContainText('clave no es válida');await expect(g.locator('.guest-product')).toHaveCount(0);
    await staff(w,'mozo');const code=await key(w,'Mesa 09');
    expect(await w.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await w.screenshot({path:'docs/evidence/screens/mozo-tablet.png',fullPage:true});
    await w.getByRole('button',{name:/Volver a mesas/}).click();await w.getByRole('button',{name:/Mesa 09/}).click();await expect(w.locator('output[aria-label="Clave de cliente"]')).toHaveText(code);
    await enter(g,code);expect(g.url()).not.toContain(code);await send(g,'Ceviche clásico','Sin picante');await expect(g.getByRole('status')).toContainText('Pedido recibido');
    await enter(g2,code);await expect(g2.locator('.guest-order')).toHaveCount(0);await send(g2,'Refresco de maracuyá');await expect(g2.getByRole('status')).toContainText('Pedido recibido');
    await expect(g.locator('.guest-order')).toHaveCount(1);await expect(g.locator('.guest-history')).not.toContainText('Refresco de maracuyá');
    await expect(g2.locator('.guest-history')).not.toContainText('Ceviche clásico');
    expect(await g.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await mkdir('docs/evidence/screens',{recursive:true});await g.screenshot({path:'docs/evidence/screens/cliente-movil.png',fullPage:true});await w.screenshot({path:'docs/evidence/screens/clave-mozo.png',fullPage:true});
    await staff(cash,'caja');await cash.getByRole('navigation').getByRole('button',{name:/Mi turno/}).click();
    if(await cash.getByLabel('Fondo físico inicial (S/)').isVisible()) {await cash.getByLabel('Fondo físico inicial (S/)').fill('0.00');await cash.getByRole('button',{name:'Abrir mi sesión'}).click();await expect(cash.getByRole('status')).toContainText('Sesión de caja abierta');}
    await cash.getByRole('navigation').getByRole('button',{name:/Caja/}).click();await cash.locator('.check-row').filter({hasText:'Mesa 09'}).click();
    await expect(cash.getByLabel('Importe a cobrar (S/)')).toHaveValue('43.00');await cash.getByRole('button',{name:/Reservar importe/}).click();
    await cash.getByLabel('Efectivo recibido (S/)').fill('50.00');await cash.getByRole('button',{name:'Confirmar efectivo y cambio'}).click();
    await expect(cash.getByRole('status')).toContainText('Cobro registrado');
    await expect(g.getByRole('heading',{name:'Atención concluida'})).toBeVisible();await expect(g2.getByRole('heading',{name:'Atención concluida'})).toBeVisible();
    await expect(w.getByRole('heading',{name:'Atención digital concluida'})).toBeVisible();await expect(w.locator('.product-card').first()).toBeDisabled();
    await g.getByLabel('Clave de tu mesa').fill(code);await g.getByRole('button',{name:'Vincularme a mi mesa'}).click();await expect(g.locator('.alert.error[role="alert"]')).toContainText('clave no es válida');
    await w.getByRole('navigation').getByRole('button',{name:/Pedidos del cliente/}).click();
    await w.getByLabel('Filtrar por mesa').selectOption({label:'Mesa 09'});
    await expect(w.locator('.client-order-card')).toHaveCount(2);
    const ceviche=w.locator('.client-order-card').filter({hasText:'Ceviche clásico'});
    await expect(ceviche).toContainText('Cuenta pagada · aún falta entregar');await expect(ceviche).toContainText('Sin picante');await expect(ceviche).toContainText('0/1 entregados');
    expect(await w.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await w.screenshot({path:'docs/evidence/screens/pedidos-cliente.png',fullPage:true});
    const kc=await browser.newContext(),ic=await browser.newContext();contexts.push(kc,ic);
    const kitchen=await kc.newPage(),ice=await ic.newPage();await staff(kitchen,'cocina');
    await expect(kitchen.getByRole('navigation')).not.toContainText('Pedidos del cliente');
    const kitchenCard=kitchen.locator('.fulfillment-card').filter({hasText:'Mesa 09'});
    await kitchenCard.getByRole('button',{name:'Preparar 1',exact:true}).click();
    await expect(ceviche.locator('.badge')).toHaveText('Listo para entregar');
    await kitchenCard.getByRole('button',{name:'Entregar 1',exact:true}).click();
    await expect(w.locator('.client-order-card')).toHaveCount(1);
    await w.getByRole('button',{name:'Entregados',exact:true}).click();await expect(ceviche).toBeVisible();await expect(ceviche).toContainText('1/1 entregados');
    await ceviche.getByRole('button',{name:'Ver mesa',exact:true}).click();await expect(w.getByRole('heading',{name:'Mesa 09',exact:true})).toBeVisible();
    await staff(ice,'heladeria');const iceCard=ice.locator('.fulfillment-card').filter({hasText:'Mesa 09'});
    await iceCard.getByRole('button',{name:'Preparar 1',exact:true}).click();await iceCard.getByRole('button',{name:'Entregar 1',exact:true}).click();
    await w.getByRole('button',{name:'Cerrar visita y liberar mesa',exact:true}).click();await w.getByRole('dialog').getByRole('button',{name:'Cerrar visita y liberar mesa',exact:true}).click();
    await expect(w.getByRole('status')).toContainText('Visita cerrada');
    await w.getByRole('button',{name:/Mesa 09/}).click();await expect(w.getByRole('button',{name:'Habilitar mesa y mostrar clave'})).toBeVisible();
    await w.getByRole('navigation').getByRole('button',{name:/Pedidos del cliente/}).click();await w.getByRole('button',{name:'Entregados',exact:true}).click();
    await w.getByLabel('Filtrar por mesa').selectOption({label:'Mesa 09'});await expect(w.locator('.client-order-card')).toHaveCount(2);
    await expect(w.getByRole('button',{name:'Ver mesa',exact:true})).toHaveCount(0);
    for(const button of await w.getByRole('button',{name:'Atención cerrada',exact:true}).all())await expect(button).toBeDisabled();

  } finally {for(const c of contexts)await c.close();}
});

test('customer recovers a lost response after reload once and waiter rotation ends the old browser',async({browser})=>{
  const wc=await browser.newContext(),gc=await browser.newContext(),nextc=await browser.newContext();
  const w=await wc.newPage(),g=await gc.newPage(),next=await nextc.newPage();
  try {
    await staff(w,'mozo');const code=await key(w,'Mesa 10');await enter(g,code);
    let lose=true;await g.route('**/v1/guest/orders',async route=>{if(lose){lose=false;await route.fetch();await route.abort('failed');}else await route.continue();});
    await send(g,'Ceviche clásico');await expect(g.getByText('Envío pendiente de confirmación',{exact:true})).toBeVisible();
    await expect(g.getByRole('button',{name:'Revisar mi pedido'})).toBeDisabled();
    await g.reload();await expect(g.getByText('Envío pendiente de confirmación',{exact:true})).toBeVisible();
    await g.getByRole('button',{name:'Consultar y recuperar mi pedido'}).click();await expect(g.getByRole('status')).toContainText('Pedido recuperado');
    await expect(g.locator('.guest-order')).toHaveCount(1);await expect(w.locator('.current-account')).toContainText('35.00');
    await w.getByRole('button',{name:'Cambiar clave'}).click();await w.getByLabel('Motivo del cambio de acceso').fill('Cliente solicita renovar su clave');
    await w.getByRole('button',{name:'Confirmar nueva clave'}).click();const output=w.locator('output[aria-label="Clave de cliente"]');await expect(output).not.toHaveText(code);await expect(output).toHaveText(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    await expect(g.getByRole('heading',{name:'Atención concluida'})).toBeVisible();
    await enter(next,(await output.innerText()).trim());await expect(next.locator('.guest-order')).toHaveCount(0);
    await w.locator('.previous-orders summary').click();await expect(w.locator('.history-batch')).toHaveCount(1);await expect(w.locator('.history-batch')).toContainText('Cliente desde su navegador');
  } finally {for(const c of [wc,gc,nextc])await c.close();}
});

test('browser storage failures never send an untracked order or discard a confirmed result',async({browser})=>{
  test.setTimeout(90000);
  const wc=await browser.newContext(),gc=await browser.newContext(),w=await wc.newPage(),g=await gc.newPage();
  try {
    await staff(w,'mozo');await enter(g,await key(w,'Mesa 08'));
    let requests=0;g.on('request',r=>{if(r.url().endsWith('/v1/guest/orders'))requests++;});
    await g.evaluate(()=>{
      sessionStorage.setItem('qatu-block-recovery','1');const write=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){if(k.startsWith('qatu-guest-recovery:') && this.getItem('qatu-block-recovery')==='1')throw new DOMException('Injected storage failure','QuotaExceededError');write.call(this,k,v);};
    });
    await send(g,'Ceviche clásico');await expect(g.locator('.alert.error')).toContainText('No enviamos el pedido');expect(requests).toBe(0);await expect(g.locator('.guest-order')).toHaveCount(0);
    await g.evaluate(()=>sessionStorage.setItem('qatu-block-recovery','0'));
    await g.getByRole('button',{name:'Revisar mi pedido'}).click();await g.getByRole('dialog').getByRole('button',{name:'Confirmar y enviar mi pedido'}).click();
    await expect(g.getByRole('status')).toContainText('Pedido recibido');expect(requests).toBe(1);
    await g.evaluate(()=>{const remove=Storage.prototype.removeItem;Storage.prototype.removeItem=function(k){if(k.startsWith('qatu-guest-recovery:'))throw new DOMException('Injected cleanup failure','SecurityError');remove.call(this,k);};});
    await send(g,'Refresco de maracuyá');await expect(g.getByRole('status')).toContainText('Pedido recibido');await expect(g.locator('.guest-order')).toHaveCount(2);await expect(g.locator('.guest-draft')).toHaveCount(0);
    await g.reload();await expect(g.getByText('Envío pendiente de confirmación',{exact:true})).toBeVisible();await g.getByRole('button',{name:'Consultar y recuperar mi pedido'}).click();
    await expect(g.getByRole('status')).toContainText('Pedido recuperado');await expect(g.locator('.guest-order')).toHaveCount(2);await expect(w.locator('.current-account')).toContainText('43.00');
    await g.evaluate(async()=>{const session=await (await fetch('/v1/guest/session')).json();sessionStorage.setItem(`qatu-guest-recovery:${session.session_id}`,JSON.stringify({expected_version:1,lines:[{product_id:'20000000-0000-4000-8000-000000000001',quantity:1}]}));});
    await g.reload();await expect(g.locator('.alert.error')).toContainText('No pudimos leer la recuperación');await expect(g.getByRole('button',{name:'Revisar mi pedido'})).toBeDisabled();await expect(g.locator('.guest-product').first()).toBeDisabled();
  } finally {for(const c of [wc,gc])await c.close();}
});

test('fully cancelled customer batch stays out of delivered and preserves cancellation detail',async({browser})=>{
  const wc=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true}),gc=await browser.newContext(),ac=await browser.newContext();
  const w=await wc.newPage(),g=await gc.newPage(),admin=await ac.newPage();
  try{
    // Mesa09 has been freed/reopened earlier in the full suite; historical batches remain visible.
    await staff(w,'mozo');const pendingBefore=await w.getByRole('navigation').getByRole('button',{name:/Pedidos del cliente/}).locator('.nav-count').innerText();await enter(g,await key(w,'Mesa 09'));await send(g,'Ceviche clásico');await expect(g.getByRole('status')).toContainText('Pedido recibido');
    await staff(admin,'admin');const s=await (await admin.request.get('/v1/pos/snapshot')).json(),visit=s.visits.find((v:any)=>v.id===s.tables.find((t:any)=>t.label==='Mesa 09').visit_id),order=s.orders.find((o:any)=>o.visit_id===visit.id&&o.source==='guest'),session=await (await admin.request.get('/v1/pos/session')).json();
    const r=await admin.request.post('/v1/pos/commands',{headers:{'x-csrf-token':session.csrf_token},data:{type:'order.line.void',operation_id:randomUUID(),line_id:order.lines[0].id,expected_version:visit.version,quantity:1,reason:'Cliente cancela antes de preparar',restore_stock:false}});expect(r.status()).toBe(200);
    await w.getByRole('navigation').getByRole('button',{name:/Pedidos del cliente/}).click();await w.getByLabel('Filtrar por mesa').selectOption({label:'Mesa 09'});
    await w.getByRole('button',{name:'Anulados',exact:true}).click();const card=w.locator('.client-order-card');await expect(card).toHaveCount(1);await expect(card).toContainText('Pedido anulado · sin unidades por entregar');await expect(card).toContainText('Anulado: 1 u.');await expect(card).toContainText('Sin unidades activas');await expect(card).not.toContainText('Todas las unidades entregadas');
    await expect(w.getByRole('navigation').getByRole('button',{name:/Pedidos del cliente/}).locator('.nav-count')).toHaveText(pendingBefore);
    await mkdir('docs/evidence/screens',{recursive:true});await w.screenshot({path:'docs/evidence/screens/tanda-anulada-016.png',fullPage:true});
    await w.getByRole('button',{name:'Entregados',exact:true}).click();await expect(w.locator('.client-order-card').filter({hasText:'Pedido anulado · sin unidades por entregar'})).toHaveCount(0);await w.getByRole('button',{name:'Por entregar',exact:true}).click();await expect(w.locator('.client-order-card')).toHaveCount(0);
  }finally{for(const c of [wc,gc,ac])await c.close();}
});
