"""Produce this run's reports and validate artifacts; never mutate commercial data."""
from pathlib import Path
import hashlib
import json
import re
from datetime import datetime, timezone
from jsonschema import Draft202012Validator, FormatChecker
from openapi_spec_validator import validate

root = Path(__file__).resolve().parents[4]
run = Path(__file__).resolve().parent
feature = root / 'specs/013-conteos-y-dia-operativo'
now = datetime.now(timezone.utc).isoformat()

def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

before, after = [read_json(run / f'runtime-{p}.json') for p in ['before', 'after']]
assert before['state_sha256'] == after['state_sha256']
assert before['branches'] == after['branches'] == 2
health = read_json(run / 'runtime-health.json')
assert health['api'] == {'status': 'ok', 'environment': 'laboratory'}
assert health['customer_status'] == 200
planning = read_json(root / 'docs/evidence/planning-validation.json')
assert planning['status'] == 'passed' and len(planning['checks']) == 25
for file, expected in [
    ('tests-final.txt', r'237 passed'),
    ('e2e-final.txt', r'13 passed'),
    ('typecheck-final.txt', r'tsc --noEmit'),
    ('build-final.txt', r'Compiled successfully'),
]:
    assert re.search(expected, (run / file).read_text(encoding='utf-8-sig')), file

