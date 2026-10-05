"""Finalize only 014 artifacts; assert evidence before marking ready for review."""
from pathlib import Path
import json,hashlib,re
from datetime import datetime,timezone
from jsonschema import Draft202012Validator,FormatChecker
from openapi_spec_validator import validate
root=Path(__file__).resolve().parents[4];run=Path(__file__).resolve().parent;feature=root/'specs/014-operacion-salon-noche'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
now=datetime.now(timezone.utc).isoformat()
for f,pattern in [('tests-final.txt',r'290 passed'),('e2e-final.txt',r'17 passed'),('typecheck-final.txt',r'tsc --noEmit'),('build-final.txt',r'Compiled successfully')]:
 text=(run/f).read_text(encoding='utf-8-sig');assert re.search(pattern,text),f;assert not re.search(r'(?m)^\s*(FAIL |Error:|[1-9][0-9]* failed)',text),f
before,after=[read(run/f'runtime-{s}.json') for s in ['before','after']];assert before['state_sha256']==after['state_sha256'];assert before['branches']==after['branches']==2
health=read(run/'runtime-health.json');assert health['api']=={'status':'ok','environment':'laboratory'} and health['customer_status']==200
planning=read(root/'docs/evidence/planning-validation.json');assert planning['status']=='passed' and len(planning['checks'])==25
validate(read(root/'docs/contracts/pilot.openapi.json'))
report='''# Actualización · operación de salón y noche

03/10/2026, America/Lima. Incremento **014-operacion-salon-noche** sobre013, con73 hashes verificados antes de asignar escritura. Desarrollo exclusivo en El Encanto Huamanguino. Estado **ready_for_review**; aceptación sensible independiente pendiente.

## Mejoras construidas

**Cocina y Heladería tienen una cola compartida y ordenada.** Cada tanda recibe secuencia durable del servidor, mesa, observaciones y responsable. Se muestra primero urgencia excepcional con motivo y después llegada; ambas categorías conservan su orden. Una prioridad genera aviso separado, claramente identificado, sin repetir pedido ni alterar ticket original, saldo o reserva. Originales, avisos, anulaciones y copias tienen semántica distinta.

**Las tablets coordinan el retiro.** El mozo queda responsable de mesa; otro puede ayudar y Administración puede reasignar con motivo. Una unidad lista puede reservarse para retiro: otra persona no registra su entrega mientras esté reclamada. La liberación es explícita por propietario o Administración con motivo. La pantalla de salón pide reservar antes de entregar Cocina/Heladería. El servidor conserva entrega directa legacy para estación/admin; no hay evidencia automática de movimiento físico.

**La operación con ticketera de papel sigue siendo viable.** No se exige pantalla en Cocina/Heladería: mozo/caja/admin puede registrar confirmación explícita de unidades listas con motivo y responsable. Preparado, impreso, reclamado, entregado y pagado son estados separados. Minutos y orden son visibles, pero el sistema no prueba que un cocinero leyó el papel. La ticketera de Caja sirve cuentas/documentos del flujo existente; bebidas siguen directas sin comanda de preparación.

**Noche solo vende cerveza, gaseosa y agua.** La política deriva de la última caja vigente del día operativo y se aplica a terminales, tablets y cliente QR, en cotización y aceptación. No basta ocultar botones: la API rechaza platos y cotizaciones diurnas antiguas. Un relevo nocturno mantiene modo nocturno. Pedidos de comida ya aceptados pueden terminarse y cobrarse; medianoche no cambia jornada ni reinicia menú.

**El cierre completo tiene condiciones verificables.** Exige caja nocturna propia, todas las entregas y saldos resueltos, cero pagos inciertos/autorizaciones/reservas/conteos/cortes pendientes y unidades físicas coincidentes con libro. Diferencia de stock se concilia primero mediante conteos013. Efectivo distinto requiere firma de Administración diferente del dueño, exacta para conteo y versiones; cambios posteriores invalidan la firma. Las diferencias quedan visibles. El corte provisional conserva pendientes, sin presentarse como conciliado.

**Un corte fallido no queda atrapado.** Recibir existencias inferiores a reservas sigue bloqueado. Administrador distinto de ambos custodios puede cancelar un traspaso no recibido con motivo: conserva conteo/diferencias/firmas, reabre la MISMA caja del saliente y no mueve dinero ni stock. Permite conciliar y empezar otro corte; un traspaso aceptado no se cancela. Carreras de aceptación/cancelación tienen único ganador.

**El cierre operativo y SUNAT permanecen separados.** Se muestra caja y bebidas conciliadas operativamente, fiscal pendiente; no se acepta un pago unknown, abono bancario o documento SUNAT por cerrar. El reporte de sesiones utiliza únicamente los turnos incluidos en ese cierre, evitando mezclar días anteriores. Un cierre operativo firmado no se modifica ni se degrada a provisional.

## Evidencia

| Comprobación | Resultado |
|---|---|
| Dominio, HTTP/PostgreSQL, contratos y presentación |290 aprobadas en16 archivos;53 nuevas contra237 de013 |
| Nuevas pruebas014 |40 dominio,8 PostgreSQL,5 presentación |
| Navegador completo |17 recorridos aprobados:13 existentes y4 nuevos |
| Tipos y compilación de producción |Aprobados |
| OpenAPI y WorkOrder estrictos |Aprobados |
| Validador documental padre |25 controles aprobados; alcance documental, no certificación runtime |
| Estado interactivo |2 locales; hash idéntico antes/después, sin reseed/migración |
| Servicio actualizado |API014 health laboratory; /cliente200; frontend3000, API4000 |
| Revisión independiente de dinero/stock/aislamiento |Pendiente; MAR:T064/T065/T067 sin aceptación |

Logs, contratos y hashes: [entrega014](../construction/runs/2026-10-03-operacion-salon-noche/delivery.json). Operación detallada: [procesos del restaurante](../../specs/014-operacion-salon-noche/procesos-restaurante.md), [spec](../../specs/014-operacion-salon-noche/spec.md), [análisis](../../specs/014-operacion-salon-noche/analysis.md).

Fallos preservados y límites de evidencia: el primer intento de27 regresiones incluía19 defectos del fixture por evaluar estado antes de abrir mesa; no afirmar27 fallos funcionales del código anterior. Se corrigió el fixture. Pruebas PG corrigieron una ruta de lectura de clave inventada por el test. Navegador corrigió selectores y esperó actualización real de la pantalla antes de contar; el bloqueo de conteo obsoleto se mantuvo. Un primer recorrido completo falló esperando login del segundo contexto; se añadió comprobación explícita de cookie ausente/sesión401, sin omitir login ni ampliar permisos. No volvió a reproducirse en recorridos posteriores; causa original no aislada. Una ejecución posterior se interrumpió para corregir el nombre de versión del test nuevo antes de verificar el código final. Los logs fallidos/interrumpidos no se borraron. Traces con sesiones permanecen fuera de evidencia entregada.

## Uso y pendientes

En [POS local](http://127.0.0.1:3000), entrar con usuarios sintéticos. Mozo: Mesas → abrir/habilitar clave → tomar pedido → Estaciones → confirmar listo o estación prepara → reservar retiro → entregar. Caja: Mi turno → corte/conteo → noche recibe → solo bebidas → resolver pendientes/conciliar inventario → Cierre del día → conteo físico → firma independiente si diferencia → revisar y confirmar cierre completo.

Aplicación funcional de laboratorio, todavía no habilitada para operación real. Revisiones financieras011/012/013/014 pendientes. Impresoras de red/modelos, tablet/Wi‑Fi/LAN/HTTPS, identidades individuales, respaldo/restauración y conectividad deben validarse en el local. SUNAT/CDR, proveedores financieros, Qatu/Delivery reales, hub/offline, recetas/compras/merma, devoluciones monetarias y ajustes posteriores a cierre siguen pendientes. La clasificación de bebidas usa SKU legacy explícitos o atributo de stock; no hay aún formulario de clasificación nuevo. MoneyMinor safeinteger vs integer32 SQL continúa como siguiente corrección prioritaria.
'''
(root/'docs/evidence/ACTUALIZACION-2026-10-03-operacion-salon-noche.md').write_text(report,encoding='utf-8')
continuity='''# Estado y continuidad · El Encanto Huamanguino

Actualizado03/10/2026, America/Lima. Último incremento **014-operacion-salon-noche** sobre013;73 hashes base verificados. [Actualización014](ACTUALIZACION-2026-10-03-operacion-salon-noche.md), [procesos](../../specs/014-operacion-salon-noche/procesos-restaurante.md), [entrega014](../construction/runs/2026-10-03-operacion-salon-noche/delivery.json). Históricos: [013](ACTUALIZACION-2026-10-03-conteos-dia.md), [012](ACTUALIZACION-2026-10-03-catalogo-custodia.md), [011](ACTUALIZACION-2026-10-02-auditoria.md).

## Estado real

Base: mesas/tandas y clave activada por mozo/revocada al pago, privacidad QR por navegador, cotizaciones/carta, estaciones y bebidas directas, dinero exacto, cobros simulados, turnos/traspaso, documentos fiscales simulados, descuentos/anulaciones y conteos013 retenidos/versionados.

014 añade secuencia FIFO, urgencia auditada/aviso, responsable de mesa, reserva de retiro, confirmación explícita de estación papel, política nocturna bebidas en servidor/QR/tablets, cierre operativo final separado de fiscal, aprobación administrativa independiente sellada, y cancelación de traspaso no recibido sin borrar conteo ni cambiar custodia/dinero/stock. Pantalla de salón solicita retiro antes de entregar; core mantiene entrega directa legacy para estación/admin. No inferir prueba física.

**290 pruebas16 archivos y17 recorridos completos, tipos/build y25 controles documentales aprobados.**53 casos nuevos (40 dominio,8 PG,5 presentación),4 nuevos E2E. Estado ready_for_review; root autor único. MAR:T064/T065 implementadas/probadas con aceptación independiente pendiente; MAR:T067 pendiente. Revisiones011/012/013 también pendientes; no gatesG2/G3/G4. Ver reporte para defectos de fixture/selectores/fallo intermitente de login y logs preservados; no inflar evidencia de regresión.

## Procesos y datos

Raíz exclusiva F:/PROYECTOS/QatuPOS/el-encanto-huamanguino. Git inicial sin commits y archivos untracked; no reset/limpieza/commits. Ningún otro escritor autorizado. WorkOrder014 versión3; registrar nueva asignación y verificar hashes antes de escribir. Root termina ejecución al entregar.

Desarrollo reiniciado con dominio014: frontend127.0.0.1:3000, API4000, sesión62607; PostgreSQL55432. Health ok laboratory y /cliente200. API no tiene recarga automática; Next sí. Inspeccionar comando/árbol antes de reiniciar y no asumir PIDs ni sesión entre turnos.

qatupos_lab conservada sin migrar/reseed:2 locales, SHA256 branch_state idéntico ba929698f99805c4c91faab5a3470b20ee511ea6a86bdf8c915685cb1510b502. Pruebas solo qatupos_lab_test_*. No borrar datos interactivos ni exponer cookies, claves QR o guest-code.key. Nuevos campos opcionales permiten lectura legacy; no inferir aceptación ni inventar versiones de conteos históricos.

Comandos desde piloto: pnpm db:start si hace falta; pnpm dev. Validar pnpm typecheck, pnpm test, pnpm test:e2e, luego pnpm build y pnpm validate:sdd. Una sola ejecuciónE2E3100/4100; dist .next/.next-e2e/.next-production separados; E2E/build secuenciales por tipos generados. Validador padre sigue documental. No ejecutar nuevamente scripts update-contracts.py, integrate-ui.py, paper-confirmation-contract.py del run014: fueron transformaciones puntuales no idempotentes, duplicarían contratos/código. fingerprint.ts es solo lectura. finalize.py recompone reportes/hashes si toda evidencia está aprobada; no modifica datos comerciales.

## Retomar

1. Leer AGENTS padre/local, SDD, constitución, layout/protocolo y feature014 (spec,plan,data-model,research,tasks,analysis,procesos,contratos). Verificar delivery014 hashes y fin del escritor antes de nueva asignación. Puntero global sigue013; SPECIFY_FEATURE_DIRECTORY por proceso014 sin persistir.
2. Revisor independiente debe evaluar dinero/inventario/aislamiento011..014 y aprobar con evidencia integrada; no autoaceptar. Cancelar corte/aprobar diferencias requieren admin distinto; un único admin custodio no basta. Crear gestión de identidades y credenciales individuales antes del piloto real.
3. Prioridad siguiente: MoneyMinor safeinteger frente integer32 SQL en cotizaciones/fiscal/auditoría; contrato y tests límites/acumulación antes de datos reales.
4. Homologar modelos/red de Cocina, Caja y Heladería; avisos/copias/anulaciones sin preparación duplicada. Caja no necesita comanda de bebida. Validar dos pantallas y dos tablets, HTTPS/LAN/Wi‑Fi, desconexiones, copias/restauración; nada de offline/hub construido.
5. Compras/merma/devoluciones físicas, reembolsos y ajustes posteriores a cierre siguen pendientes. No resolver faltante pagado con stock ficticio ni anulación fiscal como devolución monetaria. Nuevas clases de bebida requieren formulario/contrato; legacy eligible solo SKU explícitos.
6. Conectar Qatu.pe/Delivery/SUNAT/pagos únicamente con autorización específica y contratos; aquí simuladores. Preparación por cursos, alertas/SLA y entrega de tandas completas son ampliaciones futuras, no capacidades demostradas.
'''
(root/'docs/evidence/CONTINUIDAD.md').write_text(continuity,encoding='utf-8')
p=root/'README.md';t=p.read_text(encoding='utf-8');heading='## Operación de salón y cierre nocturno ·014';
if heading in t:t=t[:t.index(heading)].rstrip()+'\n'
t+='''
## Operación de salón y cierre nocturno ·014

Cocina/Heladería ordenan por llegada y urgencia justificada; tickets incluyen secuencia/mesa/tanda/responsable. El mozo confirma estación lista cuando solo hay papel, reserva retiro y registra entrega. Las bebidas de Caja siguen directas sin comanda de preparación. Turno nocturno restringe terminales/tablets/QR a cerveza/gaseosa/agua en servidor.

Cierre operativo completo exige entrega y cobro resueltos, stock físico conciliado y firma independiente para diferencia de efectivo; fiscalidad conserva estado separado. Corte provisional mantiene pendientes. Un corte no recibido puede cancelarse por admin distinto de custodios sin borrar declaración ni mover dinero/stock.

**290 pruebas y17 recorridos navegador, tipos/build aprobados. Laboratorio, revisión sensible pendiente.** [Procesos del restaurante](specs/014-operacion-salon-noche/procesos-restaurante.md), [actualización014](docs/evidence/ACTUALIZACION-2026-10-03-operacion-salon-noche.md) y [continuidad](docs/evidence/CONTINUIDAD.md). Hardware/SUNAT/Qatu/Delivery reales, MoneyMinor/SQL y gestión individual de personal siguen pendientes antes de operación real.
''';p.write_text(t,encoding='utf-8')
p=feature/'tasks.md';t=p.read_text(encoding='utf-8')
for task in ['061','062','063','066']:t=t.replace(f'- [ ] MAR:T{task}',f'- [x] MAR:T{task}')
t=t.replace('OPS-FR/AT-001..010','OPS-FR/AT-001..011');t=t.split('\nT064/T065:')[0].rstrip()+'\n';t+='\nT064/T065: código y pruebas finalizadas, aceptación de aislamiento/inventario/dinero pendiente. T062 evidencia contra baseline limitada por fixture inicial defectuoso; ver analysis/logs. T066 evidencia290/17/tipos/build/25/contratos/runtime-preservado en delivery014. T067 únicamente revisor independiente.\n';p.write_text(t,encoding='utf-8')
order=read(run/'work-order.json');order['state']='ready_for_review';write(run/'work-order.json',order)
schema=read(root.parent/'specs/003-construccion-coordinada/contracts/work-order.schema.json');Draft202012Validator(schema,format_checker=FormatChecker()).validate(order)
current=read(root/'docs/construction/current-run.json');current['state']='ready_for_review';current['writer_finished']=True;current['checked_at_utc']=now;write(root/'docs/construction/current-run.json',current)
checks={'checked_at_utc':now,'unit_integration':{'command':'pnpm test','exit_code':0,'passed':290,'files':16,'new_cases':53,'evidence':'tests-final.txt'},'e2e':{'command':'pnpm test:e2e','exit_code':0,'passed':17,'new_cases':4,'evidence':'e2e-final.txt'},'typecheck':{'command':'pnpm typecheck','exit_code':0,'evidence':'typecheck-final.txt'},'build':{'command':'pnpm build','exit_code':0,'evidence':'build-final.txt'},'planning':{'command':'pnpm validate:sdd','exit_code':0,'passed':25,'scope':'parent planning only'},'work_order_schema':'passed','openapi':'passed','interactive_branch_state_preserved':True,'interactive_state_sha256':after['state_sha256'],'runtime_health':health,'independent_financial_inventory_isolation_review':'pending','regression_initial_fixture_failures':19,'intermittent_original_login_failure':'not reproduced; original cause not isolated; isolation preconditions added'}
# Check local links on authored documentation; no network fetch and no anchor claim.
link_count=0
for p in [root/'README.md',root/'docs/evidence/CONTINUIDAD.md',root/'docs/evidence/ACTUALIZACION-2026-10-03-operacion-salon-noche.md',*feature.rglob('*.md')]:
 for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
  if '://' in target or target.startswith('#'):continue
  target=target.split('#')[0].strip('<>');dest=(p.parent/target).resolve();assert dest.exists() or dest==run/'delivery.json',str(dest);link_count+=1