report = '''# Actualización · conteos y día operativo

03/10/2026, America/Lima. Incremento **013-conteos-y-dia-operativo**, construido sobre012: sus65 hashes concordaron antes de asignar archivos. Desarrollo exclusivo dentro de El Encanto Huamanguino; sin cambios en Qatu.pe, Delivery o planificación padre. Estado **ready_for_review**, sin aceptación financiera independiente.

## Mejoras aplicadas

**Los cierres anteriores conservan su integridad.** Una cuenta con consumos de otro día no admite descuentos, retiro de descuentos ni anulaciones ordinarias. El servidor devuelve BUSINESS_DAY_LOCKED y la interfaz explica el bloqueo. Su cobranza pendiente sigue permitida y se informa como cobro de día anterior, sin cambiar el cierre original. El libro de ajustes posteriores al cierre todavía no está construido.

**Caja declara faltantes reales aunque existan reservas.** La declaración registra día, responsable, cantidades y versiones; conserva existencias del libro hasta revisión. Los SKU declarados quedan retenidos para nuevas reservas, entregas y reintegros físicos. Los productos ajenos al conteo siguen operando. Una cotización no reserva ni permite entregar un producto retenido.

**Administración revisa con otro responsable.** No puede aprobar su propio conteo, cantidades inferiores a reservas u observaciones de otro día/versión. Se validan todas las líneas antes de aplicar el ajuste transaccional. Un rechazo conserva declaración, stock y reservas, sin una operación aprobada ni evento de salida.

**Recontar conserva la observación original.** La declaración nueva sustituye la anterior con vínculo explícito y debe cubrir todos sus SKU. La anterior no puede aprobarse después. Liberar una reserva pendiente permite conciliar pedidos, pero cambia la versión: exige recontar antes de aprobar. No se borran reservas para aparentar disponibilidad ni se inventan devoluciones físicas.

**Inventario acompaña el trabajo de Caja.** Caja declara solo sus bebidas y necesita su propia sesión abierta. Administración puede contar Heladería durante un traspaso de bebidas. Un conteo pendiente de Caja impide iniciar el traspaso. El cierre diario registra los conteos pendientes y conserva su condición provisional.

**La interfaz detecta cambios mientras se cuenta.** Captura versiones al comenzar a ingresar cantidades. Si otro mozo cambia una reserva, bloquea el envío y exige descartar valores y volver a contar. Muestra registrado, reservado, disponible/retención, diferencia física y causas que impiden aprobar.

## Evidencia y resultados

| Comprobación | Resultado |
|---|---|
| Dominio, contratos, interfaz y HTTP/PostgreSQL |237 pruebas aprobadas en13 archivos |
| Nuevos casos |33:20 dominio,6 PostgreSQL y7 selector de revisión |
| Navegador completo |13 recorridos aprobados, incluyendo Caja→Administración, faltante, reconteo y reserva concurrente |
| Tipos y compilación de producción |Aprobados |
| OpenAPI y WorkOrder |Validación estricta aprobada |
| Documentación padre |25 controles aprobados; alcance documental |
| Datos interactivos |2 locales; fingerprint branch_state antes/después idéntico |

Antes del correctivo fallaron18 regresiones unitarias. PostgreSQL estaba detenido: los primeros5 casos de integración no se ejecutaron por conexión rechazada; después de iniciar la instancia existente, esos5 casos fallaron contra el código anterior. Se conservan ambos resultados, sin confundir infraestructura con evidencia de negocio.

El primer recorrido nuevo encontró una reserva que cambió antes de declarar: el servidor rechazó la versión antigua. Se incorporó captura de versiones y reinicio explícito de la observación. La primera suite completa tuvo12 recorridos aprobados y un fallo del nuevo test: selector de estado ambiguo en una mesa con acceso QR ya activo. Se corrigió el selector y se reconoció el historial acumulado de esa mesa. Se conservaron fallos y aserciones; la suite completa final aprobó13 recorridos.

PostgreSQL real en bases efímeras qatupos_lab_test_*, con rollback, carrera declaración/reserva y aislamiento entre tenants distintos que comparten IDs sintéticos de inventario. Sin migración, reseed ni limpieza de qatupos_lab. El reinicio de PostgreSQL recuperó el estado existente; no constituye prueba de restore desde backup. Lockfile y dependencias no cambiaron.

## Archivos y contrato

[Feature013](../../specs/013-conteos-y-dia-operativo/spec.md), [plan](../../specs/013-conteos-y-dia-operativo/plan.md), [modelo](../../specs/013-conteos-y-dia-operativo/data-model.md), [cambios de contrato](../../specs/013-conteos-y-dia-operativo/contracts/changes.md) y [trazabilidad](../../specs/013-conteos-y-dia-operativo/analysis.md).

Dominio y contratos actualizados; panel de inventario extraído con selector de revisión; controles de consumo anterior incorporados al POS. Nuevas pruebas counts-day, inventory-review y recorrido navegador de inventario. OpenAPI conserva el endpoint existente, agrega estados/campos de lectura y errores específicos, sin otro backend ni migración.

[WorkOrder](../construction/runs/2026-10-03-conteos-dia/work-order.json), [verificación](../construction/runs/2026-10-03-conteos-dia/verification.json), [entrega con archivos/hashes](../construction/runs/2026-10-03-conteos-dia/delivery.json) y [captura de revisión](screens/conteo-revision-013.png).

## Estado operativo y siguiente dependencia

Servidor reiniciado con013: interfaz3000, API4000, PostgreSQL55432; health laboratory y /cliente200. API sin recarga automática: inspeccionar procesos y reiniciar después de cambiar dominio. Proveedores/datos sintéticos; no SUNAT, cobros externos o impresoras reales habilitados.

MAR:T053/T054 implementadas y probadas, pendientes de aceptación financiera/inventario/aislamiento por otro revisor. MAR:T057 pendiente;011/012 conservan el mismo límite. No se marcan gates padre. El autor no acepta sus propios cambios sensibles.

Seed con un administrador: Caja→Administración funciona con responsables distintos. Un conteo declarado por Administración, por ejemplo de Heladería, requiere otro administrador configurado para aprobar. No se ampliaron permisos de Caja ni se eliminó separación de responsabilidades.

Prioridad siguiente: MoneyMinor safeinteger frente a columnas monetarias integer32 SQL, con límites y acumulaciones probados antes de datos reales. Luego libro de ajustes de días cerrados, trazabilidad de devoluciones/merma y cuentas administrativas adicionales. Validar con el restaurante cobertura completa al recontar y retención durante conteos/traspasos. Recetas, compras, hardware, restore, LAN/hub y conexiones ecommerce/Delivery necesitan sus propios contratos y pruebas.

[Continuidad para retomar](CONTINUIDAD.md).
'''
(root / 'docs/evidence/ACTUALIZACION-2026-10-03-conteos-dia.md').write_text(report, encoding='utf-8')

continuity = '''# Estado y continuidad · El Encanto Huamanguino

Actualizado03/10/2026, America/Lima. Último incremento **013-conteos-y-dia-operativo** sobre012, con65 hashes anteriores verificados antes de escribir. Fuente: [actualización013](ACTUALIZACION-2026-10-03-conteos-dia.md). Historial: [012](ACTUALIZACION-2026-10-03-catalogo-custodia.md), [011](ACTUALIZACION-2026-10-02-auditoria.md).

## Estado real y pruebas

Base local: mesas/tandas, clave activada por mozo y revocada al pago completo, pedidos privados por navegador, carta/cotizaciones, Cocina/Heladería, bebidas directas sin ticket, stock unitario, cobros simulados, turnos/traspaso, cierre diario, anulaciones/descuentos y documentos fiscales simulados. No SUNAT real, XML firmado/CDR, QR fiscal válido, impresoras de red, devoluciones monetarias por NC ni operación offline/hub.

013 bloquea descuentos/anulaciones de consumos anteriores conservando cobranza de deudas. Conteos incluyen día/versiones y retienen SKU para reservas, entregas y reintegros. Administración diferente del declarador aprueba solo cantidades compatibles con reservas. Recontar preserva el original y cubre sus SKU. Caja declara sus bebidas con caja propia abierta; Heladería puede contarse durante traspaso de bebidas. Cierre provisional incluye conteos pendientes. UI exige reiniciar observación si cambia una reserva mientras se ingresan cantidades.

**237 pruebas en13 archivos,13 recorridos navegador, tipos/build aprobados; OpenAPI/WorkOrder estrictos y25 controles documentales aprobados.**33 casos nuevos de dominio/PG/selector y un recorrido nuevo. Regresiones iniciales:18 fallos unitarios y5 PG contra código anterior;5 PG del primer intento no ejecutados porque PostgreSQL estaba detenido. Fallos navegador preservados: reserva concurrente motivó captura de versión en UI; selector ambiguo con mesa QR activa exigió ajustar el test y reconocer historial acumulado.

Estado **ready_for_review**. Root autor; MAR:T053/T054 implementadas/probadas sin aceptación independiente; MAR:T057 pendiente. Revisiones financieras011/012 pendientes. No marcar tareas integrales padre ni gatesG2/G3/G4. Lectura histórica admite campos nuevos opcionales; conteos legacy necesitan reconteo, nunca inferir día/versiones para aprobar.

## Carpeta, procesos y datos

Única raíz de escritura: F:/PROYECTOS/QatuPOS/el-encanto-huamanguino. Leer AGENTS local/padre, SDD, constitución y feature asignada. Git sin commits/untracked; preservar archivos, no limpiar/resetear. Root terminó esta ejecución; ningún otro escritor asignado. Verificar hashes antes de nueva asignación.

Desarrollo con dominio013: frontend127.0.0.1:3000, API4000, sesión de herramienta66218; PostgreSQL55432. Health ok laboratory y /cliente200. Inspeccionar árbol/comando actual antes de reiniciar; no asumir PIDs históricos. API sin recarga automática; Next sí. La sesión de herramienta puede desaparecer entre turnos.

qatupos_lab preservada: fingerprints branch_state iguales,2 locales, SHA256 ba929698f99805c4c91faab5a3470b20ee511ea6a86bdf8c915685cb1510b502;0 conteos pendientes/legacy al verificar. PostgreSQL había terminado inesperadamente antes del turno y se inició la misma instancia sin reset. No migración/reseed interactiva. Migration011 sigue validada solo en bases efímeras; un reinicio no prueba restore desde respaldo. Pruebas usan qatupos_lab_test_*; nunca limpiar qatupos_lab. No mostrar cookies/guest-code.key ni copiar secretos a reportes.

## Ejecutar

Desde raíz piloto: pnpm db:start si PostgreSQL no está activo; pnpm dev. Comprobaciones: pnpm typecheck, pnpm test, pnpm test:e2e, pnpm build, pnpm validate:sdd.

Next usa .next interactivo, .next-e2e para3100 y .next-production para build/start. Una sola ejecución E2E3100/4100, sin compartir/borrar caches de otro proceso. E2E y build secuenciales por tipos generados. No sustituir servicios reales con mocks para declararG2. El validador padre conserva alcance documental, sin modificarlo.

## Retomar exactamente

1. Leer reporte013 y specs/013-conteos-y-dia-operativo/{spec,plan,data-model,research,tasks,analysis,contracts/changes}. Consultar [entrega013](../construction/runs/2026-10-03-conteos-dia/delivery.json) y [WorkOrder](../construction/runs/2026-10-03-conteos-dia/work-order.json) para hashes/base/paths. Verificar que terminó el escritor antes de reasignar.
2. Revisar011/012/013 con otro revisor financiero e inventario/aislamiento; no aceptar por este reporte. No reutilizar WorkOrder013 para otro alcance ni debilitar doble responsable. Seed con un admin: conteo de Administración requiere otro admin para aprobar.
3. Prioridad siguiente: MoneyMinor safeinteger vs integer32 SQL (cotizaciones, auditoría y fiscal incluidos), contrato y tests de límites/acumulaciones antes de datos reales.
4. Libro de ajustes posterior a cierre pendiente;013 bloquea bypass ordinario y permite cobrar deudas. No reescribir cierres firmados ni perder venta neta en reportes.
5. Trazabilidad física de devolución/merma pendiente. Conteo bajo reservas ahora declarado/retenido; conciliar pedidos, recontar y aprobación independiente. Validar con restaurante cobertura completa de reconteo y política012 durante traspaso.
6. Recetas/escandallo/compras después de consistencia. Hardware, proveedor fiscal, restore, LAN/hub y ecommerce/Delivery reales con contratos/gates propios; no habilitados.

## Continuidad de contexto

Última consulta de cuenta03/10 en cierre011: aproximadamente81% restante de5h y semanal, saldo adicional0. Dato histórico compartido, no contador de tokens ni nueva consulta en012/013; no inferir agotamiento desde cantidad de archivos.

Guardar siguiente checkpoint con base, archivos, última prueba, procesos y siguiente dependencia antes de perder contexto. Este documento y entrega013 permiten retomar sin reconstruir historial ni tocar datos interactivos.
'''
(root / 'docs/evidence/CONTINUIDAD.md').write_text(continuity, encoding='utf-8')
readme = root / 'README.md'
text = readme.read_text(encoding='utf-8')
if 'Incremento013:' not in text:
    pos = text.index('Incremento012:')
    text = text[:pos] + 'Incremento013: Caja declara y recontabiliza existencias con historial, retención por producto y revisión administrativa independiente. Se protegen consumos de días anteriores y se detectan reservas que cambian mientras se cuenta.237 pruebas y13 recorridos aprobados. [Actualización013](docs/evidence/ACTUALIZACION-2026-10-03-conteos-dia.md), [spec013](specs/013-conteos-y-dia-operativo/spec.md) y [continuidad](docs/evidence/CONTINUIDAD.md). Revisión financiera/inventario pendiente.\n\n' + text[pos:]
    readme.write_text(text, encoding='utf-8')