checks['local_document_links']={'passed':True,'checked':link_count,'anchors':'not_checked'};write(run/'verification.json',checks)
write(run/'transitions.json',{'execution_id':order['execution_id'],'owner':'root','transitions':[{'from':'assigned','to':'running','evidence':'WorkOrder before edits; baseline01373 hashes checked'},{'from':'running','to':'running','version':2,'evidence':'grant guest UI before editing'},{'from':'running','to':'running','version':3,'evidence':'grant original E2E isolation assertions before editing; cancellation contract before implementation'},{'from':'running','to':'ready_for_review','checked_at_utc':now,'evidence':'verification.json'}],'independent_acceptance':'pending'})
files=[]
for grant in order['write_paths']:
 p=root/grant
 if p.is_dir():files.extend(x for x in p.rglob('*') if x.is_file())
 elif p.is_file():files.append(p)
files=sorted(set(files));hashes={str(p.relative_to(root)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p!=run/'delivery.json'}
baseline_hashes=read(root/'docs/construction/runs/2026-10-03-conteos-dia/delivery.json')['source_sha256']
changed_files=[f for f,digest in hashes.items() if baseline_hashes.get(f)!=digest]
delivery={'execution_id':order['execution_id'],'assignment_id':order['assignment_id'],'state':'ready_for_review','checked_at_utc':now,'scope':'014 salon queue, dispatch, night beverage policy and operational closure; synthetic laboratory only','tests':checks,'pending_acceptance_tasks':['MAR:T064','MAR:T065','MAR:T067'],'prior_sensitive_reviews':'011/012/013 pending','baseline':order['baseline'],'modified_files':changed_files,'verified_files':list(hashes),'source_sha256':hashes,'limitations':['MoneyMinor vs SQL integer32','Independent review pending','Network printers/tablets/LAN not validated','Real SUNAT/payments/Qatu/Delivery absent','Offline/hub/stock receipts/merma/refunds/post-close adjustment ledger absent','Original intermittent E2E login cause not isolated'],'next_dependency':'Independent review and MoneyMinor persistence contract/tests'};write(run/'delivery.json',delivery)
for f,digest in hashes.items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==digest,f
print(json.dumps({'state':'ready_for_review','hashes_verified':len(hashes),'tests':290,'e2e':17,'independent_acceptance':'pending'}))