tasks = feature / 'tasks.md'
text = tasks.read_text(encoding='utf-8')
for task in ['051', '052', '055', '056']:
    text = text.replace(f'- [ ] MAR:T{task}', f'- [x] MAR:T{task}')
if 'Evidencia de ejecución013' not in text:
    text += '\nEvidencia de ejecución013:237 tests/13 archivos,13 E2E, tipos/build, OpenAPI/WorkOrder y25 controles documentales aprobados. MAR:T053/T054 implementadas y probadas, casillas conservadas pendientes de aceptación independiente; MAR:T057 no ejecutada por el autor. Entrega en docs/construction/runs/2026-10-03-conteos-dia/delivery.json.\n'
tasks.write_text(text, encoding='utf-8')
analysis = feature / 'analysis.md'
text = analysis.read_text(encoding='utf-8').replace('aislamiento/CSRF de suite existente', 'aislamiento específico entre tenants con mismos SKU y aislamiento/CSRF de suite existente')
analysis.write_text(text, encoding='utf-8')

order = read_json(run / 'work-order.json')
order['state'], order['version'] = 'ready_for_review', 3
schema = read_json(root.parent / 'specs/003-construccion-coordinada/contracts/work-order.schema.json')
Draft202012Validator(schema, format_checker=FormatChecker()).validate(order)
validate(read_json(root / 'docs/contracts/pilot.openapi.json'))
write_json(run / 'work-order.json', order)
current = read_json(root / 'docs/construction/current-run.json')
current['state'] = 'ready_for_review'
current['acceptance_scope'] = '013 implementada/probada;011/012/013 no financieramente aceptadas; revisión independiente pendiente'
write_json(root / 'docs/construction/current-run.json', current)
write_json(run / 'transitions.json', [
    {'state': 'running', 'version': 1, 'evidence': 'Baseline01265 hashes verificados; único escritor root; asignación previa a edición'},
    {'state': 'running', 'version': 2, 'evidence': 'Coordinador concedió inventory-panel.tsx antes de creación; observación concurrente especificada antes de correctivo UI'},
    {'state': 'ready_for_review', 'version': 3, 'at': now, 'evidence': '237 tests,13 E2E, tipos/build/contratos/documentos; aceptación independiente pendiente'},
])
verification = {
    'checked_at_utc': now,
    'unit_integration': {'command': 'pnpm test', 'exit_code': 0, 'passed': 237, 'files': 13, 'new_cases': 33, 'evidence': 'tests-final.txt'},
    'e2e': {'command': 'pnpm test:e2e', 'exit_code': 0, 'passed': 13, 'evidence': 'e2e-final.txt'},
    'typecheck': {'command': 'pnpm typecheck', 'exit_code': 0, 'evidence': 'typecheck-final.txt'},
    'build': {'command': 'pnpm build', 'exit_code': 0, 'evidence': 'build-final.txt'},
    'planning': {'command': 'pnpm validate:sdd', 'exit_code': 0, 'passed': 25, 'scope': 'parent planning only'},
    'work_order_schema': 'passed', 'openapi': 'passed',
    'interactive_branch_state_preserved': True,
    'interactive_state_sha256': after['state_sha256'],
    'runtime_health': health,
    'independent_financial_inventory_review': 'pending',
}
write_json(run / 'verification.json', verification)
delivery = {
    'execution_id': order['execution_id'], 'assignment_id': order['assignment_id'],
    'state': 'ready_for_review', 'checked_at_utc': now,
    'scope': '013 conteos y protección de día operativo; synthetic laboratory only',
    'tests': verification,
    'pending_acceptance_tasks': ['MAR:T053', 'MAR:T054', 'MAR:T057'],
    'limitations': [
        'Revisión financiera/inventario/aislamiento independiente pendiente;011/012 también pendientes',
        'MoneyMinor safeinteger vs SQL integer32 aún pendiente',
        'Libro de ajustes postcierre no construido; ajustes ordinarios bloqueados',
        'Seed tiene un admin; conteo propio de Administración requiere segundo admin',
        'Cobertura completa al recontar y políticas de retención necesitan validación con restaurante',
        'Sin SUNAT, hardware, restore, LAN/hub, Qatu.pe ni Delivery reales',
    ],
}
write_json(run / 'delivery.json', delivery)

documents = list(feature.rglob('*.md')) + [root / 'README.md', root / 'docs/evidence/CONTINUIDAD.md', root / 'docs/evidence/ACTUALIZACION-2026-10-03-conteos-dia.md']
checked = 0
for doc in documents:
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', doc.read_text(encoding='utf-8')):
        target = target.strip('<>').split('#')[0]
        if not target or re.match(r'[a-z]+://', target):
            continue
        assert (doc.parent / target).exists(), f'{doc}: missing {target}'
        checked += 1
verification['local_document_links'] = {'passed': True, 'checked': checked, 'anchors': 'not_checked'}
write_json(run / 'verification.json', verification)
delivery['tests'] = verification

paths = set()
for granted in order['write_paths']:
    path = root / granted
    if path.is_dir():
        paths.update(p for p in path.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    elif path.is_file():
        paths.add(path)
paths.discard(run / 'delivery.json')
delivery['source_sha256'] = {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}
write_json(run / 'delivery.json', delivery)
assert all(hashlib.sha256((root / p).read_bytes()).hexdigest() == digest for p, digest in delivery['source_sha256'].items())
print(json.dumps({'state': delivery['state'], 'hashed_files': len(paths), 'local_links': checked, 'contracts': 'passed', 'branch_state_preserved': True}))
